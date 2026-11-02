import { execFileSync } from 'node:child_process';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
const user = randomUUID(),
  session = randomBytes(32).toString('hex');
const hash = createHash('sha256').update(session).digest('hex');
const sql = (input) =>
  execFileSync(
    'docker',
    ['compose', 'exec', '-T', 'db', 'psql', '-U', 'lilac', '-d', 'lilac', '-v', 'ON_ERROR_STOP=1'],
    { input, stdio: ['pipe', 'ignore', 'pipe'] },
  );
const query = async (query, variables = {}) => {
  const response = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: 'lilac_session=' + session },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (body.errors) throw Error(body.errors[0].message);
  return body.data;
};
try {
  sql(
    `INSERT INTO users(id,google_subject,email,name) VALUES('${user}','sample-seed-${user}','thuthao.cse@gmail.com','Local sample seed'); INSERT INTO user_sessions(token_hash,user_id,expires_at) VALUES('${hash}','${user}',now()+interval '10 minutes');`,
  );
  const existing = (await query('{groups{name token description}}')).groups;
  for (const [name, amount, payer, date] of [
    ['Mẫu · Chuyến đi Đà Lạt', 600000, 1, '2026-11-01'],
    ['Mẫu · Bữa tối cuối tuần', 900000, 0, '2026-11-02'],
  ]) {
    const prior = existing.find(
      (g) => g.name === name && g.description === 'Dữ liệu mẫu minh họa công nợ trên trang chủ.',
    );
    if (prior) {
      console.log(name + ': http://localhost:3000/g/' + prior.token);
      continue;
    }
    const members = [
      ['Trịnh Thị Thu Thảo', 'thuthao.cse@gmail.com'],
      ['Linh Nguyễn', 'linh.demo@example.com'],
      ['Minh Trần', 'minh.demo@example.com'],
    ].map(([name, email]) => ({ id: randomUUID(), name, email }));
    let g = (
      await query('mutation($input:CreateGroupInput!){createGroup(input:$input){token version}}', {
        input: { name, description: 'Dữ liệu mẫu minh họa công nợ trên trang chủ.', members },
      })
    ).createGroup;
    g = (
      await query(
        'mutation($t:String!,$v:Int!,$input:ExpenseInput!){saveExpense(token:$t,version:$v,input:$input){token version}}',
        {
          t: g.token,
          v: g.version,
          input: {
            id: randomUUID(),
            title: payer === 0 ? 'Bữa tối cả nhóm' : 'Tiền homestay',
            amount,
            payerId: members[payer].id,
            date,
            note: 'Dữ liệu mẫu để xem UI; không phải giao dịch thật.',
            participantIds: members.map((m) => m.id),
          },
        },
      )
    ).saveExpense;
    console.log(name + ': http://localhost:3000/g/' + g.token);
  }
  const dashboard = (await query('{dashboard{payable receivable}}')).dashboard;
  console.log('Tổng cần trả / được nhận:', dashboard.payable, dashboard.receivable);
} finally {
  sql(
    `DELETE FROM user_sessions WHERE user_id='${user}'; UPDATE activity_events SET actor_user_id=NULL WHERE actor_user_id='${user}'; DELETE FROM users WHERE id='${user}';`,
  );
}
