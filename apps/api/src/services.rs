use crate::{
    auth::{self, Actor},
    domain::*,
    repository as repo,
};
use sqlx::{PgPool, Postgres, Row, Transaction};
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
    pool: &PgPool,
    token: &str,
    version: i32,
    allow_archived: bool,
) -> Result<(Transaction<'static, Postgres>, Group), String> {
    let mut tx = pool.begin().await.map_err(repo::db)?;
    let g = repo::load(&mut tx, token, true).await?;
    if g.version != version {
        return Err(
            "CONFLICT: Dữ liệu đã thay đổi. Đã tải lại bản mới; hãy kiểm tra và lưu lại.".into(),
        );
    }
    if g.archived && !allow_archived {
        return Err("Nhóm đã được lưu trữ".into());
    }
    Ok((tx, g))
}
pub async fn finish(
    mut tx: Transaction<'_, Postgres>,
    before: &Group,
    mut after: Group,
    action: &str,
    entity: Option<&str>,
    actor: &Actor,
) -> Result<Group, String> {
    after.version += 1;
    repo::persist(&mut tx, &after).await?;
    sqlx::query("INSERT INTO activity_events(id,group_id,action,entity_id,before_state,after_state,actor_user_id) VALUES($1,$2,$3,$4,$5,$6,$7)").bind(Uuid::new_v4()).bind(repo::id(&after.id)?).bind(action).bind(entity).bind(serde_json::to_value(before).map_err(|_|"Serialization failed")?).bind(serde_json::to_value(&after).map_err(|_|"Serialization failed")?).bind(actor.viewer.as_ref().and_then(|u| Uuid::parse_str(&u.id).ok())).execute(&mut *tx).await.map_err(repo::db)?;
    tx.commit().await.map_err(repo::db)?;
    Ok(public_group(after, auth::is_admin(actor)))
}
pub async fn create(
    pool: &PgPool,
    input: CreateGroupInput,
    actor: &Actor,
) -> Result<Group, String> {
    auth::creator(actor)?;
    let g = Group {
        id: Uuid::new_v4().to_string(),
        name: text(&input.name, 120, true)?,
        description: text(&input.description, 500, false)?,
        token: auth::group_token(),
        version: 0,
        archived: false,
        members: members(input.members)?,
        expenses: vec![],
        settlements: vec![],
    };
    let mut tx = pool.begin().await.map_err(repo::db)?;
    sqlx::query("INSERT INTO groups(id,name,token,version) VALUES($1,$2,$3,0)")
        .bind(repo::id(&g.id)?)
        .bind(&g.name)
        .bind(&g.token)
        .execute(&mut *tx)
        .await
        .map_err(repo::db)?;
    finish(tx, &g, g.clone(), "create_group", None, actor).await
}
pub async fn save_expense(
    pool: &PgPool,
    token: &str,
    version: i32,
    input: ExpenseInput,
    actor: &Actor,
) -> Result<Group, String> {
    auth::signed_in(actor)?;
    repo::id(&input.id)?;
    validate_date(&input.date)?;
    let (mut tx, before) = start(pool, token, version, false).await?;
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
    pool: &PgPool,
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
    let (mut tx, before) = start(pool, token, version, false).await?;
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
    pool: &PgPool,
    token: &str,
    version: i32,
    id: &str,
    expense: bool,
    actor: &Actor,
) -> Result<Group, String> {
    auth::signed_in(actor)?;
    let (tx, before) = start(pool, token, version, false).await?;
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
    pool: &PgPool,
    token: &str,
    version: i32,
    input: UpdateGroupInput,
    actor: &Actor,
) -> Result<Group, String> {
    auth::admin(actor)?;
    let (tx, before) = start(pool, token, version, true).await?;
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
pub async fn admin_action(
    pool: &PgPool,
    token: &str,
    version: i32,
    rotate: bool,
    actor: &Actor,
) -> Result<Group, String> {
    auth::admin(actor)?;
    let (mut tx, before) = start(pool, token, version, true).await?;
    let mut g = before.clone();
    if rotate {
        sqlx::query("DELETE FROM group_link_aliases WHERE group_id=$1")
            .bind(repo::id(&g.id)?)
            .execute(&mut *tx)
            .await
            .map_err(repo::db)?;
        g.token = auth::group_token()
    } else {
        g.archived = !g.archived
    }
    finish(
        tx,
        &before,
        g,
        if rotate {
            "rotate_link"
        } else {
            "archive_group"
        },
        None,
        actor,
    )
    .await
}

pub async fn shorten_legacy_links(pool: &PgPool) -> Result<(), String> {
    let groups = sqlx::query("SELECT id FROM groups WHERE length(token)>16")
        .fetch_all(pool)
        .await
        .map_err(repo::db)?;
    for row in groups {
        let group_id: Uuid = row.get("id");
        let mut tx = pool.begin().await.map_err(repo::db)?;
        let old: String = sqlx::query_scalar("SELECT token FROM groups WHERE id=$1 FOR UPDATE")
            .bind(group_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(repo::db)?;
        if old.len() <= 16 {
            tx.commit().await.map_err(repo::db)?;
            continue;
        }
        let new = auth::group_token();
        sqlx::query("INSERT INTO group_link_aliases(token,group_id) VALUES($1,$2) ON CONFLICT(token) DO NOTHING").bind(&old).bind(group_id).execute(&mut *tx).await.map_err(repo::db)?;
        sqlx::query("UPDATE groups SET token=$2,version=version+1 WHERE id=$1")
            .bind(group_id)
            .bind(&new)
            .execute(&mut *tx)
            .await
            .map_err(repo::db)?;
        sqlx::query("INSERT INTO activity_events(id,group_id,action,before_state,after_state) VALUES($1,$2,'shorten_link',$3,$4)").bind(Uuid::new_v4()).bind(group_id).bind(serde_json::json!({"token":old})).bind(serde_json::json!({"token":new})).execute(&mut *tx).await.map_err(repo::db)?;
        tx.commit().await.map_err(repo::db)?;
    }
    Ok(())
}
