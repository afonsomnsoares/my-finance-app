const { test } = require('node:test');
const assert = require('node:assert/strict');

const { normalizeQuoteCurrency } = require('../lib/market');

test('GBp quotes become GBP pounds', () => {
  const normalized = normalizeQuoteCurrency('GBp', 1540);
  assert.equal(normalized.currency, 'GBP');
  assert.equal(normalized.price, 15.4);
  assert.equal(normalized.scale, 0.01);
});

test('EUR quotes stay untouched', () => {
  const normalized = normalizeQuoteCurrency('EUR', 12.5);
  assert.equal(normalized.currency, 'EUR');
  assert.equal(normalized.price, 12.5);
  assert.equal(normalized.scale, 1);
});
