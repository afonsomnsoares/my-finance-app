const { ZodError } = require('zod');
const { securityEvent } = require('../lib/logger');

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
