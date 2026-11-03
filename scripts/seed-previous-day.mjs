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
let group = (
  await query(
    '{groups{id name token version members{id name} expenses{id title date note createdOrder}}}',
  )
).groups.find((group) => group.name === 'Đà Lạt cuối tuần');
if (!group) throw Error('Không tìm thấy nhóm demo Đà Lạt cuối tuần');
const note = 'Dữ liệu mẫu ngày 01/11 để xem nhóm ngày';
for (const [title, amount, payerName] of [
  ['Ăn sáng', 80000, 'Thảo Lê'],
  ['Gửi xe', 20000, 'Minh Trần'],
]) {
  if (
    group.expenses.some(
      (expense) =>
        expense.date === '2026-11-01' && expense.title === title && expense.note === note,
    )
  )
    continue;
  const payer = group.members.find((member) => member.name === payerName) || group.members[0];
  group = (
    await query(
      'mutation($t:String!,$v:Int!,$i:ExpenseInput!){saveExpense(token:$t,version:$v,input:$i){id name token version members{id name} expenses{id title date note createdOrder}}}',
      {
        t: group.token,
        v: group.version,
        i: {
          id: randomUUID(),
          title,
          amount,
          payerId: payer.id,
          date: '2026-11-01',
          note,
          participantIds: group.members.map((member) => member.id),
        },
      },
    )
  ).saveExpense;
}
const previous = group.expenses
  .filter((expense) => expense.date === '2026-11-01')
  .sort((a, b) => (BigInt(a.createdOrder) > BigInt(b.createdOrder) ? -1 : 1));
console.log(
  'Đã thêm mục ngày 01/11/2026 trong nhóm ' +
    group.name +
    ': ' +
    previous.map((expense) => expense.title).join(', '),
);
