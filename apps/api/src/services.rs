use crate::{
    auth::{self, Actor},
    domain::*,
    repository as repo,
};
use crate::{
    repository::{StoredGroup, Transaction},
    store::Store,
};
use std::collections::BTreeSet;
use uuid::Uuid;
pub fn text(s: &str, max: usize, required: bool) -> Result<String, String> {
    let s = s.trim();
    if (required && s.is_empty()) || s.chars().count() > max {
        return Err("Nội dung trống hoặc quá dài".into());
    }
    Ok(s.into())
}
pub fn members(input: Vec<MemberInput>) -> Result<Vec<Member>, String> {
    if input.is_empty() || input.len() > 100 {
        return Err("Nhóm cần từ 1 đến 100 thành viên".into());
    }
    let mut ids = BTreeSet::new();
    let mut emails = BTreeSet::new();
    let mut out = vec![];
    for m in input {
        repo::id(&m.id)?;
        if !ids.insert(m.id.clone()) {
            return Err("ID thành viên bị trùng".into());
        }
        let email = m
            .email
            .map(|s| s.trim().to_lowercase())
            .filter(|s| !s.is_empty());
        if email.as_ref().is_some_and(|s| !emails.insert(s.clone())) {
            return Err("Email thành viên bị trùng".into());
        }
        if email
            .as_ref()
            .is_some_and(|s| s.len() > 254 || !s.contains('@'))
        {
            return Err("Email không hợp lệ".into());
        }
        out.push(Member {
            id: m.id,
            name: text(&m.name, 100, true)?,
            email,
        });
    }
    Ok(out)
}
pub fn validate_date(s: &str) -> Result<(), String> {
    chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").map_err(|_| "Ngày không hợp lệ")?;
    Ok(())
}
pub fn member(g: &Group, id: &str) -> Result<(), String> {
    if !g.members.iter().any(|m| m.id == id) {
        return Err("Thành viên không thuộc nhóm".into());
    }
    Ok(())
}
pub async fn start(
    pool: &Store,
    token: &str,
    version: i32,
) -> Result<(Transaction, Group), String> {
    let record = repo::resolve(pool, token).await?;
    let g = record.value.group.clone();
    let tx = Transaction {
        store: pool.clone(),
        stored: record.value,
        revision: Some(record.revision),
    };
    if g.version != version {
        return Err(
            "CONFLICT: Dữ liệu đã thay đổi. Đã tải lại bản mới; hãy kiểm tra và lưu lại.".into(),
        );
    }
    Ok((tx, g))
}
pub async fn finish(
    mut tx: Transaction,
    before: &Group,
    mut after: Group,
    action: &str,
    entity: Option<&str>,
    actor: &Actor,
) -> Result<Group, String> {
    after = repo::ordered(after);
    after.version = after.version.checked_add(1).ok_or("Version exhausted")?;
    let event_id = Uuid::new_v4().to_string();
    let audit_group_id = tx
        .stored
        .id_history
        .first()
        .cloned()
        .unwrap_or_else(|| before.id.clone());
    let audit = serde_json::json!({"id":event_id,"group_id":audit_group_id,"action":action,"entity_id":entity,"before_state":before,"after_state":after,"actor_user_id":actor.viewer.as_ref().map(|v|&v.id),"created_at":chrono::Utc::now().to_rfc3339()});
    let mut writes = vec![tx.store.prepare("AUDIT", &event_id, &audit, None).await?];
    let moved = before.id != after.id;
    let old_links: BTreeSet<_> = if moved {
        std::iter::once(before.token.clone())
            .chain(std::iter::once(before.id.clone()))
            .chain(tx.stored.aliases.iter().cloned())
            .collect()
    } else {
        BTreeSet::new()
    };
    if moved {
        if !tx.stored.id_history.contains(&before.id) {
            tx.stored.id_history.push(before.id.clone());
        }
        let old_revision = tx.revision.as_deref().ok_or("Missing group revision")?;
        writes.push(tx.store.prepare_delete("GROUP", &before.id, old_revision)?);
    }
    if before.token != after.token || tx.revision.is_none() || moved {
        if moved {
            tx.stored.aliases.clear();
        }
        writes.push(
            tx.store
                .prepare(
                    "LINK",
                    &after.token,
                    &serde_json::json!({"group_id":after.id}),
                    None,
                )
                .await?,
        );
    }
    tx.stored.group = after.clone();
    if moved {
        writes.push(
            tx.store
                .prepare("GROUP", &after.id, &tx.stored, None)
                .await?,
        );
    } else {
        writes.push(
            tx.store
                .prepare("GROUP", &after.id, &tx.stored, tx.revision.as_deref())
                .await?,
        );
    }
    if moved {
        for token in old_links {
            if let Some(link) = tx.store.read::<serde_json::Value>("LINK", &token).await? {
                writes.push(tx.store.prepare_delete("LINK", &token, &link.revision)?);
            }
        }
    }
    tx.store.commit(writes).await?;
    Ok(public_group(after, auth::is_admin(actor)))
}
pub async fn create(pool: &Store, input: CreateGroupInput, actor: &Actor) -> Result<Group, String> {
    auth::signed_in(actor)?;
    let id = auth::group_id();
    let g = Group {
        id: id.clone(),
        name: text(&input.name, 120, true)?,
        description: text(&input.description, 500, false)?,
        token: id,
        version: 0,
        members: members(input.members)?,
        expenses: vec![],
        settlements: vec![],
    };
    let tx = Transaction {
        store: pool.clone(),
        stored: StoredGroup {
            group: g.clone(),
            aliases: vec![],
            id_history: vec![g.id.clone()],
            created_at: chrono::Utc::now().timestamp_micros(),
            next_order: 0,
        },
        revision: None,
    };
    finish(tx, &g, g.clone(), "create_group", None, actor).await
}
pub async fn save_expense(
    pool: &Store,
    token: &str,
    version: i32,
    input: ExpenseInput,
    actor: &Actor,
) -> Result<Group, String> {
    auth::signed_in(actor)?;
    repo::id(&input.id)?;
    validate_date(&input.date)?;
    let (mut tx, before) = start(pool, token, version).await?;
    let mut g = before.clone();
    member(&g, &input.payer_id)?;
    for id in &input.participant_ids {
        member(&g, id)?
    }
    let shares = split_evenly(input.amount.0, &input.participant_ids)?;
    let created_order = match g.expenses.iter().find(|expense| expense.id == input.id) {
        Some(expense) => expense.created_order.clone(),
        None => repo::next_entry_order(&mut tx).await?,
    };
    let e = Expense {
        created_order,
        id: input.id.clone(),
        title: text(&input.title, 200, true)?,
        amount: input.amount,
        payer_id: input.payer_id,
        date: input.date,
        note: text(&input.note, 1000, false)?,
        shares,
    };
    if let Some(x) = g.expenses.iter_mut().find(|e| e.id == input.id) {
        *x = e
    } else {
        g.expenses.push(e)
    }
    finish(tx, &before, g, "save_expense", Some(&input.id), actor).await
}
pub async fn save_settlement(
    pool: &Store,
    token: &str,
    version: i32,
    input: SettlementInput,
    actor: &Actor,
) -> Result<Group, String> {
    auth::signed_in(actor)?;
    repo::id(&input.id)?;
    validate_date(&input.date)?;
    if input.amount.0 <= 0 || input.amount.0 > 1_000_000_000_000 || input.from_id == input.to_id {
        return Err("Số tiền hoặc người nhận không hợp lệ".into());
    }
    let (mut tx, before) = start(pool, token, version).await?;
    let mut g = before.clone();
    member(&g, &input.from_id)?;
    member(&g, &input.to_id)?;
    let created_order = match g
        .settlements
        .iter()
        .find(|settlement| settlement.id == input.id)
    {
        Some(settlement) => settlement.created_order.clone(),
        None => repo::next_entry_order(&mut tx).await?,
    };
    let s = Settlement {
        created_order,
        id: input.id.clone(),
        from_id: input.from_id,
        to_id: input.to_id,
        amount: input.amount,
        date: input.date,
        note: text(&input.note, 1000, false)?,
    };
    if let Some(x) = g.settlements.iter_mut().find(|s| s.id == input.id) {
        *x = s
    } else {
        g.settlements.push(s)
    }
    finish(tx, &before, g, "save_settlement", Some(&input.id), actor).await
}
pub async fn delete(
    pool: &Store,
    token: &str,
    version: i32,
    id: &str,
    expense: bool,
    actor: &Actor,
) -> Result<Group, String> {
    auth::signed_in(actor)?;
    let (tx, before) = start(pool, token, version).await?;
    let mut g = before.clone();
    let found = if expense {
        let n = g.expenses.len();
        g.expenses.retain(|e| e.id != id);
        n != g.expenses.len()
    } else {
        let n = g.settlements.len();
        g.settlements.retain(|s| s.id != id);
        n != g.settlements.len()
    };
    if !found {
        return Err("Không tìm thấy bản ghi".into());
    }
    finish(
        tx,
        &before,
        g,
        if expense {
            "delete_expense"
        } else {
            "delete_settlement"
        },
        Some(id),
        actor,
    )
    .await
}
pub async fn update(
    pool: &Store,
    token: &str,
    version: i32,
    input: UpdateGroupInput,
    actor: &Actor,
) -> Result<Group, String> {
    auth::admin(actor)?;
    let (tx, before) = start(pool, token, version).await?;
    let mut g = before.clone();
    let next = members(input.members)?;
    let used: BTreeSet<_> = g
        .expenses
        .iter()
        .flat_map(|e| {
            std::iter::once(e.payer_id.clone()).chain(e.shares.iter().map(|s| s.member_id.clone()))
        })
        .chain(
            g.settlements
                .iter()
                .flat_map(|s| [s.from_id.clone(), s.to_id.clone()]),
        )
        .collect();
    if used.iter().any(|id| !next.iter().any(|m| &m.id == id)) {
        return Err(
            "Không thể xóa thành viên đã có giao dịch. Hãy giữ lại để bảo toàn lịch sử.".into(),
        );
    }
    g.name = text(&input.name, 120, true)?;
    g.description = text(&input.description, 500, false)?;
    g.members = next;
    finish(tx, &before, g, "update_group", None, actor).await
}
pub async fn rotate_link(
    pool: &Store,
    token: &str,
    version: i32,
    actor: &Actor,
) -> Result<Group, String> {
    auth::admin(actor)?;
    let (tx, before) = start(pool, token, version).await?;
    let mut g = before.clone();
    let id = auth::group_id();
    g.id = id.clone();
    g.token = id;
    finish(tx, &before, g, "rotate_link", None, actor).await
}
