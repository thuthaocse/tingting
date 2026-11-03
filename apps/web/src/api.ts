import type { Group } from './types';
export type { Viewer, Dashboard, AccountDebt } from './graphql/generated';
import type { Viewer, Dashboard, Team, ActivityEvent, AccessGrant } from './graphql/generated';
export type { Team, ActivityEvent } from './graphql/generated';
const fields = `id name description token version viewerMemberId directDebts { fromId toId amount } simplifiedDebts { fromId toId amount } members { id name email } expenses { id createdOrder title amount payerId date note shares { memberId amount } } settlements { id createdOrder fromId toId amount date note }`;
export async function graphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const r = await fetch('/graphql', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  }).catch(() => {
    throw Error('Không thể kết nối máy chủ. Vui lòng thử lại.');
  });
  if (!r.ok) throw Error('Không thể kết nối máy chủ. Vui lòng thử lại.');
  const b = await r.json().catch(() => {
    throw Error('Không thể đọc phản hồi từ máy chủ. Vui lòng thử lại.');
  });
  if (b.errors) throw Error(b.errors[0].message);
  return b.data;
}
export const api = {
  grants: async () =>
    (
      await graphql<{ accessGrants: AccessGrant[] }>(
        '{accessGrants{email role hasExplicitGrant}}',
      )
    ).accessGrants,
  setGrant: (email: string, role: string | null) =>
    graphql('mutation($email:String!,$role:String){setAccessGrant(email:$email,role:$role)}', {
      email,
      role,
    }),
  groups: async () => (await graphql<{ groups: Group[] }>(`query { groups { ${fields} } }`)).groups,
  teams: async () => (await graphql<{ teams: Team[] }>('{ teams { id name version ownerEmail members { id name email } } }')).teams,
  createTeam: async (name: string, members: unknown[]) => (await graphql<{ createTeam: Team }>(
    'mutation($name:String!,$members:[MemberInput!]!){createTeam(name:$name,members:$members){id name version ownerEmail members{id name email}}}',
    { name, members },
  )).createTeam,
  updateTeam: async (id: string, version: number, name: string, members: unknown[]) => (await graphql<{ updateTeam: Team }>(
    'mutation($id:String!,$version:Int!,$name:String!,$members:[MemberInput!]!){updateTeam(id:$id,version:$version,name:$name,members:$members){id name version ownerEmail members{id name email}}}',
    { id, version, name, members },
  )).updateTeam,
  deleteTeam: async (id: string, version: number) => (await graphql<{ deleteTeam: boolean }>(
    'mutation($id:String!,$version:Int!){deleteTeam(id:$id,version:$version)}',
    { id, version },
  )).deleteTeam,
  group: async (token: string) =>
    (
      await graphql<{ group: Group }>(`query($token:String!){group(token:$token){${fields}}}`, {
        token,
      })
    ).group,
  activity: async (token: string) =>
    (
      await graphql<{ activity: ActivityEvent[] }>(
        'query($token:String!){activity(token:$token){id action summary actorName createdAt entityId}}',
        { token },
      )
    ).activity,
  session: () =>
    graphql<{ me: Viewer | null; googleLoginEnabled: boolean }>(
      'query { me { id email name isAdmin canCreateGroups } googleLoginEnabled }',
    ),
  dashboard: async () =>
    (
      await graphql<{ dashboard: Dashboard }>(
        'query { dashboard { payable receivable outgoing { groupId groupName token personId personName amount } incoming { groupId groupName token personId personName amount } groups { groupId memberId payable receivable } } }',
      )
    ).dashboard,
  logout: async () => {
    await graphql('mutation { logout }');
  },
  create: async (input: unknown) =>
    (
      await graphql<{ createGroup: Group }>(
        `mutation($input:CreateGroupInput!){createGroup(input:$input){${fields}}}`,
        { input },
      )
    ).createGroup,
  mutate: async (name: string, token: string, version: number, input?: unknown) => {
    const type: { [key: string]: string } = {
      saveExpense: 'ExpenseInput',
      saveSettlement: 'SettlementInput',
      updateGroup: 'UpdateGroupInput',
    };
    const has = !!type[name];
    return Object.values(
      await graphql<Record<string, Group>>(
        `mutation($token:String!,$version:Int!${has ? `,$input:${type[name]}!` : input !== undefined ? ',$id:String!' : ''}){${name}(token:$token,version:$version${has ? ',input:$input' : input !== undefined ? ',id:$id' : ''}){${fields}}}`,
        { token, version, ...(has ? { input } : input !== undefined ? { id: input } : {}) },
      ),
    )[0];
  },
};
