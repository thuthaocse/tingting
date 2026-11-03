use crate::{
    domain::*,
    store::{Record, Store},
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
#[derive(Clone, Serialize, Deserialize)]
pub struct StoredGroup {
    pub group: Group,
    pub aliases: Vec<String>,
    #[serde(default)]
    pub id_history: Vec<String>,
    pub created_at: i64,
    #[serde(default)]
    pub next_order: i64,
}
pub struct Transaction {
    pub store: Store,
    pub stored: StoredGroup,
    pub revision: Option<String>,
}
pub fn id(s: &str) -> Result<Uuid, String> {
    Uuid::parse_str(s).map_err(|_| "ID không hợp lệ".into())
}
pub async fn resolve(store: &Store, token: &str) -> Result<Record<StoredGroup>, String> {
    let link = store
        .read::<serde_json::Value>("LINK", token)
        .await?
        .ok_or("Không tìm thấy nhóm hoặc liên kết đã hết hiệu lực")?;
    let gid = link.value["group_id"].as_str().ok_or("Invalid link")?;
    let record = store
        .read::<StoredGroup>("GROUP", gid)
        .await?
        .ok_or("Không tìm thấy nhóm")?;
    if record.value.group.token != token && !record.value.aliases.iter().any(|alias| alias == token)
    {
        return Err("Liên kết đã hết hiệu lực".into());
    }
    Ok(record)
}
pub async fn read(store: &Store, token: &str) -> Result<Group, String> {
    Ok(ordered(resolve(store, token).await?.value.group))
}
pub async fn all(store: &Store) -> Result<Vec<Group>, String> {
    for _ in 0..5 {
        let stamp = store.stamp().await?;
        let mut records = store.list::<StoredGroup>("GROUP").await?;
        if stamp != store.stamp().await? {
            continue;
        }
        records.sort_by_key(|record| std::cmp::Reverse(record.value.created_at));
        return Ok(records
            .into_iter()
            .map(|record| ordered(record.value.group))
            .collect());
    }
    Err("CONFLICT: Hãy tải lại dữ liệu".into())
}
pub async fn next_entry_order(tx: &mut Transaction) -> Result<String, String> {
    let maximum = tx
        .stored
        .group
        .expenses
        .iter()
        .map(|e| &e.created_order)
        .chain(tx.stored.group.settlements.iter().map(|s| &s.created_order))
        .filter_map(|s| s.parse::<i64>().ok())
        .max()
        .unwrap_or(0);
    tx.stored.next_order = tx
        .stored
        .next_order
        .max(maximum)
        .checked_add(1)
        .ok_or("Entry order exhausted")?;
    Ok(tx.stored.next_order.to_string())
}

pub fn ordered(mut group: Group) -> Group {
    group
        .members
        .sort_by(|a, b| a.name.cmp(&b.name).then(a.id.cmp(&b.id)));
    group.expenses.sort_by(|a, b| {
        b.date.cmp(&a.date).then(
            b.created_order
                .parse::<i64>()
                .unwrap_or(0)
                .cmp(&a.created_order.parse::<i64>().unwrap_or(0)),
        )
    });
    group.settlements.sort_by(|a, b| {
        b.date.cmp(&a.date).then(
            b.created_order
                .parse::<i64>()
                .unwrap_or(0)
                .cmp(&a.created_order.parse::<i64>().unwrap_or(0)),
        )
    });
    group
}
