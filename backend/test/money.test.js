const test = require('node:test');
const assert = require('node:assert/strict');

const { sumExpenses, sumIncome, savingsRate } = require('../lib/money');

test('income and expenses in the same month stay separate', () => {
  const rows = [
    { kind: 'expense', amount: 40.1, category: 'Renda' },
    { kind: 'income', amount: 100, category: 'Rendimento' },
    { kind: 'expense', amount: 10.2, category: 'Alimentação' },
    { amount: 0.2, category: 'Outros' },
  ];

  assert.equal(sumExpenses(rows), 50.5);
  assert.equal(sumIncome(rows), 100);
  assert.equal(savingsRate(100, 50.5), 50);
});

test('spending more than income is a negative savings rate', () => {
  assert.equal(savingsRate(80, 100), -25);
  assert.equal(savingsRate(0, 40), 0);
});
