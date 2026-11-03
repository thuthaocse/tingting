import type { Group } from './types';
export type { Viewer, Dashboard, AccountDebt } from './graphql/generated';
import type { Viewer, Dashboard, Team, ActivityEvent, AccessGrant } from './graphql/generated';
export type { Team, ActivityEvent } from './graphql/generated';
const fields = `id name description token version viewerMemberId directDebts { fromId toId amount } simplifiedDebts { fromId toId amount } members { id name email } expenses { id createdOrder title amount payerId date note shares { memberId amount } } settlements { id createdOrder fromId toId amount date note }`;
const CONNECTION_ERROR = 'Không thể kết nối máy chủ. Vui lòng thử lại.';
const READ_RETRY_DELAYS = [350, 1000];
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export class GraphqlConnectionError extends Error {
  readonly occurredAt = new Date().toISOString();

  constructor(readonly response?: Response) {
    super(CONNECTION_ERROR);
  }

  get isTemporary() {
    return !this.response || RETRYABLE_STATUSES.has(this.response.status);
  }

  get details() {
    const requestId = this.response?.headers.get('apigw-requestid')
      ?? this.response?.headers.get('x-amzn-requestid');
    const edgeId = this.response?.headers.get('x-amz-cf-id');
    return [
      this.occurredAt,
      this.response ? `HTTP ${this.response.status}` : 'FETCH_FAILED',
      requestId && `API Gateway: ${requestId}`,
      edgeId && `CloudFront: ${edgeId}`,
    ].filter(Boolean).join('\n');
  }
}

async function graphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  retryDelays: readonly number[] = [],
): Promise<T> {
  const response = await fetchGraphql(JSON.stringify({ query, variables }), retryDelays);
  if (!response?.ok) throw new GraphqlConnectionError(response);
  const body = await response.json().catch(() => {
    throw Error('Không thể đọc phản hồi từ máy chủ. Vui lòng thử lại.');
  });
  if (body.errors) throw Error(body.errors[0].message);
  return body.data;
}

function readGraphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  return graphql<T>(query, variables, READ_RETRY_DELAYS);
}

async function fetchGraphql(body: string, retryDelays: readonly number[]) {
  let response = await sendGraphql(body);
  for (const delay of retryDelays) {
    if (response && !RETRYABLE_STATUSES.has(response.status)) break;
    await response?.body?.cancel().catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, delay));
    response = await sendGraphql(body);
  }
  return response;
}

function sendGraphql(body: string) {
  return fetch('/graphql', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => undefined);
}
export const api = {
  grants: async () =>
    (
      await readGraphql<{ accessGrants: AccessGrant[] }>(
        '{accessGrants{email role hasExplicitGrant}}',
      )
    ).accessGrants,
  setGrant: (email: string, role: string | null) =>
    graphql('mutation($email:String!,$role:String){setAccessGrant(email:$email,role:$role)}', {
      email,
      role,
    }),
  groups: async () => (await readGraphql<{ groups: Group[] }>(`query { groups { ${fields} } }`)).groups,
  teams: async () => (await readGraphql<{ teams: Team[] }>('{ teams { id name version ownerEmail members { id name email } } }')).teams,
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
      await readGraphql<{ group: Group }>(`query($token:String!){group(token:$token){${fields}}}`, {
        token,
      })
    ).group,
  activity: async (token: string) =>
    (
      await readGraphql<{ activity: ActivityEvent[] }>(
        'query($token:String!){activity(token:$token){id action summary actorName createdAt entityId}}',
        { token },
      )
    ).activity,
  session: () =>
    readGraphql<{ me: Viewer | null; googleLoginEnabled: boolean }>(
      'query { me { id email name isAdmin canCreateGroups } googleLoginEnabled }',
    ),
  dashboard: async () =>
    (
      await readGraphql<{ dashboard: Dashboard }>(
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
