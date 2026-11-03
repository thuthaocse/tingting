import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = process.env.API_URL || 'http://localhost:8080/graphql';
const fields =
  'id name token version members { id name email } expenses { id createdOrder title amount payerId date note shares { memberId amount } } settlements { id createdOrder fromId toId amount date note } directDebts { fromId toId amount } simplifiedDebts { fromId toId amount }';
let cookie = '';
async function request(query, variables = {}, authenticated = true) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authenticated && cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  return response.json();
}
function result(body, key) {
  assert.equal(body.errors, undefined, JSON.stringify(body.errors));
  return body.data[key];
}
async function command(action, group, input, type) {
  return request(
    `mutation($token:String!,$version:Int!${type ? `,$input:${type}!` : input !== undefined ? ',$id:String!' : ''}){${action}(token:$token,version:$version${type ? ',input:$input' : input !== undefined ? ',id:$id' : ''}){${fields}}}`,
    {
      token: group.token,
      version: group.version,
      ...(type ? { input } : input !== undefined ? { id: input } : {}),
    },
  );
}

test('GraphQL workflow: permissions, conservation, partial repayment, conflicts, edits and link rotation', async () => {
  assert.ok(
    process.env.TEST_ADMIN_COOKIE && process.env.TEST_USER_COOKIE,
    'Run npm run test:integration:local for trusted local fixtures',
  );
  cookie = process.env.TEST_ADMIN_COOKIE;
  const denied = await request('query { groups { id } }', {}, false);
  assert.match(denied.errors[0].message, /UNAUTHORIZED/);
  const me = result(await request('query { me { email isAdmin } }'), 'me');
  assert.equal(me.email, 'thuthao.cse@gmail.com');
  assert.equal(me.isAdmin, true);
  const restored = result(await request('query { me { email isAdmin } }'), 'me');
  assert.deepEqual(
    restored,
    me,
    'A fresh request restores the account from its saved server session',
  );
  cookie = process.env.TEST_USER_COOKIE;
  assert.equal(result(await request('query { me { isAdmin } }'), 'me').isAdmin, false);
  assert.ok(
    Array.isArray(result(await request('query { groups { id members {email} } }'), 'groups')),
  );
  const createDenied = await request(
    'mutation($input:CreateGroupInput!){createGroup(input:$input){id}}',
    { input: { name: 'Denied', description: '', members: [{ id: randomUUID(), name: 'Member' }] } },
    false,
  );
  assert.match(createDenied.errors[0].message, /UNAUTHORIZED/);
  cookie = process.env.TEST_ADMIN_COOKIE;
  const memberPrefix = randomUUID().slice(0, -1);
  const members = ['Linh Nguyễn', 'Minh Trần', 'An Phạm', 'Thảo Lê'].map((name, index) => ({
    id: memberPrefix + index,
    name,
    email: index === 1 ? process.env.TEST_MEMBER_EMAIL : index === 3 ? 'thuthao.cse@gmail.com' : randomUUID() + '@example.com',
  }));
  let group = result(
    await request(`mutation($input:CreateGroupInput!){createGroup(input:$input){${fields}}}`, {
      input: {
        name: 'Integration test ' + randomUUID(),
        description: 'test-run:' + process.env.TEST_RUN_ID,
        members,
      },
    }),
    'createGroup',
  );
  assert.match(group.token, /^[A-Za-z0-9]{8}$/, 'Group URLs use the eight-character group ID');
  assert.equal(group.token, group.id);
  const originalToken = group.token;
  assert.equal(group.members.length, 4);
    const publicGroup = result(
      await request(`query($t:String!){group(token:$t){${fields}}}`, { t: group.token }, false),
      'group',
    );
    assert.ok(
      publicGroup.members.every((m) => m.email === null),
      'Public responses hide emails',
    );
    const input = {
      id: randomUUID(),
      title: 'Ăn tối',
      amount: 600001,
      payerId: members[0].id,
      date: '2026-11-02',
      note: '',
      participantIds: members.map((m) => m.id),
    };
    cookie = '';
    assert.match(
      (await command('saveExpense', group, input, 'ExpenseInput')).errors[0].message,
      /UNAUTHORIZED/,
    );
    assert.match(
      (await command('deleteExpense', group, input.id)).errors[0].message,
      /UNAUTHORIZED/,
    );
    assert.match(
      (
        await command(
          'saveSettlement',
          group,
          {
            id: randomUUID(),
            fromId: members[1].id,
            toId: members[0].id,
            amount: 1,
            date: '2026-11-02',
            note: '',
          },
          'SettlementInput',
        )
      ).errors[0].message,
      /UNAUTHORIZED/,
    );
    assert.match(
      (await command('deleteSettlement', group, randomUUID())).errors[0].message,
      /UNAUTHORIZED/,
    );
    cookie = process.env.TEST_USER_COOKIE;
    const before = structuredClone(group);
    group = result(await command('saveExpense', group, input, 'ExpenseInput'), 'saveExpense');
    assert.equal(
      group.expenses[0].shares.reduce((n, s) => n + s.amount, 0),
      600001,
    );
    assert.equal(
      group.simplifiedDebts.reduce((n, d) => n + d.amount, 0),
      450000,
    );
    const summary = result(
      await request(
        'query { dashboard { payable receivable outgoing { groupId personName amount } incoming {groupId amount} groups {groupId memberId payable receivable} } }',
      ),
      'dashboard',
    );
    const own = summary.groups.find((x) => x.groupId === group.id);
    assert.equal(own.memberId, members[1].id);
    assert.equal(own.payable, 150000);
    assert.equal(own.receivable, 0);
    assert.equal(summary.outgoing.find((x) => x.groupId === group.id).personName, members[0].name);
    assert.equal(
      summary.outgoing.reduce((n, x) => n + x.amount, 0),
      summary.payable,
    );
    assert.equal(
      summary.incoming.reduce((n, x) => n + x.amount, 0),
      summary.receivable,
    );
    assert.ok(
      group.members.every((m) => m.email === null),
      'Signed-in non-admin cannot read roster emails',
    );
    const profile = result(
      await request('query($t:String!){group(token:$t){viewerMemberId}}', { t: group.token }),
      'group',
    );
    assert.equal(profile.viewerMemberId, members[1].id);
    const repeated = await command('saveExpense', before, input, 'ExpenseInput');
    assert.match(repeated.errors[0].message, /CONFLICT/);
    const invalid = { ...input, id: randomUUID(), payerId: randomUUID() };
    assert.match(
      (await command('saveExpense', group, invalid, 'ExpenseInput')).errors[0].message,
      /không thuộc nhóm/,
    );
    const noParticipants = { ...input, id: randomUUID(), participantIds: [] };
    assert.ok((await command('saveExpense', group, noParticipants, 'ExpenseInput')).errors);
    const originalExpenseOrder = group.expenses[0].createdOrder;
    const debt = group.simplifiedDebts[0];
    const payment = {
      id: randomUUID(),
      fromId: debt.fromId,
      toId: debt.toId,
      amount: 50000,
      date: '2026-11-02',
      note: 'Trả một phần',
    };
    group = result(
      await command('saveSettlement', group, payment, 'SettlementInput'),
      'saveSettlement',
    );
    assert.equal(group.settlements.length, 1);
    const paymentOrder = group.settlements[0].createdOrder;
    assert.ok(
      BigInt(paymentOrder) > BigInt(originalExpenseOrder),
      'Repayment shares the creation-order sequence',
    );
    assert.equal(
      group.simplifiedDebts.reduce((n, d) => n + d.amount, 0),
      400000,
    );
    group = result(
      await command('saveSettlement', group, { ...payment, amount: 70000 }, 'SettlementInput'),
      'saveSettlement',
    );
    assert.equal(group.settlements.length, 1, 'Stable ID updates rather than duplicates');
    assert.equal(
      group.settlements[0].createdOrder,
      paymentOrder,
      'Editing a repayment preserves its input order',
    );
    assert.equal(
      group.simplifiedDebts.reduce((n, d) => n + d.amount, 0),
      380000,
    );
    group = result(await command('deleteSettlement', group, payment.id), 'deleteSettlement');
    assert.equal(
      group.simplifiedDebts.reduce((n, d) => n + d.amount, 0),
      450000,
    );
    group = result(
      await command(
        'saveExpense',
        group,
        { ...input, amount: 800000, participantIds: members.slice(0, 2).map((m) => m.id) },
        'ExpenseInput',
      ),
      'saveExpense',
    );
    assert.equal(group.expenses.length, 1);
    assert.equal(
      group.expenses[0].createdOrder,
      originalExpenseOrder,
      'Editing an expense preserves its input order',
    );
    assert.equal(group.expenses[0].shares.length, 2);
    assert.equal(
      group.simplifiedDebts.reduce((n, d) => n + d.amount, 0),
      400000,
    );
    group = result(
      await command(
        'saveExpense',
        group,
        { ...input, amount: 5_000_000_000, participantIds: members.slice(0, 2).map((m) => m.id) },
        'ExpenseInput',
      ),
      'saveExpense',
    );
    assert.equal(
      group.expenses[0].amount,
      5_000_000_000,
      'Money scalar supports values above 32-bit Int',
    );
    assert.equal(
      group.simplifiedDebts.reduce((n, d) => n + d.amount, 0),
      2_500_000_000,
    );
    assert.ok(
      (await command('saveExpense', group, { ...input, amount: 1.5 }, 'ExpenseInput')).errors,
      'Fractional VND rejected at the API boundary',
    );
    group = result(await command('deleteExpense', group, input.id), 'deleteExpense');
    assert.equal(group.simplifiedDebts.length, 0);
    const activity = result(
      await request(
        'query($token:String!){activity(token:$token){id action summary actorName createdAt entityId}}',
        { token: group.token },
        false,
      ),
      'activity',
    );
    assert.ok(activity.some((event) => event.action === 'delete_expense'));
    assert.ok(activity.some((event) => event.action === 'save_expense'));
    assert.ok(!JSON.stringify(activity).includes('@example.com'));
    cookie = process.env.TEST_ADMIN_COOKIE;
    group = result(await command('rotateLink', group), 'rotateLink');
    assert.notEqual(group.token, originalToken);
    assert.equal(group.token.length, 8);
    assert.equal(group.token, group.id);
    assert.ok(
      (await request('query($t:String!){group(token:$t){id}}', { t: originalToken }, false)).errors,
    );
    const forbiddenOrigin = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.example' },
      body: JSON.stringify({ query: '{ groups { id } }' }),
    });
    assert.equal(forbiddenOrigin.status, 403);
    console.log('Verified workflow against the real Rust API and DynamoDB.');
});

