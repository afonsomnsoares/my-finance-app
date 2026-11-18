/*
 * Prisma's schema requires DATABASE_URL_UNPOOLED at migrate time. Render only
 * has the pooled DATABASE_URL. Neon's direct host is the pooled host without
 * "-pooler". channel_binding is a libpq option Node's TLS stack does not
 * implement, so it is stripped before either client connects.
 */

function cleanConnectionString(value, { direct = false } = {}) {
  const url = new URL(value);
  url.searchParams.delete('channel_binding');
  if (direct) url.hostname = url.hostname.replace(/-pooler(?=\.)/, '');
  return url.toString();
}

function ensureDatabaseEnv(env = process.env) {
  if (!env.DATABASE_URL) return env;
  env.DATABASE_URL = cleanConnectionString(env.DATABASE_URL);
  const source = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
  env.DATABASE_URL_UNPOOLED = cleanConnectionString(source, { direct: true });
  return env;
}

module.exports = { cleanConnectionString, ensureDatabaseEnv };
