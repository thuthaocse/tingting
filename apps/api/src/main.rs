mod access;
mod auth;
mod dashboard;
mod domain;
mod google;
mod graphql;
mod repository;
mod services;
use axum::{
    extract::{ConnectInfo, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tower_http::{limit::RequestBodyLimitLayer, trace::TraceLayer};
#[derive(Clone)]
struct AppState {
    schema: graphql::ApiSchema,
    pool: sqlx::PgPool,
    origin: String,
    secure_cookie: bool,
    google: Option<google::GoogleConfig>,
}
async fn endpoint(
    State(state): State<AppState>,
    ConnectInfo(_peer): ConnectInfo<SocketAddr>,
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
    if sqlx::query("SELECT 1").execute(&s.pool).await.is_ok() {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    }
}
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&std::env::var("DATABASE_URL")?)
        .await?;
    sqlx::migrate!("../../migrations").run(&pool).await?;
    services::shorten_legacy_links(&pool)
        .await
        .map_err(std::io::Error::other)?;
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
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;
    tracing::info!("Lilac API listening on :8080");
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(async {
        let _ = tokio::signal::ctrl_c().await;
    })
    .await?;
    Ok(())
}
