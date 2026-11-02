import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = randomUUID();
const users = [randomUUID(), randomUUID()];
const sessions = users.map(() => randomBytes(32).toString('hex'));
const hash = (value) => createHash('sha256').update(value).digest('hex');
if (
  process.env.API_URL &&
  !/^http:\/\/(localhost|127\.0\.0\.1):8080\/graphql$/.test(process.env.API_URL)
)
  throw Error('Trusted fixtures require a local API');
const fixture = {
  format: 'tingting-postgres-v1',
  groups: [],
  members: [],
  expenses: [],
  expense_shares: [],
  settlements: [],
  activity_events: [],
  group_link_aliases: [],
  role_grants: [],
  role_grant_events: [],
  admins: [],
  users: users.map((id, index) => ({
    id,
    google_subject: `test-${run}-${index}`,
    email: index ? `member-${run}@example.com` : 'thuthao.cse@gmail.com',
    name: `Test ${index}`,
  })),
  user_sessions: users.map((id, index) => ({
    user_id: id,
    token_hash: hash(sessions[index]),
    expires_at: new Date(Date.now() + 600000).toISOString(),
  })),
};
const file = join(tmpdir(), `tingting-fixture-${run}.json`);
writeFileSync(file, JSON.stringify(fixture), { mode: 0o600 });
try {
  if (process.env.LOCAL_API_BINARY) {
    execFileSync(process.env.LOCAL_API_BINARY, ['--import', file], { stdio: 'inherit' });
  } else {
    execFileSync('docker', ['compose', 'cp', file, 'api:/tmp/fixture.json'], { stdio: 'inherit' });
    execFileSync(
      'docker',
      ['compose', 'exec', '-T', 'api', 'tingting-api', '--import', '/tmp/fixture.json'],
      { stdio: 'inherit' },
    );
  }
  const result = spawnSync(process.execPath, ['--test', 'scripts/integration.test.mjs'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      TEST_RUN_ID: run,
      TEST_ADMIN_COOKIE: `lilac_session=${sessions[0]}`,
      TEST_USER_COOKIE: `lilac_session=${sessions[1]}`,
      TEST_MEMBER_EMAIL: `member-${run}@example.com`,
    },
  });
  process.exitCode = result.status ?? 1;
} finally {
  unlinkSync(file);
}
