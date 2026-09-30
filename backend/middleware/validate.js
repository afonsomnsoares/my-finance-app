const { ZodError } = require('zod');
const { securityEvent } = require('../lib/logger');

/*
 * Validation middleware. Parses `body`, `query` and `params` against Zod
 * schemas and — this is the part that matters — replaces the request data
 * with the *parsed* result. Handlers downstream therefore receive coerced,
 * trimmed, bounded values rather than whatever arrived on the wire.
 *
 * Express 5 exposes `req.query` as a getter, so the parsed query is exposed
 * as `req.validatedQuery` instead of being assigned back.
 */
function validate({ body, query, params }) {
  return (req, res, next) => {
    try {
      if (params) req.params = params.parse(req.params);
      if (query) req.validatedQuery = query.parse(req.query);
      if (body) req.body = body.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        securityEvent(req, 'validation_failed', {
          issues: error.issues.map((i) => ({ path: i.path.join('.'), code: i.code })),
        });
        // Say which field is wrong and why, but never echo the value back.
        return res.status(400).json({
          error: 'Invalid request.',
          details: error.issues.map((i) => ({
            field: i.path.join('.') || '(root)',
            message: i.message,
          })),
        });
      }
      next(error);
    }
  };
}

module.exports = validate;
