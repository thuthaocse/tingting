use crate::store::Store;
use rand_core::{OsRng, RngCore};
use sha2::{Digest, Sha256};
use uuid::Uuid;

pub const ADMIN_EMAIL: &str = "thuthao.cse@gmail.com";
#[derive(Clone, async_graphql::SimpleObject)]
pub struct Viewer {
    pub id: String,
    pub email: String,
    pub name: String,
    pub is_admin: bool,
    pub can_create_groups: bool,
}
#[derive(Clone, Default)]
pub struct Actor {
    pub viewer: Option<Viewer>,
    pub session: Option<String>,
}
pub struct AuthConfig {
    pub secure_cookie: bool,
    pub google_enabled: bool,
}
pub fn digest(s: &str) -> String {
    hex::encode(Sha256::digest(s.as_bytes()))
}
pub fn token() -> String {
    format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple())
}
pub fn group_id() -> String {
    const ALPHABET: &[u8; 62] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let mut bytes = [0u8; 8];
    OsRng.fill_bytes(&mut bytes);
    bytes
        .iter()
        .map(|byte| ALPHABET[(byte % ALPHABET.len() as u8) as usize] as char)
        .collect()
}

pub fn signed_in(actor: &Actor) -> Result<Uuid, String> {
    actor
        .viewer
        .as_ref()
        .and_then(|u| Uuid::parse_str(&u.id).ok())
        .ok_or("UNAUTHORIZED: Vui lòng đăng nhập Google".into())
}
pub fn is_admin(actor: &Actor) -> bool {
    actor.viewer.as_ref().is_some_and(|u| u.is_admin)
}
pub fn admin(actor: &Actor) -> Result<Uuid, String> {
    let id = signed_in(actor)?;
    if !is_admin(actor) {
        return Err("FORBIDDEN: Chỉ quản trị viên được quản lý nhóm".into());
    }
    Ok(id)
}
pub fn cookie_value<'a>(cookies: Option<&'a str>, name: &str) -> Option<&'a str> {
    cookies?.split(';').map(str::trim).find_map(|part| {
        let (key, value) = part.split_once('=')?;
        (key == name).then_some(value)
    })
}
pub async fn actor(pool: &Store, cookies: Option<&str>) -> Actor {
    let session = cookie_value(cookies, "lilac_session").map(str::to_owned);
    let viewer = match &session {
        Some(token) => load_viewer(pool, token).await.ok().flatten(),
        None => None,
    };
    Actor { session, viewer }
}
pub fn cookie(token: &str, secure: bool, logout: bool) -> String {
    format!(
        "lilac_session={}; HttpOnly; SameSite=Lax; Path=/; Max-Age={}{}",
        token,
        if logout { 0 } else { 604800 },
        if secure { "; Secure" } else { "" }
    )
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn group_ids_are_eight_random_alphanumeric_characters() {
        let ids: std::collections::HashSet<_> = (0..1000).map(|_| group_id()).collect();
        assert_eq!(ids.len(), 1000);
        for id in ids {
            assert_eq!(id.len(), 8);
            assert!(id.bytes().all(|byte| byte.is_ascii_alphanumeric()));
        }
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub name: String,
}
#[derive(serde::Serialize, serde::Deserialize)]
pub struct Session {
    pub user_id: String,
    pub expires_at: i64,
}
pub async fn revoke(store: &Store, hash: &str) -> Result<(), String> {
    if let Some(record) = store.read::<Session>("SESSION", hash).await? {
        store
            .save(
                "SESSION",
                hash,
                &Session {
                    user_id: record.value.user_id,
                    expires_at: 0,
                },
                Some(&record.revision),
            )
            .await?;
    }
    Ok(())
}
async fn load_viewer(store: &Store, token: &str) -> Result<Option<Viewer>, String> {
    let Some(session) = store.read::<Session>("SESSION", &digest(token)).await? else {
        return Ok(None);
    };
    if session.value.expires_at <= chrono::Utc::now().timestamp() {
        return Ok(None);
    }
    let Some(user) = store.read::<User>("USER", &session.value.user_id).await? else {
        return Ok(None);
    };
    let grant = store
        .read::<crate::access::Grant>("ROLE", &user.value.email)
        .await?;
    let role = grant.as_ref().and_then(|r| r.value.role.as_deref());
    let is_admin = user.value.email == ADMIN_EMAIL || role == Some("admin");
    Ok(Some(Viewer {
        id: user.value.id,
        email: user.value.email,
        name: user.value.name,
        is_admin,
        can_create_groups: true,
    }))
}
