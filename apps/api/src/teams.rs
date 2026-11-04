use crate::{
    auth::Actor,
    domain::{Member, MemberInput},
    services,
    store::Store,
};
use async_graphql::SimpleObject;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize, SimpleObject)]
#[serde(rename_all = "camelCase")]
pub struct Team {
    pub id: String,
    pub name: String,
    pub version: i32,
    pub members: Vec<Member>,
    pub owner_email: String,
}
#[derive(Clone, Serialize, Deserialize)]
struct StoredTeam {
    team: Team,
    owner_email: String,
    created_at: i64,
}

pub async fn list(store: &Store, actor: &Actor) -> Result<Vec<Team>, String> {
    let viewer = actor
        .viewer
        .as_ref()
        .ok_or("UNAUTHORIZED: Vui lòng đăng nhập Google")?;
    let mut records = store.list::<StoredTeam>("TEAM").await?;
    records.retain(|record| is_team_member(&record.value.team, &viewer.email));
    records.sort_by(|a, b| {
        a.value
            .team
            .name
            .to_lowercase()
            .cmp(&b.value.team.name.to_lowercase())
    });
    Ok(records
        .into_iter()
        .map(|record| record.value.team)
        .collect())
}

pub async fn create(
    store: &Store,
    actor: &Actor,
    name: String,
    members: Vec<MemberInput>,
) -> Result<Team, String> {
    let viewer = actor
        .viewer
        .as_ref()
        .ok_or("UNAUTHORIZED: Vui lòng đăng nhập Google")?;
    let mut members = services::members(members)?;
    let email = viewer.email.to_lowercase();
    if !members
        .iter()
        .any(|member| member.email.as_deref() == Some(email.as_str()))
    {
        members.push(Member {
            id: Uuid::new_v4().to_string(),
            name: viewer.name.clone(),
            email: Some(email.clone()),
        });
    }
    let team = Team {
        id: Uuid::new_v4().to_string(),
        name: services::text(&name, 120, true)?,
        version: 1,
        members,
        owner_email: email.clone(),
    };
    let record = StoredTeam {
        team: team.clone(),
        owner_email: email,
        created_at: chrono::Utc::now().timestamp_micros(),
    };
    let audit = serde_json::json!({"team_id":team.id,"action":"create_team","actor_email":viewer.email,"created_at":chrono::Utc::now().to_rfc3339()});
    store
        .commit(vec![
            store.prepare("TEAM", &team.id, &record, None).await?,
            store
                .prepare("TEAM_AUDIT", &Uuid::new_v4().to_string(), &audit, None)
                .await?,
        ])
        .await?;
    Ok(team)
}

pub async fn update(
    store: &Store,
    actor: &Actor,
    id: &str,
    version: i32,
    name: String,
    members: Vec<MemberInput>,
) -> Result<Team, String> {
    let viewer = actor
        .viewer
        .as_ref()
        .ok_or("UNAUTHORIZED: Vui lòng đăng nhập Google")?;
    let stored = store
        .read::<StoredTeam>("TEAM", id)
        .await?
        .ok_or("Không tìm thấy team")?;
    if !is_team_member(&stored.value.team, &viewer.email) {
        return Err("FORBIDDEN: Chỉ thành viên được chỉnh sửa hội nhóm".into());
    }
    if stored.value.team.version != version {
        return Err("CONFLICT: Team đã thay đổi. Hãy tải lại và thử lại.".into());
    }
    let members = services::members(members)?;
    let team = Team {
        id: id.into(),
        name: services::text(&name, 120, true)?,
        version: version.checked_add(1).ok_or("Version exhausted")?,
        members,
        owner_email: stored.value.owner_email.clone(),
    };
    let record = StoredTeam {
        team: team.clone(),
        ..stored.value
    };
    let audit = serde_json::json!({"team_id":id,"action":"update_team","actor_email":viewer.email,"version":team.version,"created_at":chrono::Utc::now().to_rfc3339()});
    store
        .commit(vec![
            store
                .prepare("TEAM", id, &record, Some(&stored.revision))
                .await?,
            store
                .prepare("TEAM_AUDIT", &Uuid::new_v4().to_string(), &audit, None)
                .await?,
        ])
        .await?;
    Ok(team)
}

fn is_team_member(team: &Team, email: &str) -> bool {
    team.members.iter().any(|member| {
        member
            .email
            .as_deref()
            .is_some_and(|member_email| member_email.eq_ignore_ascii_case(email))
    })
}

pub async fn delete(store: &Store, actor: &Actor, id: &str, version: i32) -> Result<bool, String> {
    let viewer = actor
        .viewer
        .as_ref()
        .ok_or("UNAUTHORIZED: Vui lòng đăng nhập Google")?;
    let stored = store
        .read::<StoredTeam>("TEAM", id)
        .await?
        .ok_or("Không tìm thấy team")?;
    if stored.value.owner_email != viewer.email.to_lowercase() {
        return Err("FORBIDDEN: Chỉ người tạo team được xóa".into());
    }
    if stored.value.team.version != version {
        return Err("CONFLICT: Team đã thay đổi. Hãy tải lại và thử lại.".into());
    }
    let audit = serde_json::json!({"team_id":id,"action":"delete_team","actor_email":viewer.email,"version":version,"created_at":chrono::Utc::now().to_rfc3339()});
    store
        .commit(vec![
            store.prepare_delete("TEAM", id, &stored.revision)?,
            store
                .prepare("TEAM_AUDIT", &Uuid::new_v4().to_string(), &audit, None)
                .await?,
        ])
        .await?;
    Ok(true)
}
