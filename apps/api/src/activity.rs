use crate::{auth::User, repository::StoredGroup, store::Store};
use async_graphql::SimpleObject;
use serde_json::Value;
use std::collections::{BTreeMap, HashSet};

#[derive(SimpleObject)]
#[graphql(rename_fields = "camelCase")]
pub struct ActivityEvent {
    pub id: String,
    pub action: String,
    pub summary: String,
    pub actor_name: String,
    pub created_at: String,
    pub entity_id: Option<String>,
}

pub async fn list(store: &Store, token: &str) -> Result<Vec<ActivityEvent>, String> {
    let stored = crate::repository::resolve(store, token).await?.value;
    let group_ids = group_ids(&stored);
    let mut events = Vec::new();
    for record in store.list::<Value>("AUDIT").await? {
        if !group_ids.contains(record.value["group_id"].as_str().unwrap_or_default()) {
            continue;
        }
        events.push(event(store, &stored, record.value).await?);
    }
    events.sort_by_key(|event| {
        std::cmp::Reverse(
            chrono::DateTime::parse_from_rfc3339(&event.created_at)
                .map(|created_at| created_at.timestamp_micros())
                .unwrap_or_default(),
        )
    });
    Ok(events)
}

async fn event(store: &Store, stored: &StoredGroup, value: Value) -> Result<ActivityEvent, String> {
    let action = value["action"].as_str().unwrap_or("change").to_owned();
    let user_id = value["actor_user_id"].as_str();
    let actor_name = actor_name(store, stored, user_id).await?;
    Ok(ActivityEvent {
        id: value["id"].as_str().unwrap_or_default().to_owned(),
        summary: summary(&action, &value),
        action,
        actor_name,
        created_at: value["created_at"].as_str().unwrap_or_default().to_owned(),
        entity_id: value["entity_id"].as_str().map(str::to_owned),
    })
}

fn group_ids(stored: &StoredGroup) -> HashSet<&str> {
    stored
        .id_history
        .iter()
        .map(String::as_str)
        .chain(std::iter::once(stored.group.id.as_str()))
        .collect()
}

async fn actor_name(
    store: &Store,
    stored: &StoredGroup,
    user_id: Option<&str>,
) -> Result<String, String> {
    let Some(user_id) = user_id else {
        return Ok("Người quản lý".into());
    };
    let Some(user) = store.read::<User>("USER", user_id).await? else {
        return Ok("Người dùng đã đăng nhập".into());
    };
    Ok(display_actor_name(&stored.group, &user.value))
}

fn display_actor_name(group: &crate::domain::Group, user: &User) -> String {
    if let Some(member_id) = crate::dashboard::matched_member(group, &user.email) {
        if let Some(member) = group.members.iter().find(|member| member.id == member_id) {
            return member.name.clone();
        }
    }
    let name = user.name.trim();
    if name.is_empty() || name.contains('@') {
        "Người dùng đã đăng nhập".into()
    } else {
        name.into()
    }
}

fn summary(action: &str, value: &Value) -> String {
    let before = &value["before_state"];
    let after = &value["after_state"];
    match action {
        "create_group" => format!("Tạo nhóm {}", text(after, "name")),
        "unify_group_code" => "Đổi mã chia sẻ thành ID nhóm".into(),
        "rotate_link" => "Đổi ID và mã chia sẻ nhóm".into(),
        "update_group" => group_changes(before, after),
        "save_expense" => expense_change(before, after, value["entity_id"].as_str()),
        "delete_expense" => {
            deleted_entry(before, "expenses", value["entity_id"].as_str(), "khoản chi")
        }
        "save_settlement" => settlement_change(before, after, value["entity_id"].as_str()),
        "delete_settlement" => deleted_entry(
            before,
            "settlements",
            value["entity_id"].as_str(),
            "thanh toán",
        ),
        _ => "Cập nhật nhóm".into(),
    }
}

fn group_changes(before: &Value, after: &Value) -> String {
    let mut changes = Vec::new();
    if before["name"] != after["name"] {
        changes.push(format!("Đổi tên nhóm thành {}", text(after, "name")));
    }
    if before["description"] != after["description"] {
        changes.push("Cập nhật mô tả nhóm".to_owned());
    }
    changes.extend(member_changes(before, after));
    if changes.is_empty() {
        "Cập nhật nhóm".into()
    } else {
        changes.join(" · ")
    }
}

fn member_changes(before: &Value, after: &Value) -> Vec<String> {
    let old = members_by_id(before);
    let new = members_by_id(after);
    let mut changes = Vec::new();
    for (id, member) in &new {
        match old.get(id) {
            None => changes.push(format!("Thêm thành viên {}", text(member, "name"))),
            Some(previous) => {
                if previous["name"] != member["name"] {
                    changes.push(format!("Đổi tên thành viên thành {}", text(member, "name")));
                }
                if previous["email"] != member["email"] {
                    changes.push(format!(
                        "Cập nhật email thành viên {}",
                        text(member, "name")
                    ));
                }
            }
        }
    }
    for (id, member) in old {
        if !new.contains_key(&id) {
            changes.push(format!("Xóa thành viên {}", text(&member, "name")));
        }
    }
    changes
}

