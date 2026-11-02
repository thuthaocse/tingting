use rand_core::{OsRng, RngCore};
use sha2::{Digest, Sha256};
use sqlx::{PgPool, Row};
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
pub fn group_token() -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut bytes = [0u8; 16];
    OsRng.fill_bytes(&mut bytes);
    bytes
        .iter()
        .map(|byte| ALPHABET[(byte & 63) as usize] as char)
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
pub async fn actor(pool: &PgPool, cookies: Option<&str>) -> Actor {
    let session = cookie_value(cookies, "lilac_session").map(str::to_owned);
    let viewer = if let Some(t) = &session {
        sqlx::query("SELECT u.id,u.email,u.name,g.role FROM user_sessions s JOIN users u ON u.id=s.user_id LEFT JOIN role_grants g ON g.email=u.email WHERE s.token_hash=$1 AND s.expires_at>now()")
            .bind(digest(t)).fetch_optional(pool).await.ok().flatten().map(|r| {
                let email: String = r.get("email");
                let role: Option<String> = r.get("role");
                let is_admin = email == ADMIN_EMAIL || role.as_deref() == Some("admin");
                Viewer { id: r.get::<Uuid,_>("id").to_string(), is_admin, can_create_groups: is_admin || role.as_deref() == Some("creator"), email, name: r.get("name") }
            })
    } else {
        None
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
pub fn creator(actor: &Actor) -> Result<Uuid, String> {
    let id = signed_in(actor)?;
    if !actor.viewer.as_ref().is_some_and(|u| u.can_create_groups) {
        return Err("FORBIDDEN: Bạn chưa có quyền tạo nhóm".into());
    }
    Ok(id)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn group_links_are_short_random_and_url_safe() {
        let links: std::collections::HashSet<_> = (0..1000).map(|_| group_token()).collect();
        assert_eq!(links.len(), 1000);
        for link in links {
            assert_eq!(link.len(), 16);
            assert!(link
                .bytes()
                .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_'));
        }
    }
}
