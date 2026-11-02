use crate::store::Store;
use crate::{
    auth::{self, Actor, AuthConfig},
    domain::*,
    repository as repo, services,
};
use async_graphql::{Context, EmptySubscription, Object, Result, Schema};
pub type ApiSchema = Schema<Query, Mutation, EmptySubscription>;
pub struct Query;
#[Object]
impl Query {
    async fn access_grants(&self, ctx: &Context<'_>) -> Result<Vec<crate::access::AccessGrant>> {
        Ok(
            crate::access::list(ctx.data_unchecked::<Store>(), ctx.data_unchecked::<Actor>())
                .await?,
        )
    }

    async fn me(&self, ctx: &Context<'_>) -> Option<auth::Viewer> {
        ctx.data_unchecked::<Actor>().viewer.clone()
    }
    async fn google_login_enabled(&self, ctx: &Context<'_>) -> bool {
        ctx.data_unchecked::<AuthConfig>().google_enabled
    }
    async fn dashboard(&self, ctx: &Context<'_>) -> Result<crate::dashboard::Dashboard> {
        Ok(
            crate::dashboard::load(ctx.data_unchecked::<Store>(), ctx.data_unchecked::<Actor>())
                .await?,
        )
    }

    async fn groups(&self, ctx: &Context<'_>) -> Result<Vec<Group>> {
        auth::signed_in(ctx.data_unchecked::<Actor>())?;
        let pool = ctx.data_unchecked::<Store>();
        let groups = repo::all(pool).await?;
        let out = groups
            .into_iter()
            .map(|group| public_group(group, auth::is_admin(ctx.data_unchecked::<Actor>())))
            .collect();
        Ok(out)
    }
    async fn group(&self, ctx: &Context<'_>, token: String) -> Result<Group> {
        Ok(public_group(
            repo::read(ctx.data_unchecked::<Store>(), &token).await?,
            auth::is_admin(ctx.data_unchecked::<Actor>()),
        ))
    }
    async fn balances(&self, ctx: &Context<'_>, token: String) -> Result<Vec<Balance>> {
        let g = repo::read(ctx.data_unchecked::<Store>(), &token).await?;
        Ok(crate::domain::balances(&g)
            .into_iter()
            .map(|(member_id, amount)| Balance {
                member_id,
                amount: Money(amount),
            })
            .collect())
    }
    async fn debts(
        &self,
        ctx: &Context<'_>,
        token: String,
        #[graphql(default = true)] simplified: bool,
    ) -> Result<Vec<Debt>> {
        let g = repo::read(ctx.data_unchecked::<Store>(), &token).await?;
        Ok(crate::domain::debts(&g, simplified))
    }
}
pub struct Mutation;
#[Object]
impl Mutation {
    async fn set_access_grant(
        &self,
        ctx: &Context<'_>,
        email: String,
        role: Option<String>,
    ) -> Result<bool> {
        Ok(crate::access::set(
            ctx.data_unchecked::<Store>(),
            ctx.data_unchecked::<Actor>(),
            email,
            role,
        )
        .await?)
    }

    async fn logout(&self, ctx: &Context<'_>) -> Result<bool> {
        let a = ctx.data_unchecked::<Actor>();
        if let Some(t) = &a.session {
            crate::auth::revoke(ctx.data_unchecked::<Store>(), &auth::digest(t)).await?;
        }
        ctx.insert_http_header(
            "Set-Cookie",
            auth::cookie("", ctx.data_unchecked::<AuthConfig>().secure_cookie, true),
        );
        Ok(true)
    }
    async fn create_group(&self, ctx: &Context<'_>, input: CreateGroupInput) -> Result<Group> {
        Ok(services::create(
            ctx.data_unchecked::<Store>(),
            input,
            ctx.data_unchecked::<Actor>(),
        )
        .await?)
    }
    async fn update_group(
        &self,
        ctx: &Context<'_>,
        token: String,
        version: i32,
        input: UpdateGroupInput,
    ) -> Result<Group> {
        Ok(services::update(
            ctx.data_unchecked::<Store>(),
            &token,
            version,
            input,
            ctx.data_unchecked::<Actor>(),
        )
        .await?)
    }
    async fn save_expense(
        &self,
        ctx: &Context<'_>,
        token: String,
        version: i32,
        input: ExpenseInput,
    ) -> Result<Group> {
        Ok(services::save_expense(
            ctx.data_unchecked::<Store>(),
            &token,
            version,
            input,
            ctx.data_unchecked::<Actor>(),
        )
        .await?)
    }
    async fn delete_expense(
        &self,
        ctx: &Context<'_>,
        token: String,
        version: i32,
        id: String,
    ) -> Result<Group> {
        Ok(services::delete(
            ctx.data_unchecked::<Store>(),
            &token,
            version,
            &id,
            true,
            ctx.data_unchecked::<Actor>(),
        )
        .await?)
    }
    async fn save_settlement(
        &self,
        ctx: &Context<'_>,
        token: String,
        version: i32,
        input: SettlementInput,
    ) -> Result<Group> {
        Ok(services::save_settlement(
            ctx.data_unchecked::<Store>(),
            &token,
            version,
            input,
            ctx.data_unchecked::<Actor>(),
        )
        .await?)
    }
    async fn delete_settlement(
        &self,
        ctx: &Context<'_>,
        token: String,
        version: i32,
        id: String,
    ) -> Result<Group> {
        Ok(services::delete(
            ctx.data_unchecked::<Store>(),
            &token,
            version,
            &id,
            false,
            ctx.data_unchecked::<Actor>(),
        )
        .await?)
    }
    async fn rotate_link(&self, ctx: &Context<'_>, token: String, version: i32) -> Result<Group> {
        Ok(services::admin_action(
            ctx.data_unchecked::<Store>(),
            &token,
            version,
            true,
            ctx.data_unchecked::<Actor>(),
        )
        .await?)
    }
    async fn archive_group(&self, ctx: &Context<'_>, token: String, version: i32) -> Result<Group> {
        Ok(services::admin_action(
            ctx.data_unchecked::<Store>(),
            &token,
            version,
            false,
            ctx.data_unchecked::<Actor>(),
        )
        .await?)
    }
}
pub fn schema(pool: Store, secure_cookie: bool, google_enabled: bool) -> ApiSchema {
    Schema::build(Query, Mutation, EmptySubscription)
        .data(pool)
        .data(AuthConfig {
            secure_cookie,
            google_enabled,
        })
        .limit_depth(12)
        .limit_complexity(1000)
        .finish()
}
