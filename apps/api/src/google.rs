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
    let attempt = Attempt {
        browser_hash: auth::digest(&browser),
        nonce: nonce.secret().clone(),
        verifier: verifier.secret().clone(),
        return_to: return_path(path),
        expires_at: chrono::Utc::now().timestamp() + 600,
        consumed: false,
    };
    state
        .pool
        .save("OAUTH", &auth::digest(csrf.secret()), &attempt, None)
        .await?;
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
    let attempt_record = state
        .pool
        .read::<Attempt>("OAUTH", &auth::digest(&csrf))
        .await?
        .ok_or("Invalid login")?;
    let mut attempt = attempt_record.value;
    if attempt.consumed
        || attempt.expires_at <= chrono::Utc::now().timestamp()
        || attempt.browser_hash != auth::digest(browser)
    {
        return Err("Invalid or expired login".into());
    }
    attempt.consumed = true;
    state
        .pool
        .save(
            "OAUTH",
            &auth::digest(&csrf),
            &attempt,
            Some(&attempt_record.revision),
        )
        .await?;
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
        .set_pkce_verifier(PkceCodeVerifier::new(attempt.verifier.clone()))
        .request_async(&http)
        .await
        .map_err(|_| "Google exchange failed")?;
    let nonce = Nonce::new(attempt.nonce.clone());
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
    Ok((attempt.return_to, session))
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
    let existing = state.pool.read::<auth::User>("SUBJECT", subject).await?;
    let user = auth::User {
        id: existing
            .as_ref()
            .map(|r| r.value.id.clone())
            .unwrap_or_else(|| Uuid::new_v4().to_string()),
        email: email.into(),
        name: name.into(),
    };
    let user_record = state.pool.read::<auth::User>("USER", &user.id).await?;
    let mut writes = vec![
        state
            .pool
            .prepare(
                "SUBJECT",
                subject,
                &user,
                existing.as_ref().map(|r| r.revision.as_str()),
            )
            .await?,
        state
            .pool
            .prepare(
                "USER",
                &user.id,
                &user,
                user_record.as_ref().map(|r| r.revision.as_str()),
            )
            .await?,
        state
            .pool
            .prepare(
                "SESSION",
                &auth::digest(&session),
                &auth::Session {
                    user_id: user.id.clone(),
                    expires_at: chrono::Utc::now().timestamp() + 604800,
                },
                None,
            )
            .await?,
    ];
    if let Some(previous) = auth::cookie_value(
        headers.get(header::COOKIE).and_then(|v| v.to_str().ok()),
        "lilac_session",
    ) {
        if let Some(record) = state
            .pool
            .read::<auth::Session>("SESSION", &auth::digest(previous))
            .await?
        {
            writes.push(
                state
                    .pool
                    .prepare(
                        "SESSION",
                        &auth::digest(previous),
                        &auth::Session {
                            user_id: record.value.user_id,
                            expires_at: 0,
                        },
                        Some(&record.revision),
                    )
                    .await?,
            );
        }
    }
    state.pool.commit(writes).await?;
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

#[derive(serde::Serialize, serde::Deserialize)]
struct Attempt {
    browser_hash: String,
    nonce: String,
    verifier: String,
    return_to: String,
    expires_at: i64,
    consumed: bool,
}
