use async_graphql::{
    ComplexObject, InputObject, InputValueError, InputValueResult, Scalar, ScalarType,
    SimpleObject, Value,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

/// Integer VND transported as a custom scalar because GraphQL Int is only 32-bit.
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
#[serde(transparent)]
pub struct Money(pub i64);
#[Scalar]
impl ScalarType for Money {
    fn parse(value: Value) -> InputValueResult<Self> {
        match value {
            Value::Number(number) => number
                .as_i64()
                .filter(|amount| amount.unsigned_abs() <= 9_007_199_254_740_991)
                .map(Money)
                .ok_or_else(|| {
                    InputValueError::custom("Số tiền phải là số nguyên trong giới hạn an toàn")
                }),
            value => Err(InputValueError::expected_type(value)),
        }
    }
    fn to_value(&self) -> Value {
        Value::Number(self.0.into())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, SimpleObject)]
#[serde(rename_all = "camelCase")]
pub struct Member {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize, SimpleObject, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Share {
    pub member_id: String,
    pub amount: Money,
}
#[derive(Clone, Debug, Serialize, Deserialize, SimpleObject)]
#[serde(rename_all = "camelCase")]
pub struct Expense {
    pub id: String,
    pub created_order: String,
    pub title: String,
    pub amount: Money,
    pub payer_id: String,
    pub date: String,
    pub note: String,
    pub shares: Vec<Share>,
}
#[derive(Clone, Debug, Serialize, Deserialize, SimpleObject)]
#[serde(rename_all = "camelCase")]
pub struct Settlement {
    pub id: String,
    pub created_order: String,
    pub from_id: String,
    pub to_id: String,
    pub amount: Money,
    pub date: String,
    pub note: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, SimpleObject)]
#[serde(rename_all = "camelCase")]
#[graphql(complex)]
pub struct Group {
    pub id: String,
    pub name: String,
    pub description: String,
    pub token: String,
    pub version: i32,
    pub members: Vec<Member>,
    pub expenses: Vec<Expense>,
    pub settlements: Vec<Settlement>,
}
#[ComplexObject]
impl Group {
    async fn viewer_member_id(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> async_graphql::Result<Option<String>> {
        let actor = ctx.data_unchecked::<crate::auth::Actor>();
        let Some(user) = &actor.viewer else {
            return Ok(None);
        };
        let g = crate::repository::read(ctx.data_unchecked::<crate::store::Store>(), &self.token)
            .await?;
        Ok(crate::dashboard::matched_member(&g, &user.email))
    }

    async fn direct_debts(&self) -> Vec<Debt> {
        debts(self, false)
    }
    async fn simplified_debts(&self) -> Vec<Debt> {
        debts(self, true)
    }
}
#[derive(Clone, Debug, SimpleObject, PartialEq)]
pub struct Debt {
    pub from_id: String,
    pub to_id: String,
    pub amount: Money,
}
#[derive(SimpleObject)]
pub struct Balance {
    pub member_id: String,
    pub amount: Money,
}
#[derive(Clone, InputObject)]
pub struct MemberInput {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
}
#[derive(InputObject)]
pub struct CreateGroupInput {
    pub name: String,
    pub description: String,
    pub members: Vec<MemberInput>,
}
#[derive(InputObject)]
pub struct UpdateGroupInput {
    pub name: String,
    pub description: String,
    pub members: Vec<MemberInput>,
}
#[derive(InputObject)]
pub struct ExpenseInput {
    pub id: String,
    pub title: String,
    pub amount: Money,
    pub payer_id: String,
    pub date: String,
    pub note: String,
    pub participant_ids: Vec<String>,
}
#[derive(InputObject)]
pub struct SettlementInput {
    pub id: String,
    pub from_id: String,
    pub to_id: String,
    pub amount: Money,
    pub date: String,
    pub note: String,
}

pub fn split_evenly(amount: i64, ids: &[String]) -> Result<Vec<Share>, String> {
    if amount <= 0 || amount > 1_000_000_000_000 || ids.is_empty() {
        return Err("Số tiền hoặc người cùng chia không hợp lệ".into());
    }
    let sorted: BTreeSet<_> = ids.iter().cloned().collect();
    if sorted.len() != ids.len() {
        return Err("Thành viên bị trùng".into());
    }
    let n = ids.len() as i64;
    Ok(sorted
        .into_iter()
        .enumerate()
        .map(|(i, member_id)| Share {
            member_id,
            amount: Money(amount / n + if (i as i64) < amount % n { 1 } else { 0 }),
        })
        .collect())
}
pub fn balances(g: &Group) -> BTreeMap<String, i64> {
    let mut b: BTreeMap<_, _> = g.members.iter().map(|m| (m.id.clone(), 0)).collect();
    for e in &g.expenses {
        *b.entry(e.payer_id.clone()).or_default() += e.amount.0;
        for s in &e.shares {
            *b.entry(s.member_id.clone()).or_default() -= s.amount.0;
        }
    }
    for s in &g.settlements {
        *b.entry(s.from_id.clone()).or_default() += s.amount.0;
        *b.entry(s.to_id.clone()).or_default() -= s.amount.0;
    }
    b
}
pub fn debts(g: &Group, simplified: bool) -> Vec<Debt> {
    if simplified {
        let b = balances(g);
        let mut p: Vec<_> = b
            .iter()
            .filter(|(_, n)| **n > 0)
            .map(|(id, n)| (id.clone(), *n))
            .collect();
        let mut n: Vec<_> = b
            .iter()
            .filter(|(_, n)| **n < 0)
            .map(|(id, n)| (id.clone(), -*n))
            .collect();
        p.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
        n.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
        let (mut i, mut j) = (0, 0);
        let mut out = vec![];
        while i < n.len() && j < p.len() {
            let amount = n[i].1.min(p[j].1);
            out.push(Debt {
                from_id: n[i].0.clone(),
                to_id: p[j].0.clone(),
                amount: Money(amount),
            });
            n[i].1 -= amount;
            p[j].1 -= amount;
            if n[i].1 == 0 {
                i += 1
            }
            if p[j].1 == 0 {
                j += 1
            }
        }
        return out;
    }
    let mut pairs: BTreeMap<(String, String), i64> = BTreeMap::new();
    let mut add = |from: &str, to: &str, amount: i64| {
        if from == to {
            return;
        }
        let (key, sign) = if from < to {
            ((from.into(), to.into()), 1)
        } else {
            ((to.into(), from.into()), -1)
        };
        *pairs.entry(key).or_default() += sign * amount;
    };
    for e in &g.expenses {
        for s in &e.shares {
            add(&s.member_id, &e.payer_id, s.amount.0)
        }
    }
    for s in &g.settlements {
        add(&s.from_id, &s.to_id, -s.amount.0)
    }
    pairs
        .into_iter()
        .filter(|(_, v)| *v != 0)
        .map(|((a, b), v)| Debt {
            from_id: if v > 0 { a.clone() } else { b.clone() },
            to_id: if v > 0 { b } else { a },
            amount: Money(v.abs()),
        })
        .collect()
}
pub fn public_group(mut g: Group, admin: bool) -> Group {
    if !admin {
        for m in &mut g.members {
            m.email = None;
        }
    }
    g
}
#[cfg(test)]
mod tests {
    use super::*;
    fn sample() -> Group {
        Group {
            id: "g".into(),
            name: "Group".into(),
            description: "".into(),
            token: "t".into(),
            version: 1,
            members: ["a", "b", "c"]
                .iter()
                .map(|id| Member {
                    id: (*id).into(),
                    name: (*id).into(),
                    email: None,
                })
                .collect(),
            expenses: vec![
                Expense {
                    id: "e1".into(),
                    created_order: "1".into(),
                    title: "Test".into(),
                    payer_id: "b".into(),
                    amount: Money(20),
                    date: "2026-11-02".into(),
                    note: "".into(),
                    shares: vec![Share {
                        member_id: "a".into(),
                        amount: Money(20),
                    }],
                },
                Expense {
                    id: "e2".into(),
                    created_order: "2".into(),
                    title: "Test".into(),
                    payer_id: "c".into(),
                    amount: Money(20),
                    date: "2026-11-02".into(),
                    note: "".into(),
                    shares: vec![Share {
                        member_id: "b".into(),
                        amount: Money(20),
                    }],
                },
            ],
            settlements: vec![],
        }
    }
    #[test]
    fn splitting_preserves_remainder() {
        let ids = vec!["c".into(), "b".into(), "a".into()];
        let s = split_evenly(10, &ids).unwrap();
        assert_eq!(s.iter().map(|x| x.amount.0).sum::<i64>(), 10);
        assert_eq!(s[0].amount.0, 4);
        assert!(split_evenly(1, &[]).is_err());
        assert!(split_evenly(1, &["a".into(), "a".into()]).is_err());
    }
    #[test]
    fn simplifies_chain() {
        let g = sample();
        assert_eq!(
            debts(&g, true),
            vec![Debt {
                from_id: "a".into(),
                to_id: "c".into(),
                amount: Money(20)
            }]
        );
        assert_eq!(g.expenses.len(), 2);
    }
    #[test]
    fn repayment_updates_both_sides() {
        let mut g = sample();
        g.settlements.push(Settlement {
            id: "s".into(),
            created_order: "3".into(),
            from_id: "a".into(),
            to_id: "c".into(),
            amount: Money(7),
            date: "2026-11-02".into(),
            note: "".into(),
        });
        assert_eq!(balances(&g)["a"], -13);
        assert_eq!(balances(&g)["c"], 13);
        assert_eq!(balances(&g).values().sum::<i64>(), 0);
        for mode in [false, true] {
            let mut b: BTreeMap<_, _> = g.members.iter().map(|m| (m.id.clone(), 0)).collect();
            for d in debts(&g, mode) {
                *b.get_mut(&d.from_id).unwrap() -= d.amount.0;
                *b.get_mut(&d.to_id).unwrap() += d.amount.0;
            }
            assert_eq!(b, balances(&g));
        }
    }
    #[test]
    fn public_response_hides_email() {
        let mut g = sample();
        g.members[0].email = Some("private@example.com".into());
        assert!(public_group(g, false).members[0].email.is_none());
    }
    #[test]
    fn money_accepts_large_integer_vnd_and_rejects_fractions() {
        assert_eq!(
            Money::parse(Value::Number(5_000_000_000_i64.into()))
                .unwrap()
                .0,
            5_000_000_000
        );
        assert!(
            Money::parse(Value::Number(async_graphql::Number::from_f64(1.5).unwrap())).is_err()
        );
        assert!(Money::parse(Value::Number(9_007_199_254_740_992_i64.into())).is_err());
    }
}
