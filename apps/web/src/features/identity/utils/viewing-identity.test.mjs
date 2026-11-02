import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewingIdentity } from './viewing-identity.mjs';
test('signed-in perspective uses verified membership and never a saved guest identity', () => {
  const group = {
    viewerMemberId: 'account-member',
    members: [{ id: 'account-member' }, { id: 'guest-choice' }],
  };
  assert.equal(viewingIdentity(group, true, 'guest-choice'), 'account-member');
  assert.equal(viewingIdentity({ ...group, viewerMemberId: null }, true, 'guest-choice'), '');
});
test('guest perspective restores only a member still present in the group', () => {
  const group = { viewerMemberId: null, members: [{ id: 'guest-choice' }] };
  assert.equal(viewingIdentity(group, false, 'guest-choice'), 'guest-choice');
  assert.equal(viewingIdentity(group, false, 'removed-member'), '');
});
