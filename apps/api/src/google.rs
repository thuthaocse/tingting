use crate::{auth, AppState};
use axum::{
    extract::{Query, State},
    http::{header, HeaderMap},
    response::{IntoResponse, Redirect, Response},
};
use openidconnect::{
    core::{CoreAuthenticationFlow, CoreClient, CoreProviderMetadata},
    reqwest, AuthorizationCode, ClientId, ClientSecret, CsrfToken, EndpointMaybeSet,
    EndpointNotSet, EndpointSet, IssuerUrl, Nonce, PkceCodeChallenge, PkceCodeVerifier,
    RedirectUrl, Scope,
};
use serde::Deserialize;
use sqlx::Row;
use uuid::Uuid;

#[derive(Clone)]
pub struct GoogleConfig {
    client_id: String,
    client_secret: String,
    redirect_uri: String,
}
impl GoogleConfig {
    pub fn from_env(origin: &str) -> Option<Self> {
        let client_id = std::env::var("GOOGLE_CLIENT_ID")
            .ok()
            .map(|s| s.trim().to_owned())
            .filter(|s| !s.is_empty())?;
        let client_secret = std::env::var("GOOGLE_CLIENT_SECRET")
            .ok()
            .map(|s| s.trim().to_owned())
            .filter(|s| !s.is_empty())?;
        Some(Self {
            client_id,
            client_secret,
            redirect_uri: format!("{origin}/auth/google/callback"),
        })
    }
}
fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|_| "Google unavailable".into())
}
// Only local group routes can survive the OAuth round trip.
pub fn return_path(path: Option<&str>) -> String {
    let path = path.unwrap_or("/");
    if path == "/"
        || path.strip_prefix("/g/").is_some_and(|token| {
            !token.is_empty()
                && token.len() <= 64
                && token
                    .bytes()
                    .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_')
        })
    {
        path.to_owned()
    } else {
        "/".into()
    }
}
fn browser_cookie(value: &str, secure: bool, clear: bool) -> String {
    format!(
        "lilac_oauth={value}; HttpOnly; SameSite=Lax; Path=/auth; Max-Age={}{}",
        if clear { 0 } else { 600 },
        if secure { "; Secure" } else { "" }
    )
}
fn response(path: &str, cookies: Vec<String>) -> Response {
    let mut response = Redirect::to(path).into_response();
    for cookie in cookies {
        response
            .headers_mut()
            .append(header::SET_COOKIE, cookie.parse().unwrap());
    }
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, "no-store".parse().unwrap());
    response
        .headers_mut()
        .insert(header::REFERRER_POLICY, "no-referrer".parse().unwrap());
    response
}
#[derive(Deserialize)]
pub struct Start {
    return_to: Option<String>,
}
pub async fn start(State(state): State<AppState>, Query(query): Query<Start>) -> Response {
    match begin(&state, query.return_to.as_deref()).await {
        Ok((url, browser)) => response(
            &url,
            vec![browser_cookie(&browser, state.secure_cookie, false)],
        ),
        Err(_) => response("/?auth_error=unavailable", vec![]),
    }
}
async fn begin(state: &AppState, path: Option<&str>) -> Result<(String, String), String> {
    let config = state.google.as_ref().ok_or("Google not configured")?;
    let http = http_client()?;
    let client = google_client(config, &http).await?;
    let (challenge, verifier) = PkceCodeChallenge::new_random_sha256();
    let (url, csrf, nonce) = client
        .authorize_url(
            CoreAuthenticationFlow::AuthorizationCode,
            CsrfToken::new_random,
            Nonce::new_random,
        )
        .add_scope(Scope::new("email".into()))
        .add_scope(Scope::new("profile".into()))
        .set_pkce_challenge(challenge)
        .add_extra_param("prompt", "select_account")
        .url();
    let browser = auth::token();
    sqlx::query("DELETE FROM oauth_login_attempts WHERE expires_at<=now()")
        .execute(&state.pool)
        .await
        .map_err(|_| "Database unavailable")?;
    sqlx::query("INSERT INTO oauth_login_attempts(state_hash,browser_hash,nonce,verifier,return_to,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes')")
        .bind(auth::digest(csrf.secret())).bind(auth::digest(&browser)).bind(nonce.secret()).bind(verifier.secret()).bind(return_path(path)).execute(&state.pool).await.map_err(|_| "Database unavailable")?;
    Ok((url.to_string(), browser))
}
#[derive(Deserialize)]
pub struct Callback {
    state: Option<String>,
    code: Option<String>,
    error: Option<String>,
}
pub async fn callback(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<Callback>,
) -> Response {
    let clear = browser_cookie("", state.secure_cookie, true);
    match complete(&state, &headers, query).await {
        Ok((path, session)) => response(
            &path,
            vec![clear, auth::cookie(&session, state.secure_cookie, false)],
        ),
        Err(_) => response("/?auth_error=failed", vec![clear]),
    }
}
async fn complete(
    state: &AppState,
    headers: &HeaderMap,
    query: Callback,
) -> Result<(String, String), String> {
    let config = state.google.as_ref().ok_or("Google not configured")?;
    let csrf = query
        .state
        .filter(|s| s.len() <= 256)
        .ok_or("Missing state")?;
    let browser = auth::cookie_value(
        headers.get(header::COOKIE).and_then(|v| v.to_str().ok()),
        "lilac_oauth",
    )
    .ok_or("Missing browser binding")?;
    let attempt = sqlx::query("DELETE FROM oauth_login_attempts WHERE state_hash=$1 AND browser_hash=$2 AND expires_at>now() RETURNING nonce,verifier,return_to")
        .bind(auth::digest(&csrf)).bind(auth::digest(browser)).fetch_optional(&state.pool).await.map_err(|_| "Database unavailable")?.ok_or("Invalid or expired login")?;
    if query.error.is_some() {
        return Err("Login cancelled".into());
    }
    let code = query
        .code
        .filter(|s| s.len() <= 4096)
        .ok_or("Missing code")?;
    let http = http_client()?;
    let client = google_client(config, &http).await?;
    let tokens = client
        .exchange_code(AuthorizationCode::new(code))
        .map_err(|_| "Token endpoint unavailable")?
        .set_pkce_verifier(PkceCodeVerifier::new(attempt.get("verifier")))
        .request_async(&http)
        .await
        .map_err(|_| "Google exchange failed")?;
    let nonce = Nonce::new(attempt.get("nonce"));
    let claims = tokens
        .extra_fields()
        .id_token()
        .ok_or("Missing ID token")?
        .claims(&client.id_token_verifier(), &nonce)
        .map_err(|_| "Invalid Google identity")?;
    if claims.email_verified() != Some(true) {
        return Err("Email not verified".into());
    }
    let email = claims
        .email()
        .ok_or("Missing email")?
        .as_str()
        .trim()
        .to_lowercase();
    let name = claims
        .name()
        .and_then(|n| n.get(None))
        .map(|n| n.as_str())
        .unwrap_or(&email);
    let session = create_session(state, headers, claims.subject().as_str(), &email, name).await?;
    Ok((attempt.get("return_to"), session))
}