test('Signed-in accounts are creators by default and admins can revoke elevated access', async () => {
  const grantQuery =
    'mutation($email:String!,$role:String){setAccessGrant(email:$email,role:$role)}';
  const email = process.env.TEST_MEMBER_EMAIL;
  cookie = process.env.TEST_USER_COOKIE;
  assert.match((await request('{accessGrants{email role}}')).errors[0].message, /FORBIDDEN/);
  assert.match(
    (await request(grantQuery, { email, role: 'admin' })).errors[0].message,
    /FORBIDDEN/,
  );
  cookie = process.env.TEST_ADMIN_COOKIE;
  const accountQuery = '{accessGrants{email role hasExplicitGrant}}';
  assert.deepEqual(
    result(await request(accountQuery), 'accessGrants').find((account) => account.email === email),
    { email, role: 'creator', hasExplicitGrant: false },
  );
  let group;
  try {
    cookie = process.env.TEST_USER_COOKIE;
    let me = result(await request('{me{isAdmin canCreateGroups}}'), 'me');
    assert.deepEqual(me, { isAdmin: false, canCreateGroups: true });
    group = result(
      await request(`mutation($input:CreateGroupInput!){createGroup(input:$input){${fields}}}`, {
        input: {
          name: 'Creator test ' + randomUUID(),
          description: 'test-run:' + process.env.TEST_RUN_ID,
          members: [{ id: randomUUID(), name: 'Creator', email }],
        },
      }),
      'createGroup',
    );
    cookie = process.env.TEST_ADMIN_COOKIE;
    const outsiderExpense = {
      id: randomUUID(), title: 'Denied', amount: 1, payerId: group.members[0].id,
      participantIds: [group.members[0].id], date: '2026-11-02', note: '',
    };
    const outsiderSettlement = {
      id: randomUUID(), fromId: group.members[0].id, toId: randomUUID(),
      amount: 1, date: '2026-11-02', note: '',
    };
    for (const [action, input, type] of [
      ['saveExpense', outsiderExpense, 'ExpenseInput'],
      ['deleteExpense', outsiderExpense.id],
      ['saveSettlement', outsiderSettlement, 'SettlementInput'],
      ['deleteSettlement', outsiderSettlement.id],
      ['updateGroup', { name: group.name, description: '', members: group.members }, 'UpdateGroupInput'],
      ['rotateLink'],
    ]) {
      assert.match((await command(action, group, input, type)).errors[0].message, /FORBIDDEN/);
    }
    cookie = process.env.TEST_USER_COOKIE;
    assert.match((await command('rotateLink', group)).errors[0].message, /FORBIDDEN/);
    assert.match(
      (await request(grantQuery, { email, role: 'admin' })).errors[0].message,
      /FORBIDDEN/,
    );
    cookie = process.env.TEST_ADMIN_COOKIE;
    result(
      await request(grantQuery, { email: ' ' + email.toUpperCase() + ' ', role: 'admin' }),
      'setAccessGrant',
    );
    cookie = process.env.TEST_USER_COOKIE;
    me = result(await request('{me{isAdmin canCreateGroups}}'), 'me');
    assert.deepEqual(me, { isAdmin: true, canCreateGroups: true });
    assert.ok(
      result(await request('{accessGrants{email role}}'), 'accessGrants').some(
        (g) => g.email === email && g.role === 'admin',
      ),
    );
    assert.match(
      (await request(grantQuery, { email: 'thuthao.cse@gmail.com', role: null })).errors[0].message,
      /quản trị gốc/,
    );
    cookie = process.env.TEST_ADMIN_COOKIE;
    result(await request(grantQuery, { email, role: null }), 'setAccessGrant');
    cookie = process.env.TEST_USER_COOKIE;
    assert.deepEqual(result(await request('{me{isAdmin canCreateGroups}}'), 'me'), {
      isAdmin: false,
      canCreateGroups: true,
    });
    assert.match((await command('rotateLink', group)).errors[0].message, /FORBIDDEN/);
    cookie = process.env.TEST_ADMIN_COOKIE;
    assert.deepEqual(
      result(await request(accountQuery), 'accessGrants').find((account) => account.email === email),
      { email, role: 'creator', hasExplicitGrant: false },
    );
  } finally {
    cookie = process.env.TEST_ADMIN_COOKIE;
    result(await request(grantQuery, { email, role: null }), 'setAccessGrant');
  }
});

