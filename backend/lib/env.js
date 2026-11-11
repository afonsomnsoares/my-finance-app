const path = require('path');

// Resolved from this file, not the working directory: `npm start` at the repo
// root runs `node backend/server.js`, where a cwd-relative lookup found no .env.
// Variables already set in the environment still win.
// The integration suite sets these before importing the app. Keep them so a
// later .env.local load cannot point the suite at the real database.
const pinnedDatabaseUrl = process.env.DB_SCHEMA
  ? {
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    }
  : null;

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
// Neon writes the live connection strings to the repo-root .env.local.
// DATABASE_URL is the pooled URL used for application queries.
require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env.local'),
  override: true,
  quiet: true,
});

if (pinnedDatabaseUrl) {
  for (const key of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED']) {
    if (pinnedDatabaseUrl[key]) process.env[key] = pinnedDatabaseUrl[key];
  }
}

const { z } = require('zod');

/*
 * Every secret this app needs is read here, once, and validated at boot.
 * A missing or weak SESSION_SECRET is a silent security hole — it must stop
 * the process, not degrade quietly to a default.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.').refine(
    (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
    'DATABASE_URL must be a PostgreSQL connection string.'
  ),
  DATABASE_URL_UNPOOLED: z.string().optional(),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 48'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001'),
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

/*
 * Render sets RENDER_EXTERNAL_URL to the public https address. The phone
 * loads the site from that origin, so API calls must be allowed there
 * without pasting the address into CORS_ORIGIN after the first deploy.
 */
const corsOrigins = [
  ...env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  process.env.RENDER_EXTERNAL_URL,
].filter(Boolean);

module.exports = {
  ...env,
  isProd: env.NODE_ENV === 'production',
  corsOrigins,
};
