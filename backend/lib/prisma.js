const { PrismaClient, Prisma } = require('@prisma/client');

/*
 * Application queries use the pooled DATABASE_URL. Migrations use
 * DATABASE_URL_UNPOOLED through Prisma's directUrl. The integration suite
 * points this client at a throwaway schema by setting DB_SCHEMA.
 */
function connectionString() {
  const url = new URL(process.env.DATABASE_URL);
  if (process.env.DB_SCHEMA) url.searchParams.set('schema', process.env.DB_SCHEMA);
  // channel_binding is a libpq option Node's TLS stack does not implement.
  url.searchParams.delete('channel_binding');
  if (url.hostname.includes('-pooler')) url.searchParams.set('pgbouncer', 'true');
  return url.toString();
}

const prisma = new PrismaClient({
  datasources: { db: { url: connectionString() } },
});

/*
 * Prisma returns money columns as Decimal objects. Callers, and the JSON
 * responses, want ordinary numbers (see lib/money.js).
 */
function plain(value) {
  if (value == null || typeof value !== 'object') return value;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map(plain);
  const out = {};
  for (const [key, nested] of Object.entries(value)) out[key] = plain(nested);
  return out;
}

module.exports = prisma;
module.exports.plain = plain;
