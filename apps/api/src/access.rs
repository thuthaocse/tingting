use crate::{
    auth::{self, Actor},
    repository,
};
use async_graphql::SimpleObject;
use sqlx::{PgPool, Row};
use uuid::Uuid;
#[derive(SimpleObject)]
pub struct AccessGrant {
    pub email: String,
    pub role: String,
}
pub async fn list(pool: &PgPool, actor: &Actor) -> Result<Vec<AccessGrant>, String> {
    auth::admin(actor)?;
    let rows = sqlx::query("SELECT email,role FROM role_grants ORDER BY email")
        .fetch_all(pool)
        .await
        .map_err(repository::db)?;
    Ok(rows
        .into_iter()
        .map(|r| AccessGrant {
            email: r.get("email"),
            role: r.get("role"),
        })
        .collect())
}
pub async fn set(
    pool: &PgPool,
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
    let mut tx = pool.begin().await.map_err(repository::db)?;
    // Serialize changes for an email, including its first grant.
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(&email)
        .execute(&mut *tx)
        .await
        .map_err(repository::db)?;
    let before: Option<String> = sqlx::query_scalar("SELECT role FROM role_grants WHERE email=$1")
        .bind(&email)
        .fetch_optional(&mut *tx)
        .await
        .map_err(repository::db)?;
    if let Some(ref role) = role {
        sqlx::query("INSERT INTO role_grants(email,role,granted_by) VALUES($1,$2,$3) ON CONFLICT(email) DO UPDATE SET role=EXCLUDED.role,granted_by=EXCLUDED.granted_by,updated_at=now()").bind(&email).bind(role).bind(user).execute(&mut *tx).await.map_err(repository::db)?;
    } else {
        sqlx::query("DELETE FROM role_grants WHERE email=$1")
            .bind(&email)
            .execute(&mut *tx)
            .await
            .map_err(repository::db)?;
    }
    sqlx::query("INSERT INTO role_grant_events(id,email,before_role,after_role,actor_user_id) VALUES($1,$2,$3,$4,$5)").bind(Uuid::new_v4()).bind(email).bind(before).bind(role).bind(user).execute(&mut *tx).await.map_err(repository::db)?;
    tx.commit().await.map_err(repository::db)?;
    Ok(true)
}