test('Account home keeps debts across groups separate and ignores guest viewing identity', async () => {
  cookie = process.env.TEST_ADMIN_COOKIE;
  const roster = [
    { id: randomUUID(), name: 'Tôi', email: process.env.TEST_MEMBER_EMAIL },
    { id: randomUUID(), name: 'Bạn cùng nhóm', email: randomUUID() + '@example.com' },
  ];
  const fixtures = [];
  try {
    for (const [index, amount, payer] of [
      [0, 400, 1],
      [1, 800, 0],
    ]) {
      cookie = process.env.TEST_ADMIN_COOKIE;
      const groupRoster = roster.map((m) => ({ ...m, id: randomUUID() }));
      let group = result(
        await request(`mutation($input:CreateGroupInput!){createGroup(input:$input){${fields}}}`, {
          input: {
            name: 'Home test ' + randomUUID(),
            description: 'test-run:' + process.env.TEST_RUN_ID,
            members: groupRoster,
          },
        }),
        'createGroup',
      );
      cookie = process.env.TEST_USER_COOKIE;
      group = result(
        await command(
          'saveExpense',
          group,
          {
            id: randomUUID(),
            title: 'Shared',
            amount,
            payerId: groupRoster[payer].id,
            participantIds: groupRoster.map((m) => m.id),
            date: '2026-11-01',
            note: '',
          },
          'ExpenseInput',
        ),
        'saveExpense',
      );
      fixtures[index] = group;
    }
    const query =
      'query { dashboard { payable receivable outgoing {groupId personName amount} incoming {groupId personName amount} groups {groupId memberId payable receivable} } }';
    let summary = result(await request(query), 'dashboard');
    assert.equal(summary.payable, 200);
    assert.equal(summary.receivable, 400, 'Do not net the two groups to a single 200 receivable');
    assert.equal(summary.outgoing[0].personName, 'Bạn cùng nhóm');
    assert.equal(summary.incoming[0].personName, 'Bạn cùng nhóm');
    const publicView = result(
      await request(
        'query($t:String!){group(token:$t){viewerMemberId members{id email}}}',
        { t: fixtures[0].token },
        false,
      ),
      'group',
    );
    assert.equal(publicView.viewerMemberId, null);
    assert.ok(publicView.members.every((m) => m.email === null));
    const rename = await command(
      'updateGroup',
      fixtures[0],
      { name: 'Impersonate', description: '', members: roster },
      'UpdateGroupInput',
    );
    assert.match(rename.errors[0].message, /FORBIDDEN/);
    const callback = await fetch(
      url.replace('/graphql', '/auth/google/callback?state=invalid&code=invalid'),
      { redirect: 'manual' },
    );
    assert.equal(callback.status, 303);
    assert.equal(callback.headers.get('location'), '/?auth_error=failed');
    result(await request('mutation { logout }'), 'logout');
    cookie = process.env.TEST_USER_COOKIE;
    assert.match(
      (await request('query {groups{id}}')).errors[0].message,
      /UNAUTHORIZED/,
      'Logout invalidates the server session',
    );
  } finally {
    cookie = process.env.TEST_ADMIN_COOKIE;
  }
});
