const path = require('path');

const app = require('./app');
const env = require('./lib/env');
const prisma = require('./lib/prisma');
const pool = require('./lib/pool');
const { logger } = require('./lib/logger');

async function main() {
  if (!env.isProd) {

    const { createServer } = await import('vite');
    const vite = await createServer({
      root: path.join(__dirname, '..'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(env.PORT);

  server.on('listening', () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, tz: env.APP_TIMEZONE },
      `Server running on http://localhost:${env.PORT}`,
    );
  });

  server.on('error', (err) => {
    console.error(`Failed to listen on port ${env.PORT}: ${err.message}`);
    process.exit(1);
  });

  async function shutdown(signal) {
    logger.info({ signal }, 'shutting_down');
    server.close(async () => {
      await prisma.$disconnect().catch(() => {});
      await pool.end().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
