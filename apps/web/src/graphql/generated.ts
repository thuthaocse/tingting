export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  Money: { input: number; output: number };
};

export type AccessGrant = {
  email: Scalars['String']['output'];
  hasExplicitGrant: Scalars['Boolean']['output'];
  role: Scalars['String']['output'];
};

export type AccountDebt = {
  amount: Scalars['Money']['output'];
  groupId: Scalars['String']['output'];
  groupName: Scalars['String']['output'];
  personId: Scalars['String']['output'];
  personName: Scalars['String']['output'];
  token: Scalars['String']['output'];
};

export type ActivityEvent = {
  action: Scalars['String']['output'];
  actorName: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  entityId?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  summary: Scalars['String']['output'];
};

export type Balance = {
  amount: Scalars['Money']['output'];
  memberId: Scalars['String']['output'];
};

export type CreateGroupInput = {
  description: Scalars['String']['input'];
  members: Array<MemberInput>;
  name: Scalars['String']['input'];
};

export type Dashboard = {
  groups: Array<GroupSummary>;
  incoming: Array<AccountDebt>;
  outgoing: Array<AccountDebt>;
  payable: Scalars['Money']['output'];
  receivable: Scalars['Money']['output'];
};

export type Debt = {
  amount: Scalars['Money']['output'];
  fromId: Scalars['String']['output'];
  toId: Scalars['String']['output'];
};

export type Expense = {
  amount: Scalars['Money']['output'];
  createdOrder: Scalars['String']['output'];
  date: Scalars['String']['output'];
  id: Scalars['String']['output'];
  note: Scalars['String']['output'];
  payerId: Scalars['String']['output'];
  shares: Array<Share>;
  title: Scalars['String']['output'];
};

export type ExpenseInput = {
  amount: Scalars['Money']['input'];
  date: Scalars['String']['input'];
  id: Scalars['String']['input'];
  note: Scalars['String']['input'];
  participantIds: Array<Scalars['String']['input']>;
  payerId: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type Group = {
  description: Scalars['String']['output'];
  directDebts: Array<Debt>;
  expenses: Array<Expense>;
  id: Scalars['String']['output'];
  members: Array<Member>;
  name: Scalars['String']['output'];
  settlements: Array<Settlement>;
  simplifiedDebts: Array<Debt>;
  token: Scalars['String']['output'];
  version: Scalars['Int']['output'];
  viewerMemberId?: Maybe<Scalars['String']['output']>;
};

export type GroupSummary = {
  groupId: Scalars['String']['output'];
  memberId?: Maybe<Scalars['String']['output']>;
  payable: Scalars['Money']['output'];
  receivable: Scalars['Money']['output'];
};

export type Member = {
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type MemberInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type Mutation = {
  createGroup: Group;
  createTeam: Team;
  deleteExpense: Group;
  deleteSettlement: Group;
  deleteTeam: Scalars['Boolean']['output'];
  logout: Scalars['Boolean']['output'];
  rotateLink: Group;
  saveExpense: Group;
  saveSettlement: Group;
  setAccessGrant: Scalars['Boolean']['output'];
  updateGroup: Group;
  updateTeam: Team;
};

export type MutationCreateGroupArgs = {
  input: CreateGroupInput;
};

export type MutationCreateTeamArgs = {
  members: Array<MemberInput>;
  name: Scalars['String']['input'];
};

export type MutationDeleteExpenseArgs = {
  id: Scalars['String']['input'];
  token: Scalars['String']['input'];
  version: Scalars['Int']['input'];
};

export type MutationDeleteSettlementArgs = {
  id: Scalars['String']['input'];
  token: Scalars['String']['input'];
  version: Scalars['Int']['input'];
};

export type MutationDeleteTeamArgs = {
  id: Scalars['String']['input'];
  version: Scalars['Int']['input'];
};

export type MutationRotateLinkArgs = {
  token: Scalars['String']['input'];
  version: Scalars['Int']['input'];
};

export type MutationSaveExpenseArgs = {
  input: ExpenseInput;
  token: Scalars['String']['input'];
  version: Scalars['Int']['input'];
};

export type MutationSaveSettlementArgs = {
  input: SettlementInput;
  token: Scalars['String']['input'];
  version: Scalars['Int']['input'];
};

export type MutationSetAccessGrantArgs = {
  email: Scalars['String']['input'];
  role?: InputMaybe<Scalars['String']['input']>;
};

export type MutationUpdateGroupArgs = {
  input: UpdateGroupInput;
  token: Scalars['String']['input'];
  version: Scalars['Int']['input'];
};

export type MutationUpdateTeamArgs = {
  id: Scalars['String']['input'];
  members: Array<MemberInput>;
  name: Scalars['String']['input'];
  version: Scalars['Int']['input'];
};

export type Query = {
  accessGrants: Array<AccessGrant>;
  activity: Array<ActivityEvent>;
  balances: Array<Balance>;
  dashboard: Dashboard;
  debts: Array<Debt>;
  googleLoginEnabled: Scalars['Boolean']['output'];
  group: Group;
  groups: Array<Group>;
  me?: Maybe<Viewer>;
  teams: Array<Team>;
};

export type QueryActivityArgs = {
  token: Scalars['String']['input'];
};

export type QueryBalancesArgs = {
  token: Scalars['String']['input'];
};

export type QueryDebtsArgs = {
  simplified?: Scalars['Boolean']['input'];
  token: Scalars['String']['input'];
};

export type QueryGroupArgs = {
  token: Scalars['String']['input'];
};

export type Settlement = {
  amount: Scalars['Money']['output'];
  createdOrder: Scalars['String']['output'];
  date: Scalars['String']['output'];
  fromId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  note: Scalars['String']['output'];
  toId: Scalars['String']['output'];
};

export type SettlementInput = {
  amount: Scalars['Money']['input'];
  date: Scalars['String']['input'];
  fromId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  note: Scalars['String']['input'];
  toId: Scalars['String']['input'];
};

export type Share = {
  amount: Scalars['Money']['output'];
  memberId: Scalars['String']['output'];
};

export type Team = {
  id: Scalars['String']['output'];
  members: Array<Member>;
  name: Scalars['String']['output'];
  ownerEmail: Scalars['String']['output'];
  version: Scalars['Int']['output'];
};

export type UpdateGroupInput = {
  description: Scalars['String']['input'];
  members: Array<MemberInput>;
  name: Scalars['String']['input'];
};

export type Viewer = {
  canCreateGroups: Scalars['Boolean']['output'];
  email: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isAdmin: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
};
