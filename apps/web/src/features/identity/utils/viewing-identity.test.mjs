import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewingIdentity } from './viewing-identity.mjs';
test('members use their verified identity instead of a saved viewing preference', () => {
  const group = {
    viewerMemberId: 'account-member',
    members: [{ id: 'account-member' }, { id: 'guest-choice' }],
  };
  assert.equal(viewingIdentity(group, true, 'guest-choice'), 'account-member');
  assert.equal(viewingIdentity({ ...group, viewerMemberId: null }, true, 'guest-choice'), 'guest-choice');
  assert.equal(viewingIdentity({ ...group, viewerMemberId: null }, true, 'removed-member'), '');
});
test('guest perspective restores only a member still present in the group', () => {
  const group = { viewerMemberId: null, members: [{ id: 'guest-choice' }] };
  assert.equal(viewingIdentity(group, false, 'guest-choice'), 'guest-choice');
  assert.equal(viewingIdentity(group, false, 'removed-member'), '');
});
