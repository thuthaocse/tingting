use crate::auth::{self, Actor};
use crate::store::Store;
use async_graphql::SimpleObject;
use uuid::Uuid;
#[derive(SimpleObject)]
pub struct AccessGrant {
    pub email: String,
    pub role: String,
}
pub async fn list(pool: &Store, actor: &Actor) -> Result<Vec<AccessGrant>, String> {
    auth::admin(actor)?;
    let mut grants: Vec<_> = pool
        .list::<Grant>("ROLE")
        .await?
        .into_iter()
        .filter_map(|record| {
            record.value.role.map(|role| AccessGrant {
                email: record.value.email,
                role,
            })
        })
        .collect();
    grants.sort_by(|a, b| a.email.cmp(&b.email));
    Ok(grants)
}
#[derive(serde::Serialize, serde::Deserialize)]
pub struct Grant {
    pub email: String,
    pub role: Option<String>,
}

pub async fn set(
    pool: &Store,
    actor: &Actor,
    email: String,
    role: Option<String>,
) -> Result<bool, String> {
    let user = auth::admin(actor)?;
    let email = email.trim().to_lowercase();
    if email == auth::ADMIN_EMAIL {
        return Err("Không thể thay đổi quyền tài khoản quản trị gốc".into());
    }
    if email.len() > 254
        || email.contains(char::is_whitespace)
        || email.split('@').count() != 2
        || email.starts_with('@')
        || email.ends_with('@')
    {
        return Err("Email không hợp lệ".into());
    }
    if role
        .as_ref()
        .is_some_and(|r| r != "admin" && r != "creator")
    {
        return Err("Vai trò không hợp lệ".into());
    }
    let before = pool.read::<Grant>("ROLE", &email).await?;
    let grant = Grant {
        email: email.clone(),
        role,
    };
    let event = serde_json::json!({"email":email,"before_role":before.as_ref().and_then(|g|g.value.role.as_ref()),"after_role":grant.role,"actor_user_id":user,"created_at":chrono::Utc::now().to_rfc3339()});
    pool.commit(vec![
        pool.prepare(
            "ROLE",
            &email,
            &grant,
            before.as_ref().map(|r| r.revision.as_str()),
        )
        .await?,
        pool.prepare("ROLE_AUDIT", &Uuid::new_v4().to_string(), &event, None)
            .await?,
    ])
    .await?;
    Ok(true)
}
