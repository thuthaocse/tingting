use crate::{
    auth::{Session, User},
    domain::Group,
    repository::StoredGroup,
    store::Store,
};
use serde_json::{json, Value};

pub async fn import(store: &Store, path: &str, verify: bool) -> Result<(), String> {
    let export: Value = serde_json::from_slice(&std::fs::read(path).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    if export["format"] != "tingting-postgres-v1" {
        return Err("Unsupported export format".into());
    }
    for group in rows(&export, "groups")? {
        let gid = group["id"].as_str().ok_or("Missing group ID")?;
        let converted = convert_group(&export, group)?;
        record(
            store,
            "GROUP",
            gid,
            &serde_json::to_value(&converted).map_err(|e| e.to_string())?,
            verify,
        )
        .await?;
        for token in std::iter::once(&converted.group.token).chain(converted.aliases.iter()) {
            record(store, "LINK", token, &json!({"group_id":gid}), verify).await?;
        }
    }
    for user in rows(&export, "users")? {
        let converted = User {
            id: field(user, "id")?,
            email: field(user, "email")?,
            name: field(user, "name")?,
        };
        let value = serde_json::to_value(&converted).map_err(|e| e.to_string())?;
        record(store, "USER", &converted.id, &value, verify).await?;
        record(
            store,
            "SUBJECT",
            &field(user, "google_subject")?,
            &value,
            verify,
        )
        .await?;
    }
    for session in rows(&export, "user_sessions")? {
        if timestamp(session, "expires_at")? <= chrono::Utc::now().timestamp() {
            continue;
        }
        let value = serde_json::to_value(Session {
            user_id: field(session, "user_id")?,
            expires_at: timestamp(session, "expires_at")?,
        })
        .map_err(|e| e.to_string())?;
        record(
            store,
            "SESSION",
            &field(session, "token_hash")?,
            &value,
            verify,
        )
        .await?;
    }
    for grant in rows(&export, "role_grants")? {
        record(
            store,
            "ROLE",
            &field(grant, "email")?,
            &json!({"email":grant["email"],"role":grant["role"]}),
            verify,
        )
        .await?;
    }
    for (table, kind) in [
        ("activity_events", "AUDIT"),
        ("role_grant_events", "ROLE_AUDIT"),
        ("admins", "LEGACY_ADMIN"),
    ] {
        for row in rows(&export, table)? {
            record(store, kind, &field(row, "id")?, row, verify).await?;
        }
    }
    record(
        store,
        "MIGRATION",
        &crate::auth::digest(&serde_json::to_string(&export).map_err(|e| e.to_string())?),
        &export,
        verify,
    )
    .await?;
    println!(
        "{}: {} groups; source archive preserved",
        if verify { "Verified" } else { "Imported" },
        rows(&export, "groups")?.len()
    );
    Ok(())
}
async fn record(
    store: &Store,
    kind: &str,
    key: &str,
    value: &Value,
    verify: bool,
) -> Result<(), String> {
    if let Some(existing) = store.read::<Value>(kind, key).await? {
        if existing.value != *value {
            return Err(format!("Migration mismatch: {kind}/{key}"));
        }
        return Ok(());
    }
    if verify {
        return Err(format!("Missing record: {kind}/{key}"));
    }
    store.save(kind, key, value, None).await
}
fn convert_group(export: &Value, group: &Value) -> Result<StoredGroup, String> {
    let gid = &group["id"];
    let members: Vec<_> = rows(export, "members")?
        .iter()
        .filter(|m| m["group_id"] == *gid)
        .map(|m| json!({"id":m["id"],"name":m["name"],"email":m["email"]}))
        .collect();
    let expenses: Vec<_> = rows(export,"expenses")?.iter().filter(|e|e["group_id"]==*gid).map(|e|{
        let shares: Vec<_> = rows(export,"expense_shares").unwrap_or(&[]).iter().filter(|s|s["expense_id"]==e["id"]).map(|s|json!({"memberId":s["member_id"],"amount":s["amount"]})).collect();
        json!({"id":e["id"],"createdOrder":e["created_order"].to_string(),"title":e["title"],"amount":e["amount"],"payerId":e["payer_id"],"date":e["date"],"note":e["note"],"shares":shares})
    }).collect();
    let settlements: Vec<_> = rows(export,"settlements")?.iter().filter(|s|s["group_id"]==*gid).map(|s|json!({"id":s["id"],"createdOrder":s["created_order"].to_string(),"fromId":s["from_id"],"toId":s["to_id"],"amount":s["amount"],"date":s["date"],"note":s["note"]})).collect();
    let converted: Group = serde_json::from_value(json!({"id":gid,"name":group["name"],"description":group["description"],"token":group["token"],"version":group["version"],"archived":group["archived"],"members":members,"expenses":expenses,"settlements":settlements})).map_err(|e|e.to_string())?;
    let aliases = rows(export, "group_link_aliases")?
        .iter()
        .filter(|a| a["group_id"] == *gid)
        .map(|a| field(a, "token"))
        .collect::<Result<_, _>>()?;
    Ok(StoredGroup {
        group: crate::repository::ordered(converted),
        aliases,
        next_order: 0,
        created_at: timestamp(group, "created_at")? * 1_000_000,
    })
}
fn rows<'a>(export: &'a Value, table: &str) -> Result<&'a [Value], String> {
    export[table]
        .as_array()
        .map(|a| a.as_slice())
        .ok_or_else(|| format!("Missing table: {table}"))
}
fn field(row: &Value, name: &str) -> Result<String, String> {
    row[name]
        .as_str()
        .map(str::to_owned)
        .ok_or_else(|| format!("Invalid {name}"))
}
fn timestamp(row: &Value, name: &str) -> Result<i64, String> {
    chrono::DateTime::parse_from_rfc3339(&field(row, name)?.replace(' ', "T"))
        .map(|d| d.timestamp())
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[tokio::test]
    #[ignore = "requires disposable DynamoDB Local table"]
    async fn import_is_repeatable_preserves_history_and_rotates_legacy_links() {
        let store = Store::connect().await.unwrap();
        let gid = Uuid::new_v4().to_string();
        let token = Uuid::new_v4().simple().to_string();
        let alias = Uuid::new_v4().simple().to_string();
        let audit_id = Uuid::new_v4().to_string();
        let export = json!({
            "format":"tingting-postgres-v1",
            "groups":[{"id":gid,"name":"Migration","description":"Test","token":token,"version":7,"archived":false,"created_at":"2026-01-01T00:00:00+00:00"}],
            "members":[],"expenses":[],"expense_shares":[],"settlements":[],"users":[],"user_sessions":[],"role_grants":[],"role_grant_events":[],"admins":[],
            "group_link_aliases":[{"token":alias,"group_id":gid}],
            "activity_events":[{"id":audit_id,"group_id":gid,"before_state":{"note":"x".repeat(600_000)}}]
        });
        let file = std::env::temp_dir().join(format!("tingting-import-{gid}.json"));
        std::fs::write(&file, serde_json::to_vec(&export).unwrap()).unwrap();
        for verify in [false, false, true] {
            import(&store, file.to_str().unwrap(), verify)
                .await
                .unwrap();
        }
        let group = crate::repository::read(&store, &alias).await.unwrap();
        assert_eq!(group.version, 7);
        assert_eq!(
            store
                .read::<Value>("AUDIT", &audit_id)
                .await
                .unwrap()
                .unwrap()
                .value,
            export["activity_events"][0]
        );
        let actor = crate::auth::Actor {
            viewer: Some(crate::auth::Viewer {
                id: Uuid::new_v4().to_string(),
                email: crate::auth::ADMIN_EMAIL.into(),
                name: "Root".into(),
                is_admin: true,
                can_create_groups: true,
            }),
            session: None,
        };
        let rotated = crate::services::admin_action(&store, &token, 7, true, &actor)
            .await
            .unwrap();
        assert!(crate::repository::read(&store, &alias).await.is_err());
        assert!(crate::repository::read(&store, &token).await.is_err());
        assert_eq!(
            crate::repository::read(&store, &rotated.token)
                .await
                .unwrap()
                .id,
            gid
        );
        assert!(import(&store, file.to_str().unwrap(), false).await.is_err());
        std::fs::remove_file(file).unwrap();
    }
}
