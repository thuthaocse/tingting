import type { Group } from './types';
export type { Viewer, Dashboard, AccountDebt } from './graphql/generated';
import type { Viewer, Dashboard } from './graphql/generated';
const fields = `id name description token version archived viewerMemberId directDebts { fromId toId amount } simplifiedDebts { fromId toId amount } members { id name email } expenses { id createdOrder title amount payerId date note shares { memberId amount } } settlements { id createdOrder fromId toId amount date note }`;
export async function graphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const r = await fetch('/graphql', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw Error('Không thể kết nối máy chủ');
  const b = await r.json();
  if (b.errors) throw Error(b.errors[0].message);
  return b.data;
}
export const api = {
  grants: async () =>
    (
      await graphql<{ accessGrants: { email: string; role: string }[] }>(
        '{accessGrants{email role}}',
      )
    ).accessGrants,
  setGrant: (email: string, role: string | null) =>
    graphql('mutation($email:String!,$role:String){setAccessGrant(email:$email,role:$role)}', {
      email,
      role,
    }),
  groups: async () => (await graphql<{ groups: Group[] }>(`query { groups { ${fields} } }`)).groups,
  group: async (token: string) =>
    (
      await graphql<{ group: Group }>(`query($token:String!){group(token:$token){${fields}}}`, {
        token,
      })
    ).group,
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
