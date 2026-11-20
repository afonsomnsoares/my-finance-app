const YahooFinance = require('yahoo-finance2').default;

const { logger } = require('./logger');

const yahooFinance = new YahooFinance({
  fetchOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  },
  queue: { concurrency: 2, interval: 500 },
  suppressNotices: ['yahooSurvey'],
});

function normalizeQuoteCurrency(currency, price) {
  const code = String(currency || 'USD');
  // Yahoo reports some London prices in pence.
  if (code === 'GBp' || code === 'GBX') {
    return {
      currency: 'GBP',
      price: price == null ? null : Number(price) / 100,
      scale: 0.01,
    };
  }
  return { currency: code, price: price == null ? null : Number(price), scale: 1 };
}

async function getQuote(symbol) {
  try {
    const result = await yahooFinance.quote(symbol);
    if (!result) return null;
    const marketPrice = result.regularMarketPrice;
    const previousClose = result.regularMarketPreviousClose;
    const change = result.regularMarketChange;
    const normalized = normalizeQuoteCurrency(result.currency || 'USD', marketPrice);
    const previous = normalizeQuoteCurrency(result.currency || 'USD', previousClose);
    return {
      symbol: result.symbol,
      requestedSymbol: symbol,
      name: result.shortName || result.longName || result.symbol,
      price: Number.isFinite(normalized.price) ? normalized.price : null,
      previousClose: Number.isFinite(previous.price) ? previous.price : null,
      change: change == null || !Number.isFinite(Number(change))
        ? null
        : Number(change) * normalized.scale,
      changePercent: result.regularMarketChangePercent,
      currency: normalized.currency,
    };
  } catch (error) {

    logger.warn({ symbol, err: error.message }, 'yahoo_quote_failed');
    return null;
  }
}

const SEARCH_ALLOWED = ['EQUITY', 'ETF', 'CRYPTOCURRENCY', 'COMMODITY', 'MUTUALFUND', 'INDEX'];
const SEARCH_TYPE_MAP = { CRYPTOCURRENCY: 'crypto', EQUITY: 'stock', ETF: 'etf', COMMODITY: 'commodity' };

async function searchSymbols(q) {
  let result;
  try {
    result = await yahooFinance.search(q, { quotesCount: 8, newsCount: 0 });
  } catch (error) {
    logger.warn({ err: error.message }, 'yahoo_search_failed');
    return [];
  }

  return (result.quotes || [])
    .filter((item) => item.symbol && SEARCH_ALLOWED.includes(item.quoteType))
    .map((item) => ({
      symbol: item.symbol,
      name: item.shortname || item.longname || item.symbol,
      exchange: item.exchange || '',
      type: SEARCH_TYPE_MAP[item.quoteType] || 'stock',
    }));
}

module.exports = { getQuote, searchSymbols, normalizeQuoteCurrency };
