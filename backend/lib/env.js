const path = require('path');

const pinnedDatabaseUrl = process.env.DB_SCHEMA
  ? {
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
    }
  : null;

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

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
  CORS_ORIGIN: z.string().optional(),
  APP_TIMEZONE: z.string().default('Europe/Lisbon').refine((tz) => {
    try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
  }, 'APP_TIMEZONE must be an IANA zone name, e.g. Europe/Lisbon.'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {

  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

process.env.TZ = env.APP_TIMEZONE;

const LOCAL_CORS = 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001';
// Production must not inherit localhost defaults — that would let a local page
// call the live API with credentials. Prefer CORS_ORIGIN, then Render's URL.
const corsOriginSource = env.CORS_ORIGIN
  ?? (env.NODE_ENV === 'production' ? '' : LOCAL_CORS);

const corsOrigins = [
  ...corsOriginSource.split(',').map((o) => o.trim()),
  process.env.RENDER_EXTERNAL_URL,
].filter(Boolean);

module.exports = {
  ...env,
  isProd: env.NODE_ENV === 'production',
  corsOrigins,
};
