// Trusted local database fixtures, never an application login endpoint.
import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
const run = randomUUID();
const users = [randomUUID(), randomUUID()];
const sessions = users.map(() => randomBytes(32).toString('hex'));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const sql = (input) =>
  execFileSync(
    'docker',
    ['compose', 'exec', '-T', 'db', 'psql', '-U', 'lilac', '-d', 'lilac', '-v', 'ON_ERROR_STOP=1'],
    { input, stdio: ['pipe', 'ignore', 'pipe'] },
  );
if (
  process.env.API_URL &&
  !/^http:\/\/(localhost|127\.0\.0\.1):8080\/graphql$/.test(process.env.API_URL)
)
  throw Error('Fixtures run only against the local Compose database/API');
try {
  sql(`INSERT INTO users(id,google_subject,email,name) VALUES
    ('${users[0]}','test-${run}-admin','thuthao.cse@gmail.com','Test admin'),
    ('${users[1]}','test-${run}-user','member-${run}@example.com','Test member');
    INSERT INTO user_sessions(token_hash,user_id,expires_at) VALUES
    ('${hash(sessions[0])}','${users[0]}',now()+interval '10 minutes'),
    ('${hash(sessions[1])}','${users[1]}',now()+interval '10 minutes');`);
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
  sql(
    `BEGIN; DELETE FROM activity_events WHERE group_id IN (SELECT id FROM groups WHERE description='test-run:${run}'); DELETE FROM expenses WHERE group_id IN (SELECT id FROM groups WHERE description='test-run:${run}'); DELETE FROM settlements WHERE group_id IN (SELECT id FROM groups WHERE description='test-run:${run}'); DELETE FROM groups WHERE description='test-run:${run}'; DELETE FROM role_grant_events WHERE actor_user_id IN ('${users[0]}','${users[1]}'); DELETE FROM role_grants WHERE granted_by IN ('${users[0]}','${users[1]}'); DELETE FROM user_sessions WHERE user_id IN ('${users[0]}','${users[1]}'); UPDATE activity_events SET actor_user_id=NULL WHERE actor_user_id IN ('${users[0]}','${users[1]}'); DELETE FROM users WHERE id IN ('${users[0]}','${users[1]}'); COMMIT;`,
  );
}
