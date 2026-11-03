mod access;
mod activity;
mod auth;
mod dashboard;
mod domain;
mod google;
mod graphql;
mod migration;
mod repository;
mod services;
mod store;
mod teams;
use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};

use tower_http::{limit::RequestBodyLimitLayer, trace::TraceLayer};
#[derive(Clone)]
struct AppState {
    schema: graphql::ApiSchema,
    pool: crate::store::Store,
    origin: String,
    secure_cookie: bool,
    google: Option<google::GoogleConfig>,
}
async fn endpoint(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<async_graphql::Request>,
) -> impl IntoResponse {
    // No cross-origin API access. Browser requests must match the configured web origin.
    if let Some(origin) = headers.get("origin") {
        if origin.to_str().ok() != Some(state.origin.as_str()) {
            return (
                StatusCode::FORBIDDEN,
                HeaderMap::new(),
                Json(serde_json::json!({"errors":[{"message":"Origin not allowed"}]})),
            );
        }
    }
    let actor = auth::actor(
        &state.pool,
        headers.get("cookie").and_then(|v| v.to_str().ok()),
    )
    .await;
    let response = state.schema.execute(req.data(actor)).await;
    let mut out_headers = HeaderMap::new();
    for (k, v) in response.http_headers.iter() {
        out_headers.append(k, v.clone());
    }
    (
        StatusCode::OK,
        out_headers,
        Json(serde_json::to_value(response).unwrap_or_default()),
    )
}
async fn health(State(s): State<AppState>) -> StatusCode {
    if s.pool.stamp().await.is_ok() {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    }
}
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();
    let pool = store::Store::connect()
        .await
        .map_err(std::io::Error::other)?;
    let args: Vec<_> = std::env::args().collect();
    if args
        .get(1)
        .is_some_and(|arg| arg == "--import" || arg == "--verify-import")
    {
        migration::import(
            &pool,
            args.get(2).ok_or("Export file is required")?,
            args[1] == "--verify-import",
        )
        .await
        .map_err(std::io::Error::other)?;
        return Ok(());
    }
    load_google_secret().await?;
    let origin = std::env::var("WEB_ORIGIN")
        .unwrap_or("http://localhost:3000".into())
        .trim_end_matches('/')
        .to_owned();
    let google = google::GoogleConfig::from_env(&origin);
    let secure_cookie = std::env::var("COOKIE_SECURE").as_deref() == Ok("true");
    let schema = graphql::schema(pool.clone(), secure_cookie, google.is_some());
    if std::env::args().any(|x| x == "--schema") {
        println!("{}", schema.sdl());
        return Ok(());
    }
    migration::unify_group_codes(&pool)
        .await
        .map_err(std::io::Error::other)?;
    let state = AppState {
        schema,
        pool,
        origin,
        secure_cookie,
        google,
    };
    let app = Router::new()
        .route("/graphql", post(endpoint))
        .route("/health", get(health))
        .route("/auth/google/start", get(google::start))
        .route("/auth/google/callback", get(google::callback))
        .layer(RequestBodyLimitLayer::new(256 * 1024))
        .layer(TraceLayer::new_for_http().make_span_with(|request: &axum::http::Request<axum::body::Body>| tracing::info_span!("http", method = %request.method(), path = %request.uri().path())))
        .with_state(state);
    serve(app).await
}

#[cfg(feature = "lambda")]
async fn serve(app: Router) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    lambda_http::run(app).await?;
    Ok(())
}

#[cfg(not(feature = "lambda"))]
async fn serve(app: Router) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;
    tracing::info!("TingTing API listening on :8080");
    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await?;
    Ok(())
}

async fn load_google_secret() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let Ok(arn) = std::env::var("GOOGLE_SECRET_ARN") else {
        return Ok(());
    };
    if arn.is_empty() {
        return Ok(());
    }
    let config = aws_config::load_from_env().await;
    let secret = aws_sdk_secretsmanager::Client::new(&config)
        .get_secret_value()
        .secret_id(arn)
        .send()
        .await?;
    let values: serde_json::Value =
        serde_json::from_str(secret.secret_string().ok_or("Missing Google secret")?)?;
    for name in ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] {
        std::env::set_var(name, values[name].as_str().ok_or("Invalid Google secret")?);
    }
    Ok(())
}
