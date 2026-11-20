import { describe, expect, test } from 'vitest';
import { findQuote, normalizeMarketCurrency, portfolioView } from './helpers';

const eur = { name: 'EDP.LS', type: 'stock', amount: 10, buyPrice: 4, currency: 'EUR' };
const usd = { name: 'AAPL', type: 'stock', amount: 2, buyPrice: 100, currency: 'USD' };

describe('portfolio totals', () => {
  test('a missing quote or a different currency leaves the total unchanged', () => {
    const { groups, excluded } = portfolioView(
      [eur, usd, { name: 'MSFT', type: 'stock', amount: 1, buyPrice: 50, currency: 'EUR' }],
      {
        'EDP.LS': { price: 5, currency: 'EUR' },
        AAPL: { price: 120, currency: 'USD' },
        MSFT: { price: 80, currency: 'USD' },
      }
    );

    expect(excluded).toBe(1);
    expect(groups).toEqual([
      { currency: 'EUR', cost: 40, current: 50, pl: 10, count: 1 },
      { currency: 'USD', cost: 200, current: 240, pl: 40, count: 1 },
    ]);
  });

  test('without any comparable quote there is no combined total', () => {
    const { groups, excluded } = portfolioView([eur], {});
    expect(groups).toEqual([]);
    expect(excluded).toBe(1);
  });

  test('looks up quotes by requested symbol casing and normalizes GBp pence', () => {
    expect(normalizeMarketCurrency('GBp', 1234).currency).toBe('GBP');
    expect(normalizeMarketCurrency('GBp', 1234).price).toBe(12.34);
    expect(findQuote({ aapl: { price: 1, currency: 'USD' } }, 'AAPL').price).toBe(1);

    const { groups, excluded, enriched } = portfolioView(
      [{ name: 'VOD.L', type: 'stock', amount: 10, buyPrice: 1, currency: 'GBP' }],
      { 'VOD.L': { price: 1234, currency: 'GBp' } }
    );

    expect(excluded).toBe(0);
    expect(groups).toEqual([{ currency: 'GBP', cost: 10, current: 123.4, pl: 113.4, count: 1 }]);
    expect(enriched[0].currentPrice).toBe(12.34);
  });
});
