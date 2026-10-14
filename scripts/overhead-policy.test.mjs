import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectOverhead } from '../assets/overhead-policy.mjs';

test('valid measured overhead is retained below MR/MRL recommendations', () => {
  for (const type of ['mr', 'mrl']) for (const value of [1, 2500, 3000, 3500, 3600, 3999, 4000, 4300, 6000]) {
    const result = inspectOverhead(value, type); assert(result.valid); assert.equal(result.value, value);
    assert.equal(!!result.warning, value < (type === 'mrl' ? 4000 : 3600));
    if (result.warning) assert.match(result.warning, /engineering review is required/);
  }
  assert.equal(inspectOverhead('3,050').value, 3050);
});
test('invalid overhead is rejected, never clamped or converted from a negative', () => {
  for (const value of ['', ' ', 0, -3000, '-3000', 6001, Infinity, NaN, null, undefined, {}, true, 'not-a-number', '3000mm']) {
    const result = inspectOverhead(value); assert.equal(result.valid, false, String(value)); assert(result.error); assert(!result.warning);
  }
});