fn members_by_id(group: &Value) -> BTreeMap<String, Value> {
    group["members"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|member| {
            member["id"]
                .as_str()
                .map(|id| (id.to_owned(), member.clone()))
        })
        .collect()
}

fn expense_change(before: &Value, after: &Value, entity_id: Option<&str>) -> String {
    let before_expense = entry(before, "expenses", entity_id);
    let after_expense = entry(after, "expenses", entity_id);
    let expense = after_expense.or(before_expense);
    let title = expense
        .map(|entry| text(entry, "title"))
        .unwrap_or_default();
    if before_expense.is_some() {
        let fields = changed_fields(
            before_expense.unwrap(),
            after_expense.unwrap(),
            &[
                ("title", "tiêu đề"),
                ("amount", "số tiền"),
                ("payerId", "người trả"),
                ("date", "ngày"),
                ("note", "ghi chú"),
                ("shares", "phần chia"),
            ],
        );
        if fields.is_empty() {
            format!("Cập nhật khoản chi {title}")
        } else {
            format!("Cập nhật khoản chi {title}: {}", fields.join(", "))
        }
    } else {
        format!("Thêm khoản chi {title}")
    }
}

fn settlement_change(before: &Value, after: &Value, entity_id: Option<&str>) -> String {
    let previous = entry(before, "settlements", entity_id);
    let current = entry(after, "settlements", entity_id);
    match (previous, current) {
        (None, Some(_)) => "Thêm thanh toán".into(),
        (Some(previous), Some(current)) => {
            let fields = changed_fields(
                previous,
                current,
                &[
                    ("fromId", "người trả"),
                    ("toId", "người nhận"),
                    ("amount", "số tiền"),
                    ("date", "ngày"),
                    ("note", "ghi chú"),
                ],
            );
            if fields.is_empty() {
                "Cập nhật thanh toán".into()
            } else {
                format!("Cập nhật thanh toán: {}", fields.join(", "))
            }
        }
        _ => "Cập nhật thanh toán".into(),
    }
}

fn changed_fields(before: &Value, after: &Value, fields: &[(&str, &str)]) -> Vec<String> {
    fields
        .iter()
        .filter(|(field, _)| before[*field] != after[*field])
        .map(|(_, label)| (*label).to_owned())
        .collect()
}

fn deleted_entry(before: &Value, field: &str, entity_id: Option<&str>, label: &str) -> String {
    let entry = entry(before, field, entity_id);
    let title = entry.map(|value| text(value, "title")).unwrap_or_default();
    if title.is_empty() {
        format!("Xóa {label}")
    } else {
        format!("Xóa {label} {title}")
    }
}

fn entry<'a>(group: &'a Value, field: &str, entity_id: Option<&str>) -> Option<&'a Value> {
    group[field]
        .as_array()?
        .iter()
        .find(|entry| entry["id"].as_str() == entity_id)
}

fn text(value: &Value, field: &str) -> String {
    value[field].as_str().unwrap_or_default().to_owned()
}

#[cfg(test)]
mod tests {
    use super::{display_actor_name, summary};
    use crate::{auth::User, domain::Group};
    use serde_json::json;

    #[test]
    fn actor_name_prefers_member_name_and_does_not_expose_email() {
        let group: Group = serde_json::from_value(json!({
            "id":"g", "name":"Group", "description":"", "token":"g", "version":1,
            "members":[{"id":"m", "name":"Tên trong nhóm", "email":"member@example.com"}],
            "expenses":[], "settlements":[]
        }))
        .unwrap();
        let mut user = User {
            id: "u".into(),
            email: "MEMBER@example.com".into(),
            name: "Tên Google".into(),
        };
        assert_eq!(display_actor_name(&group, &user), "Tên trong nhóm");
        user.email = "other@example.com".into();
        assert_eq!(display_actor_name(&group, &user), "Tên Google");
        user.name = user.email.clone();
        assert_eq!(display_actor_name(&group, &user), "Người dùng đã đăng nhập");
    }

    #[test]
    fn member_activity_reports_changed_fields_without_exposing_emails() {
        let event = json!({
            "before_state":{"members":[{"id":"m1","name":"An","email":"old@example.com"}]},
            "after_state":{"members":[{"id":"m1","name":"Anh","email":"new@example.com"}]}
        });
        let summary = summary("update_group", &event);
        assert!(summary.contains("Đổi tên thành viên thành Anh"));
        assert!(summary.contains("Cập nhật email thành viên Anh"));
        assert!(!summary.contains("old@example.com"));
        assert!(!summary.contains("new@example.com"));
    }

    #[test]
    fn expense_activity_names_fields_that_changed() {
        let event = json!({
            "entity_id":"e1",
            "before_state":{"expenses":[{"id":"e1","title":"Ăn tối","amount":100,"date":"2026-11-02","note":"","payerId":"m1","shares":[]}]},
            "after_state":{"expenses":[{"id":"e1","title":"Ăn tối","amount":150,"date":"2026-11-03","note":"","payerId":"m1","shares":[]}]}
        });
        let summary = summary("save_expense", &event);
        assert!(summary.contains("số tiền"));
        assert!(summary.contains("ngày"));
    }
}
