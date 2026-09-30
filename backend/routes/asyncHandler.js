/*
 * Express 5 forwards rejected promises to the error handler on its own, but
 * wrapping is explicit and survives anyone reading this without knowing that.
 */
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
