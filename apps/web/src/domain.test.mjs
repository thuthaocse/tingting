import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitEvenly, money } from './domain.mjs';
test('split preview conserves the remainder and uses stable member order', () => {
  assert.deepEqual(splitEvenly(10, ['c', 'b', 'a']), [
    { memberId: 'a', amount: 4 },
    { memberId: 'b', amount: 3 },
    { memberId: 'c', amount: 3 },
  ]);
});
test('split preview rejects fractional, unsafe and out-of-range amounts', () => {
  for (const amount of [0, -1, 1.5, NaN, Infinity, 1_000_000_000_001])
    assert.throws(() => splitEvenly(amount, ['a']));
});
test('split preview includes only selected people and rejects empty or duplicate selections', () => {
  assert.deepEqual(splitEvenly(600000, ['b', 'a']), [
    { memberId: 'a', amount: 300000 },
    { memberId: 'b', amount: 300000 },
  ]);
  assert.throws(() => splitEvenly(1, []));
  assert.throws(() => splitEvenly(1, ['a', 'a']));
});
test('Vietnamese currency formatting handles large integer VND amounts', () => {
  assert.match(money(5_000_000_000), /5\.000\.000\.000/);
  assert.match(money(150000), /150\.000/);
});
