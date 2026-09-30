const rateLimit = require('express-rate-limit');
const { securityEvent } = require('../lib/logger');

/*
 * Rate limits. Three tiers, because the endpoints differ in what abuse costs:
 *
 *  - login:  brute force protection. Strict, and counts only failures.
 *  - market: every call is an outbound request to Yahoo Finance. Left open,
 *            a script here turns into a bill (or a ban) upstream.
 *  - api:    a general ceiling so nothing else can be hammered.
 */
function onLimit(eventName) {
  return (req, res, _next, options) => {
    securityEvent(req, eventName, { limit: options.limit, windowMs: options.windowMs });
    res.status(options.statusCode).json({ error: options.message });
  };
}

const common = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

const apiLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: 'Too many requests. Please slow down.',
  handler: onLimit('rate_limit_api'),
});

const loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  // A correct password should not eat into the allowance; only failed
  // attempts count, which is what brute forcing actually produces.
  skipSuccessfulRequests: true,
  message: 'Too many login attempts. Try again in 15 minutes.',
  handler: onLimit('rate_limit_login'),
});

const marketLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 30,
  message: 'Too many market data requests. Please wait a moment.',
  handler: onLimit('rate_limit_market'),
});

const writeLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 60,
  message: 'Too many write requests. Please slow down.',
  handler: onLimit('rate_limit_write'),
});

module.exports = { apiLimiter, loginLimiter, marketLimiter, writeLimiter };
