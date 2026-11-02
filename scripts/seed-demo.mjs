import { randomUUID } from 'node:crypto';
const endpoint = process.env.API_URL || 'http://localhost:8080/graphql';
let cookie = process.env.SESSION_COOKIE || '';
if (!cookie)
  throw Error('Set SESSION_COOKIE to a signed-in admin session for this local seed command.');
async function query(query, variables = {}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  const session = response.headers.get('set-cookie');
  if (session) cookie = session.split(';')[0];
  const body = await response.json();
  if (body.errors) throw Error(body.errors[0].message);
  return body.data;
}
const existing = (await query('{groups{id name token archived}}')).groups.find(
  (g) => g.name === 'Đà Lạt cuối tuần' && !g.archived,
);
if (existing) {
  console.log('Nhóm demo: http://localhost:3000/g/' + existing.token);
  process.exit(0);
}
const members = ['Linh Nguyễn', 'Minh Trần', 'An Phạm', 'Thảo Lê'].map((name, i) => ({
  id: randomUUID(),
  name,
  email: ['linh', 'minh', 'an', 'thao'][i] + '@example.com',
}));
let group = (
  await query(
    'mutation($input:CreateGroupInput!){createGroup(input:$input){id name token version}}',
    {
      input: {
        name: 'Đà Lạt cuối tuần',
        description: 'Dữ liệu mẫu để thử giao diện. Không phải giao dịch thật.',
        members,
      },
    },
  )
).createGroup;
const records = [
  ['Homestay', 1200000, 1, [0, 1, 2, 3]],
  ['Ăn tối', 600000, 0, [0, 1, 2, 3]],
  ['Cà phê', 120000, 2, [0, 2]],
  ['Taxi', 240000, 3, [0, 1, 2, 3]],
  ['Vé tham quan', 180000, 1, [1, 3]],
  ['Bánh mì', 60000, 0, [0, 1, 2, 3]],
];
for (const [title, amount, payer, participants] of records) {
  group = (
    await query(
      'mutation($token:String!,$version:Int!,$input:ExpenseInput!){saveExpense(token:$token,version:$version,input:$input){id token version}}',
      {
        token: group.token,
        version: group.version,
        input: {
          id: randomUUID(),
          title,
          amount,
          payerId: members[payer].id,
          date: '2026-11-02',
          note: 'Dữ liệu mẫu',
          participantIds: participants.map((i) => members[i].id),
        },
      },
    )
  ).saveExpense;
}
console.log('Nhóm demo: http://localhost:3000/g/' + group.token);
