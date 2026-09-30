const { Pool } = require('pg');
const env = require('./env');

/*
 * One pool for the whole process: Prisma queries and the session store share
 * it, so the app opens a single set of connections instead of two.
 */
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Raw queries (the session store, session revocation) must land in the
  // same schema Prisma uses. DB_SCHEMA is validated as a bare identifier.
  ...(env.DB_SCHEMA ? { options: `-c search_path=${env.DB_SCHEMA}` } : {}),
});

module.exports = pool;
