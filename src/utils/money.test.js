import { describe, test, expect } from 'vitest';
import { addMoney, roundMoney, sumAmounts, sumMoneyProducts, sumNumbers } from './money';

describe('money cents helpers', () => {
  test('sumAmounts avoids 0.1 + 0.2 float residue', () => {
    expect(sumAmounts([{ amount: 0.1 }, { amount: 0.2 }])).toBe(0.3);
  });

  test('addMoney and sumNumbers stay on the cent', () => {
    expect(addMoney(10.1, 0.2, 0.05)).toBe(10.35);
    expect(sumNumbers([0.1, 0.2, 0.3])).toBe(0.6);
  });

  test('sumMoneyProducts rounds each line before aggregating', () => {
    expect(sumMoneyProducts(
      [{ amount: 0.1, buyPrice: 0.1 }, { amount: 2, buyPrice: 1.005 }],
      'amount',
      'buyPrice'
    )).toBe(2.02);
  });

  test('roundMoney snaps to two decimals', () => {
    expect(roundMoney(25.509)).toBe(25.51);
  });
});
