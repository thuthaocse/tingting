import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debtBetween, selectParticipant } from './participants.mjs';

test('selecting the other participant swaps payer and recipient in either direction', () => {
  const participants = { from: 'a', to: 'b' };
  assert.deepEqual(selectParticipant(participants, 'from', 'b'), { from: 'b', to: 'a' });
  assert.deepEqual(selectParticipant(participants, 'to', 'a'), { from: 'b', to: 'a' });
});

test('finds the outstanding debt only in the selected direction', () => {
  const debts = [{ fromId: 'a', toId: 'b', amount: 120000 }];
  assert.equal(debtBetween(debts, 'a', 'b'), 120000);
  assert.equal(debtBetween(debts, 'b', 'a'), 0);
  assert.equal(debtBetween(debts, 'a', 'c'), 0);
});

test('selecting a different member leaves the other participant unchanged', () => {
  assert.deepEqual(selectParticipant({ from: 'a', to: 'b' }, 'from', 'c'), { from: 'c', to: 'b' });
  assert.deepEqual(selectParticipant({ from: 'a', to: 'b' }, 'to', 'c'), { from: 'a', to: 'c' });
});
