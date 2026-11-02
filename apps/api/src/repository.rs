use crate::domain::*;
use chrono::NaiveDate;
use sqlx::{PgConnection, PgPool, Row};
use uuid::Uuid;
pub fn id(s: &str) -> Result<Uuid, String> {
    Uuid::parse_str(s).map_err(|_| "ID không hợp lệ".into())
}
pub async fn load(c: &mut PgConnection, token: &str, lock: bool) -> Result<Group, String> {
    let sql = if lock {
        "SELECT * FROM groups WHERE token=$1 OR id=(SELECT group_id FROM group_link_aliases WHERE token=$1) FOR UPDATE"
    } else {
        "SELECT * FROM groups WHERE token=$1 OR id=(SELECT group_id FROM group_link_aliases WHERE token=$1)"
    };
    let row = sqlx::query(sql)
        .bind(token)
        .fetch_optional(&mut *c)
        .await
        .map_err(db)?
        .ok_or("Không tìm thấy nhóm hoặc liên kết đã hết hiệu lực")?;
    let gid: Uuid = row.get("id");
    let members = sqlx::query("SELECT * FROM members WHERE group_id=$1 ORDER BY name,id")
        .bind(gid)
        .fetch_all(&mut *c)
        .await
        .map_err(db)?
        .iter()
        .map(|r| Member {
            id: r.get::<Uuid, _>("id").to_string(),
            name: r.get("name"),
            email: r.get("email"),
        })
        .collect();
    let mut expenses = vec![];
    for r in sqlx::query(
        "SELECT * FROM expenses WHERE group_id=$1 ORDER BY date DESC,created_order DESC",
    )
    .bind(gid)
    .fetch_all(&mut *c)
    .await
    .map_err(db)?
    {
        let eid: Uuid = r.get("id");
        let shares =
            sqlx::query("SELECT * FROM expense_shares WHERE expense_id=$1 ORDER BY member_id")
                .bind(eid)
                .fetch_all(&mut *c)
                .await
                .map_err(db)?
                .iter()
                .map(|s| Share {
                    member_id: s.get::<Uuid, _>("member_id").to_string(),
                    amount: Money(s.get("amount")),
                })
                .collect();
        expenses.push(Expense {
            id: eid.to_string(),
            created_order: r.get::<i64, _>("created_order").to_string(),
            title: r.get("title"),
            amount: Money(r.get("amount")),
            payer_id: r.get::<Uuid, _>("payer_id").to_string(),
            date: r.get::<NaiveDate, _>("date").to_string(),
            note: r.get("note"),
            shares,
        })
    }
    let settlements = sqlx::query(
        "SELECT * FROM settlements WHERE group_id=$1 ORDER BY date DESC,created_order DESC",
    )
    .bind(gid)
    .fetch_all(&mut *c)
    .await
    .map_err(db)?
    .iter()
    .map(|r| Settlement {
        id: r.get::<Uuid, _>("id").to_string(),
        created_order: r.get::<i64, _>("created_order").to_string(),
        from_id: r.get::<Uuid, _>("from_id").to_string(),
        to_id: r.get::<Uuid, _>("to_id").to_string(),
        amount: Money(r.get("amount")),
        date: r.get::<NaiveDate, _>("date").to_string(),
        note: r.get("note"),
    })
    .collect();
    Ok(Group {
        id: gid.to_string(),
        name: row.get("name"),
        description: row.get("description"),
        token: row.get("token"),
        version: row.get("version"),
        archived: row.get("archived"),
        members,
        expenses,
        settlements,
    })
}
pub async fn read(pool: &PgPool, token: &str) -> Result<Group, String> {
    let mut tx = pool.begin().await.map_err(db)?;
    sqlx::query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
        .execute(&mut *tx)
        .await
        .map_err(db)?;
    let g = load(&mut tx, token, false).await?;
    tx.commit().await.map_err(db)?;
    Ok(g)
}
// A locked aggregate is persisted atomically. Child rows are replaced inside the same transaction.
pub async fn persist(c: &mut PgConnection, g: &Group) -> Result<(), String> {
    let gid = id(&g.id)?;
    sqlx::query(
        "UPDATE groups SET name=$2,description=$3,token=$4,version=$5,archived=$6 WHERE id=$1",
    )
    .bind(gid)
    .bind(&g.name)
    .bind(&g.description)
    .bind(&g.token)
    .bind(g.version)
    .bind(g.archived)
    .execute(&mut *c)
    .await
    .map_err(db)?;
    sqlx::query("DELETE FROM settlements WHERE group_id=$1")
        .bind(gid)
        .execute(&mut *c)
        .await
        .map_err(db)?;
    sqlx::query("DELETE FROM expenses WHERE group_id=$1")
        .bind(gid)
        .execute(&mut *c)
        .await
        .map_err(db)?;
    sqlx::query("DELETE FROM members WHERE group_id=$1")
        .bind(gid)
        .execute(&mut *c)
        .await
        .map_err(db)?;
    for m in &g.members {
        sqlx::query("INSERT INTO members(id,group_id,name,email) VALUES($1,$2,$3,$4)")
            .bind(id(&m.id)?)
            .bind(gid)
            .bind(&m.name)
            .bind(&m.email)
            .execute(&mut *c)
            .await
            .map_err(db)?;
    }
    for e in &g.expenses {
        sqlx::query("INSERT INTO expenses(id,group_id,title,amount,payer_id,date,note,created_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8)").bind(id(&e.id)?).bind(gid).bind(&e.title).bind(e.amount.0).bind(id(&e.payer_id)?).bind(NaiveDate::parse_from_str(&e.date,"%Y-%m-%d").map_err(|_|"Ngày không hợp lệ")?).bind(&e.note).bind(e.created_order.parse::<i64>().map_err(|_|"Invalid entry order")?).execute(&mut *c).await.map_err(db)?;
        for s in &e.shares {
            sqlx::query("INSERT INTO expense_shares(expense_id,member_id,amount) VALUES($1,$2,$3)")
                .bind(id(&e.id)?)
                .bind(id(&s.member_id)?)
                .bind(s.amount.0)
                .execute(&mut *c)
                .await
                .map_err(db)?;
        }
    }
    for s in &g.settlements {
        sqlx::query("INSERT INTO settlements(id,group_id,from_id,to_id,amount,date,note,created_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8)").bind(id(&s.id)?).bind(gid).bind(id(&s.from_id)?).bind(id(&s.to_id)?).bind(s.amount.0).bind(NaiveDate::parse_from_str(&s.date,"%Y-%m-%d").map_err(|_|"Ngày không hợp lệ")?).bind(&s.note).bind(s.created_order.parse::<i64>().map_err(|_|"Invalid entry order")?).execute(&mut *c).await.map_err(db)?;
    }
    Ok(())
}
pub fn db(e: sqlx::Error) -> String {
    tracing::error!(error=%e,"database operation failed");
    "Không thể lưu dữ liệu. Vui lòng thử lại.".into()
}

pub async fn next_entry_order(connection: &mut PgConnection) -> Result<String, String> {
    let order: i64 = sqlx::query_scalar("SELECT nextval('ledger_entry_order')")
        .fetch_one(connection)
        .await
        .map_err(db)?;
    Ok(order.to_string())
}
