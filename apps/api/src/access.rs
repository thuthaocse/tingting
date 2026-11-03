use crate::auth::{self, Actor};
use crate::store::Store;
use async_graphql::SimpleObject;
use std::collections::BTreeMap;
use uuid::Uuid;
#[derive(SimpleObject)]
pub struct AccessGrant {
    pub email: String,
    pub role: String,
    pub has_explicit_grant: bool,
}
pub async fn list(pool: &Store, actor: &Actor) -> Result<Vec<AccessGrant>, String> {
    auth::admin(actor)?;
    let (accounts, grants) =
        tokio::try_join!(pool.list::<auth::User>("USER"), pool.list::<Grant>("ROLE"))?;
    let mut roles = BTreeMap::new();
    for account in accounts {
        let email = account.value.email;
        if email != auth::ADMIN_EMAIL {
            roles.insert(email, ("creator".to_owned(), false));
        }
    }
    for grant in grants {
        let Grant { email, role } = grant.value;
        if let Some(role) = role {
            roles.insert(email, (role, true));
        }
    }
    Ok(roles
        .into_iter()
        .map(|(email, (role, has_explicit_grant))| AccessGrant {
            email,
            role,
            has_explicit_grant,
        })
        .collect())
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
