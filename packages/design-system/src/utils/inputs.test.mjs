import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMoneyInput, parseMoneyInput, caretAfterDigits, searchKey } from './inputs.mjs';
test('amount entry groups thousands with commas without changing integer VND', () => {
  assert.equal(formatMoneyInput(20000), '20,000');
  assert.equal(formatMoneyInput(1200000), '1,200,000');
  assert.equal(parseMoneyInput('1,200,000'), 1200000);
  assert.equal(parseMoneyInput('1.200.000 ₫'), 1200000);
  assert.equal(parseMoneyInput(''), 0);
  assert.equal(parseMoneyInput('-20,000'), null);
  assert.equal(parseMoneyInput('1000000000001'), null);
  assert.equal(caretAfterDigits('1,234,567', 4), 5);
});
test('member search ignores Vietnamese accents and case', () => {
  assert.ok(searchKey('Nguyễn Đình Thảo').includes(searchKey('nguyen dinh')));
  assert.equal(searchKey('  THẢO LÊ  '), 'thao le');
});
