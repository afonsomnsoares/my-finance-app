const path = require('path');

// Resolved from this file, not the working directory: `npm start` at the repo
// root runs `node backend/server.js`, where a cwd-relative lookup found no .env.
// Variables already set in the environment still win.
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { z } = require('zod');

/*
 * Every secret this app needs is read here, once, and validated at boot.
 * A missing or weak SESSION_SECRET is a silent security hole — it must stop
 * the process, not degrade quietly to a default.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 48'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  // Comma-separated list of origins allowed to call the API with credentials.
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://127.0.0.1:3000'),
  // Postgres schema to run in. Only the integration tests set this, so they
  // never touch the real tables in `public`.
  DB_SCHEMA: z.string().regex(/^[a-z_][a-z0-9_]*$/, 'DB_SCHEMA must be a plain identifier.').optional(),
  // The zone months and days are counted in. See lib/dates.js.
  APP_TIMEZONE: z.string().default('Europe/Lisbon').refine((tz) => {
    try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
  }, 'APP_TIMEZONE must be an IANA zone name, e.g. Europe/Lisbon.'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Printed before the logger exists, and deliberately naming only the
  // variable and the rule it broke — never the value it currently holds.
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

/*
 * Pin the process to the app's zone before anything computes a date. Node
 * re-reads TZ when it is assigned, so every `new Date(y, m, 1)` after this
 * line means midnight in Lisbon, not midnight wherever the server runs.
 */
process.env.TZ = env.APP_TIMEZONE;

module.exports = {
  ...env,
  isProd: env.NODE_ENV === 'production',
  corsOrigins: env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
};
