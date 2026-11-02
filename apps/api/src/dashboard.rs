use crate::store::Store;
use crate::{
    auth::{self, Actor},
    domain::{self, Group, Money},
    repository,
};
use async_graphql::SimpleObject;

#[derive(SimpleObject)]
pub struct AccountDebt {
    pub group_id: String,
    pub group_name: String,
    pub token: String,
    pub person_id: String,
    pub person_name: String,
    pub amount: Money,
}
#[derive(SimpleObject)]
pub struct GroupSummary {
    pub group_id: String,
    pub member_id: Option<String>,
    pub payable: Money,
    pub receivable: Money,
}
#[derive(SimpleObject)]
pub struct Dashboard {
    pub payable: Money,
    pub receivable: Money,
    pub outgoing: Vec<AccountDebt>,
    pub incoming: Vec<AccountDebt>,
    pub groups: Vec<GroupSummary>,
}
pub fn matched_member(g: &Group, email: &str) -> Option<String> {
    let mut matches = g.members.iter().filter(|m| {
        m.email
            .as_ref()
            .is_some_and(|e| e.trim().eq_ignore_ascii_case(email))
    });
    let id = matches.next()?.id.clone();
    // Historical duplicate emails must not silently impersonate either member.
    if matches.next().is_some() {
        None
    } else {
        Some(id)
    }
}
fn add_group(out: &mut Dashboard, g: &Group, email: &str) {
    let member_id = matched_member(g, email);
    let mut summary = GroupSummary {
        group_id: g.id.clone(),
        member_id: member_id.clone(),
        payable: Money(0),
        receivable: Money(0),
    };
    if let Some(id) = member_id {
        for debt in domain::debts(g, true) {
            let receive = debt.to_id == id;
            if debt.from_id != id && !receive {
                continue;
            }
            let person_id = if receive { debt.from_id } else { debt.to_id };
            let item = AccountDebt {
                group_id: g.id.clone(),
                group_name: g.name.clone(),
                token: g.token.clone(),
                person_name: g
                    .members
                    .iter()
                    .find(|m| m.id == person_id)
                    .map(|m| m.name.clone())
                    .unwrap_or_default(),
                person_id,
                amount: debt.amount,
            };
            if receive {
                summary.receivable.0 += debt.amount.0;
                if !g.archived {
                    out.incoming.push(item);
                }
            } else {
                summary.payable.0 += debt.amount.0;
                if !g.archived {
                    out.outgoing.push(item);
                }
            }
        }
    }
    if !g.archived {
        out.payable.0 += summary.payable.0;
        out.receivable.0 += summary.receivable.0;
    }
    out.groups.push(summary);
}
pub async fn load(pool: &Store, actor: &Actor) -> Result<Dashboard, String> {
    auth::signed_in(actor)?;
    let email = &actor.viewer.as_ref().unwrap().email;
    let mut out = Dashboard {
        payable: Money(0),
        receivable: Money(0),
        outgoing: vec![],
        incoming: vec![],
        groups: vec![],
    };
    for group in repository::all(pool).await? {
        add_group(&mut out, &group, email);
    }
    Ok(out)
}
