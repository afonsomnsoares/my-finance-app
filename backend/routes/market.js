const express = require('express');

const { getQuote, searchSymbols } = require('../lib/market');
const validate = require('../middleware/validate');
const { marketLimiter } = require('../middleware/rateLimit');
const schemas = require('../schemas');
const ah = require('./asyncHandler');

const router = express.Router();

router.use(marketLimiter);

const TICKER_SYMBOLS = ['NVDA', 'MSFT', 'AVGO', 'LMT', 'RTX', 'LLY', 'JNJ', 'CEG', 'CCJ', 'TSLA', 'ISRG', 'GEV', 'BTC-USD', 'ETH-USD'];

router.get('/quotes', validate({ query: schemas.marketQuotesQuery }), ah(async (req, res) => {
  const list = req.validatedQuery.symbols ?? TICKER_SYMBOLS;
  const results = await Promise.allSettled(list.map((s) => getQuote(s)));
  res.json(results.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value));
}));

router.get('/prices', validate({ query: schemas.marketPricesQuery }), ah(async (req, res) => {
  const list = req.validatedQuery.symbols;
  if (!list || list.length === 0) return res.json({});

  const results = await Promise.allSettled(list.map((s) => getQuote(s)));
  const prices = {};
  results.forEach((r) => {
    if (r.status === 'fulfilled' && r.value) prices[r.value.symbol] = r.value;
  });
  res.json(prices);
}));

router.get('/search', validate({ query: schemas.marketSearchQuery }), ah(async (req, res) => {
  res.json(await searchSymbols(req.validatedQuery.q));
}));

module.exports = router;
