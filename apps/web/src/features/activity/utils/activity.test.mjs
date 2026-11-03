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

test('activity includes group changes by Ho Chi Minh date and newest event first', () => {
  const entries = activityEntries(
    { expenses: [], settlements: [] },
    [
      { id: 'older', createdAt: '2026-11-02T01:00:00Z' },
      { id: 'newer', createdAt: '2026-11-02T02:00:00Z' },
    ],
  );
  assert.deepEqual(
    entries.map((entry) => [entry.id, entry.date]),
    [
      ['event:newer', '2026-11-02'],
      ['event:older', '2026-11-02'],
    ],
  );
});

test('expense creation audit enriches the transaction row instead of duplicating it', () => {
  const entries = activityEntries(
    {
      expenses: [{ id: 'expense-1', date: '2026-11-02', createdOrder: '1' }],
      settlements: [],
    },
    [
      {
        id: 'event-1',
        action: 'save_expense',
        summary: 'Thêm khoản chi Dinner',
        entityId: 'expense-1',
        createdAt: '2026-11-02T02:00:00Z',
      },
    ],
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].createdEvent.id, 'event-1');
});