type GoogleClient = CoreClient<
    EndpointSet,
    EndpointNotSet,
    EndpointNotSet,
    EndpointNotSet,
    EndpointMaybeSet,
    EndpointMaybeSet,
>;
async fn google_client(
    config: &GoogleConfig,
    http: &reqwest::Client,
) -> Result<GoogleClient, String> {
    let metadata = CoreProviderMetadata::discover_async(
        IssuerUrl::new("https://accounts.google.com".into()).unwrap(),
        http,
    )
    .await
    .map_err(|_| "Google discovery unavailable")?;
    Ok(CoreClient::from_provider_metadata(
        metadata,
        ClientId::new(config.client_id.clone()),
        Some(ClientSecret::new(config.client_secret.clone())),
    )
    .set_redirect_uri(
        RedirectUrl::new(config.redirect_uri.clone()).map_err(|_| "Invalid redirect URI")?,
    ))
}
async fn create_session(
    state: &AppState,
    headers: &HeaderMap,
    subject: &str,
    email: &str,
    name: &str,
) -> Result<String, String> {
    let session = auth::token();
    let mut tx = state
        .pool
        .begin()
        .await
        .map_err(|_| "Database unavailable")?;
    let user: Uuid = sqlx::query_scalar("INSERT INTO users(id,google_subject,email,name) VALUES($1,$2,$3,$4) ON CONFLICT(google_subject) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,updated_at=now() RETURNING id")
        .bind(Uuid::new_v4()).bind(subject).bind(email).bind(name).fetch_one(&mut *tx).await.map_err(|_| "Account unavailable")?;
    // Rotate the browser's previous session on every successful login.
    if let Some(previous) = auth::cookie_value(
        headers.get(header::COOKIE).and_then(|v| v.to_str().ok()),
        "lilac_session",
    ) {
        sqlx::query("DELETE FROM user_sessions WHERE token_hash=$1")
            .bind(auth::digest(previous))
            .execute(&mut *tx)
            .await
            .map_err(|_| "Session unavailable")?;
    }
    sqlx::query("DELETE FROM user_sessions WHERE expires_at<=now()")
        .execute(&mut *tx)
        .await
        .map_err(|_| "Session unavailable")?;
    sqlx::query("INSERT INTO user_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')").bind(auth::digest(&session)).bind(user).execute(&mut *tx).await.map_err(|_| "Session unavailable")?;
    tx.commit().await.map_err(|_| "Session unavailable")?;
    Ok(session)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn redirects_stay_local() {
        for bad in [
            "https://evil.test",
            "//evil.test",
            "/g/a?next=evil",
            "/g/a/../x",
            "/g/a\\evil",
            "/auth/google/start",
            "/g/",
        ] {
            assert_eq!(return_path(Some(bad)), "/");
        }
        assert_eq!(return_path(Some("/g/abc-123_X")), "/g/abc-123_X");
    }
}
