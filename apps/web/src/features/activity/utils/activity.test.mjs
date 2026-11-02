import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activityEntries } from './activity.mjs';
test('activity groups by transaction date, then actual insertion order across expenses and repayments', () => {
  const group = {
    expenses: [
      { id: 'z-old', date: '2026-11-02', createdOrder: '1' },
      { id: 'a-new', date: '2026-11-02', createdOrder: '4' },
      { id: 'older-day-input-last', date: '2026-11-01', createdOrder: '5' },
    ],
    settlements: [{ id: 'payment', date: '2026-11-02', createdOrder: '3' }],
  };
  assert.deepEqual(
    activityEntries(group).map((entry) => entry.id),
    ['a-new', 'payment', 'z-old', 'older-day-input-last'],
  );
  assert.deepEqual(
    group.expenses.map((expense) => expense.id),
    ['z-old', 'a-new', 'older-day-input-last'],
  );
});
