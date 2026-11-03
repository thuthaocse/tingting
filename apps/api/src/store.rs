use aws_sdk_dynamodb::{
    types::{AttributeValue as A, Delete, Put, TransactWriteItem, Update},
    Client,
};
use serde::{de::DeserializeOwned, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Clone)]
pub struct Store {
    pub client: Client,
    pub table: String,
}
#[derive(Clone)]
pub struct Record<T> {
    pub value: T,
    pub revision: String,
}

impl Store {
    pub async fn connect() -> Result<Self, String> {
        let config = aws_config::load_from_env().await;
        let mut builder = aws_sdk_dynamodb::config::Builder::from(&config);
        if let Ok(endpoint) = std::env::var("DYNAMODB_ENDPOINT") {
            builder = builder.endpoint_url(endpoint);
        }
        Ok(Self {
            client: Client::from_conf(builder.build()),
            table: std::env::var("DYNAMODB_TABLE").map_err(|_| "DYNAMODB_TABLE is required")?,
        })
    }
    pub async fn read<T: DeserializeOwned>(
        &self,
        kind: &str,
        key: &str,
    ) -> Result<Option<Record<T>>, String> {
        let Some(head) = self.get(kind, key).await? else {
            return Ok(None);
        };
        if has_expired(&head) {
            return Ok(None);
        }
        let revision = string(&head, "revision")?;
        let count = head
            .get("chunks")
            .and_then(|a| a.as_n().ok())
            .ok_or("Invalid chunk count")?
            .parse::<usize>()
            .map_err(error)?;
        let payload = self.load_chunks(&revision, count).await?;
        Ok(Some(Record {
            value: serde_json::from_slice(&payload).map_err(error)?,
            revision,
        }))
    }
    pub async fn prepare<T: Serialize>(
        &self,
        kind: &str,
        key: &str,
        value: &T,
        expected: Option<&str>,
    ) -> Result<TransactWriteItem, String> {
        let revision = Uuid::new_v4().to_string();
        let payload = serde_json::to_vec(value).map_err(error)?;
        let expiry = expiry(kind, value)?;
        let count = self.stage_chunks(&revision, &payload, expiry).await?;
        let mut head = keys(kind, key);
        add_expiry(&mut head, expiry);
        head.insert("revision".into(), A::S(revision));
        head.insert("chunks".into(), A::N(count.to_string()));
        self.conditional_put(head, expected)
    }
    pub fn prepare_delete(
        &self,
        kind: &str,
        key: &str,
        expected: &str,
    ) -> Result<TransactWriteItem, String> {
        let delete = Delete::builder()
            .table_name(&self.table)
            .set_key(Some(keys(kind, key)))
            .condition_expression("revision = :expected")
            .expression_attribute_values(":expected", A::S(expected.into()))
            .build()
            .map_err(error)?;
        Ok(TransactWriteItem::builder().delete(delete).build())
    }
    pub async fn commit(&self, mut writes: Vec<TransactWriteItem>) -> Result<(), String> {
        writes.push(self.advance_stamp()?);
        self.client
            .transact_write_items()
            .client_request_token(Uuid::new_v4().to_string())
            .set_transact_items(Some(writes))
            .send()
            .await
            .map_err(commit_error)?;
        Ok(())
    }
    async fn get(&self, kind: &str, key: &str) -> Result<Option<HashMap<String, A>>, String> {
        Ok(self
            .client
            .get_item()
            .table_name(&self.table)
            .set_key(Some(keys(kind, key)))
            .consistent_read(true)
            .send()
            .await
            .map_err(error)?
            .item)
    }
    async fn load_chunks(&self, revision: &str, count: usize) -> Result<Vec<u8>, String> {
        let mut payload = Vec::new();
        for index in 0..count {
            let chunk = self
                .get(&format!("BLOB#{revision}"), &format!("{index:08}"))
                .await?
                .ok_or("Missing snapshot chunk")?;
            payload.extend_from_slice(
                chunk
                    .get("payload")
                    .and_then(|a| a.as_b().ok())
                    .ok_or("Invalid snapshot chunk")?
                    .as_ref(),
            );
        }
        Ok(payload)
    }
    async fn stage_chunks(
        &self,
        revision: &str,
        payload: &[u8],
        expiry: Option<i64>,
    ) -> Result<usize, String> {
        for (index, chunk) in payload.chunks(300_000).enumerate() {
            let mut blob = keys(&format!("BLOB#{revision}"), &format!("{index:08}"));
            blob.insert("payload".into(), A::B(chunk.to_vec().into()));
            add_expiry(&mut blob, expiry);
            self.client
                .put_item()
                .table_name(&self.table)
                .set_item(Some(blob))
                .condition_expression("attribute_not_exists(pk)")
                .send()
                .await
                .map_err(error)?;
        }
        Ok(payload.len().div_ceil(300_000))
    }
    fn conditional_put(
        &self,
        head: HashMap<String, A>,
        expected: Option<&str>,
    ) -> Result<TransactWriteItem, String> {
        let put = Put::builder().table_name(&self.table).set_item(Some(head));
        let put = match expected {
            Some(revision) => put
                .condition_expression("revision = :expected")
                .expression_attribute_values(":expected", A::S(revision.into())),
            None => put.condition_expression("attribute_not_exists(pk)"),
        };
        Ok(TransactWriteItem::builder()
            .put(put.build().map_err(error)?)
            .build())
    }
    fn advance_stamp(&self) -> Result<TransactWriteItem, String> {
        let update = Update::builder()
            .table_name(&self.table)
            .set_key(Some(keys("SYSTEM", "revision")))
            .update_expression("ADD #counter :one")
            .expression_attribute_names("#counter", "counter")
            .expression_attribute_values(":one", A::N("1".into()))
            .build()
            .map_err(error)?;
        Ok(TransactWriteItem::builder().update(update).build())
    }
    pub async fn save<T: Serialize>(
        &self,
        kind: &str,
        key: &str,
        value: &T,
        expected: Option<&str>,
    ) -> Result<(), String> {
        self.commit(vec![self.prepare(kind, key, value, expected).await?])
            .await
    }
    pub async fn list<T: DeserializeOwned>(&self, kind: &str) -> Result<Vec<Record<T>>, String> {
        let mut cursor = None;
        let mut records = Vec::new();
        loop {
            let page = self
                .client
                .query()
                .table_name(&self.table)
                .key_condition_expression("pk = :kind")
                .expression_attribute_values(":kind", A::S(kind.into()))
                .consistent_read(true)
                .set_exclusive_start_key(cursor)
                .send()
                .await
                .map_err(error)?;
            for head in page.items() {
                if let Some(record) = self.read(kind, &string(head, "sk")?).await? {
                    records.push(record);
                }
            }
            cursor = page.last_evaluated_key;
            if cursor.as_ref().is_none_or(|key| key.is_empty()) {
                break;
            }
        }
        Ok(records)
    }
    pub async fn stamp(&self) -> Result<String, String> {
        Ok(self
            .get("SYSTEM", "revision")
            .await?
            .and_then(|h| h.get("counter").and_then(|a| a.as_n().ok()).cloned())
            .unwrap_or_default())
    }
}
fn expiry<T: Serialize>(kind: &str, value: &T) -> Result<Option<i64>, String> {
    if kind != "SESSION" && kind != "OAUTH" {
        return Ok(None);
    }
    Ok(serde_json::to_value(value).map_err(error)?["expires_at"].as_i64())
}
fn add_expiry(head: &mut HashMap<String, A>, expiry: Option<i64>) {
    if let Some(expiry) = expiry {
        head.insert("expires_at".into(), A::N(expiry.to_string()));
    }
}
fn has_expired(head: &HashMap<String, A>) -> bool {
    head.get("expires_at")
        .and_then(|a| a.as_n().ok())
        .and_then(|s| s.parse::<i64>().ok())
        .is_some_and(|expiry| expiry <= chrono::Utc::now().timestamp())
}
fn commit_error(
    e: aws_sdk_dynamodb::error::SdkError<
        aws_sdk_dynamodb::operation::transact_write_items::TransactWriteItemsError,
    >,
) -> String {
    if e.as_service_error()
        .is_some_and(|e| e.is_transaction_canceled_exception())
    {
        return "CONFLICT: Dữ liệu đã thay đổi. Hãy tải lại và thử lại.".into();
    }
    error(e)
}
fn keys(kind: &str, key: &str) -> HashMap<String, A> {
    HashMap::from([
        ("pk".into(), A::S(kind.into())),
        ("sk".into(), A::S(key.into())),
    ])
}
fn string(item: &HashMap<String, A>, key: &str) -> Result<String, String> {
    item.get(key)
        .and_then(|a| a.as_s().ok())
        .cloned()
        .ok_or_else(|| format!("Missing {key}"))
}
fn error(e: impl std::fmt::Display) -> String {
    tracing::error!(error=%e,"storage failure");
    "Không thể truy cập dữ liệu. Vui lòng thử lại.".into()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[tokio::test]
    #[ignore = "requires disposable DynamoDB Local table"]
    async fn snapshots_span_chunks_and_conditional_commits_have_one_winner() {
        let store = Store::connect().await.unwrap();
        let key = Uuid::new_v4().to_string();
        let value = json!({"text":"ế".repeat(500_000)});
        store.save("TEST", &key, &value, None).await.unwrap();
        let before = store
            .read::<serde_json::Value>("TEST", &key)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(before.value, value);
        let writes_a = store
            .prepare("TEST", &key, &json!({"winner":"a"}), Some(&before.revision))
            .await
            .unwrap();
        let writes_b = store
            .prepare("TEST", &key, &json!({"winner":"b"}), Some(&before.revision))
            .await
            .unwrap();
        let (a, b) = tokio::join!(store.commit(vec![writes_a]), store.commit(vec![writes_b]));
        assert_ne!(a.is_ok(), b.is_ok());
        assert!(store
            .read::<serde_json::Value>("TEST", &key)
            .await
            .unwrap()
            .unwrap()
            .value["winner"]
            .is_string());
    }

    #[tokio::test]
    #[ignore = "requires disposable DynamoDB Local table"]
    async fn expired_sessions_and_role_revocation_are_checked_on_each_request() {
        let store = Store::connect().await.unwrap();
        let id = Uuid::new_v4().to_string();
        let email = format!("{id}@example.com");
        let user = crate::auth::User {
            id: id.clone(),
            email: email.clone(),
            name: "Test".into(),
        };
        let token = Uuid::new_v4().to_string();
        store.save("USER", &id, &user, None).await.unwrap();
        store
            .save(
                "ROLE",
                &email,
                &crate::access::Grant {
                    email: email.clone(),
                    role: Some("admin".into()),
                },
                None,
            )
            .await
            .unwrap();
        store
            .save(
                "SESSION",
                &crate::auth::digest(&token),
                &crate::auth::Session {
                    user_id: id,
                    expires_at: chrono::Utc::now().timestamp() + 600,
                },
                None,
            )
            .await
            .unwrap();
        let cookie = format!("lilac_session={token}");
        assert!(
            crate::auth::actor(&store, Some(&cookie))
                .await
                .viewer
                .unwrap()
                .is_admin
        );
        let grant = store
            .read::<crate::access::Grant>("ROLE", &email)
            .await
            .unwrap()
            .unwrap();
        store
            .save(
                "ROLE",
                &email,
                &crate::access::Grant {
                    email: email.clone(),
                    role: None,
                },
                Some(&grant.revision),
            )
            .await
            .unwrap();
        assert!(
            !crate::auth::actor(&store, Some(&cookie))
                .await
                .viewer
                .unwrap()
                .is_admin
        );
        crate::auth::revoke(&store, &crate::auth::digest(&token))
            .await
            .unwrap();
        assert!(crate::auth::actor(&store, Some(&cookie))
            .await
            .viewer
            .is_none());
    }
}
