const { test } = require('node:test');
const assert = require('node:assert/strict');

const { resolveTransactionKind } = require('../lib/transactionKind');

test('explicit income wins', () => {
  assert.equal(resolveTransactionKind('income', 'Outros'), 'income');
});

test('Rendimento category becomes income even if kind is expense', () => {
  assert.equal(resolveTransactionKind('expense', 'Rendimento'), 'income');
  assert.equal(resolveTransactionKind(undefined, 'Rendimento', 'expense'), 'income');
});

test('normal expenses stay expenses', () => {
  assert.equal(resolveTransactionKind('expense', 'Alimentação'), 'expense');
  assert.equal(resolveTransactionKind(undefined, 'Alimentação', 'expense'), 'expense');
});
