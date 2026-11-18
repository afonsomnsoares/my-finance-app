const { Pool } = require('pg');

function connectionString() {

  const url = new URL(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
  url.searchParams.delete('channel_binding');
  return url.toString();
}

const pool = new Pool({ connectionString: connectionString() });

const schema = process.env.DB_SCHEMA;
if (schema && /^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
  pool.on('connect', (client) => {
    client.query(`SET search_path TO "${schema}"`);
  });
}

module.exports = pool;
