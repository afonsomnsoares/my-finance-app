/*
 * End-to-end tests of the HTTP API against a real Postgres.
 *
 * They run in a throwaway schema (`pf_test`) inside the database named by
 * DATABASE_URL, so the real tables in `public` are never read or written.
 * The schema is dropped and rebuilt from the migrations on every run.
 *
 *   npm test --prefix backend
 *
 * Without a reachable database the whole suite is skipped, not failed, so
 * the pure tests in security.test.js still run anywhere.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const SCHEMA = 'pf_test';
process.env.NODE_ENV = 'test';
process.env.DB_SCHEMA = SCHEMA;
process.env.LOG_LEVEL = 'silent';
process.env.SESSION_SECRET ??= 'test-secret-that-is-long-enough-to-pass-validation';

const canRun = Boolean(process.env.DATABASE_URL);

test('API integration', { skip: !canRun && 'DATABASE_URL not set' }, async (t) => {
  const { Client } = require('pg');
  const admin = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await admin.connect();
  } catch (e) {
    t.skip(`database unreachable: ${e.message}`);
    return;
  }

  await admin.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE; CREATE SCHEMA ${SCHEMA}`);
  await admin.end();

  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('schema', SCHEMA);
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'pipe',
  });

  const app = require('../app');
  const prisma = require('../lib/prisma');
  const pool = require('../lib/pool');
  const { hashPassword } = require('../lib/password');

  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    server.close();
    await pool.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await prisma.$disconnect();
    await pool.end();
  });

  const password = 'correct horse battery staple';
  const makeUser = async (username) => prisma.user.create({
    data: {
      firstName: username, lastName: 'Test', phoneNumber: '910000000',
      email: `${username}@example.test`, username, password: await hashPassword(password),
    },
  });
  const alice = await makeUser('alice');
  const bob = await makeUser('bob');

  // Minimal cookie-carrying client.
  const client = () => {
    let cookie = '';
    const call = async (method, route, body) => {
      const res = await fetch(base + route, {
        method,
        headers: { 'content-type': 'application/json', ...(cookie && { cookie }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const set = res.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      const type = res.headers.get('content-type') || '';
      return { status: res.status, body: type.includes('json') ? await res.json() : await res.text() };
    };
    return {
      get: (r) => call('GET', r), post: (r, b) => call('POST', r, b),
      put: (r, b) => call('PUT', r, b), del: (r) => call('DELETE', r),
    };
  };

  const asAlice = client();
  const asBob = client();

  await t.test('rejects a wrong password and unauthenticated requests', async () => {
    const anon = client();
    assert.equal((await anon.post('/api/auth/login', { username: 'alice', password: 'nope' })).status, 401);
    assert.equal((await anon.get('/api/transactions')).status, 401);
    assert.deepEqual((await anon.get('/api/auth/session')).body, { authenticated: false });
  });

  await t.test('logs in by username or email', async () => {
    assert.equal((await asAlice.post('/api/auth/login', { username: 'alice', password })).status, 200);
    assert.equal((await asBob.post('/api/auth/login', { username: 'bob@example.test', password })).status, 200);
    const session = await asAlice.get('/api/auth/session');
    assert.equal(session.body.user.id, alice.id);
  });

  await t.test('never returns the password hash', async () => {
    const me = await asAlice.get('/api/me');
    assert.equal(me.status, 200);
    assert.equal('password' in me.body, false);
  });

  await t.test('transactions are isolated between users', async () => {
    const created = await asAlice.post('/api/transactions', { amount: 12.5, category: 'Renda', description: 'x' });
    assert.equal(created.status, 201);
    assert.equal(created.body.amount, 12.5);
    const id = created.body.id;

    assert.equal((await asBob.get('/api/transactions')).body.length, 0);
    assert.equal((await asBob.put(`/api/transactions/${id}`, { amount: 1 })).status, 404);
    assert.equal((await asBob.del(`/api/transactions/${id}`)).status, 404);

    const updated = await asAlice.put(`/api/transactions/${id}`, { amount: 20 });
    assert.equal(updated.body.amount, 20);
    assert.equal((await asAlice.del(`/api/transactions/${id}`)).status, 200);
  });

  await t.test('monthly report totals, per-category totals and previous period', async () => {
    const seed = [
      // September 2026
      { amount: 0.1, category: 'Renda', date: new Date(2026, 8, 5) },
      { amount: 0.2, category: 'Renda', date: new Date(2026, 8, 6) },
      { amount: 10, category: 'Alimentação', date: new Date(2026, 8, 30, 23, 59) },
      // August 2026 — the previous period
      { amount: 7.25, category: 'Renda', date: new Date(2026, 7, 31, 12) },
      // 00:30 on 1 October in Lisbon is 23:30 UTC on 30 September. It
      // belongs to October: a UTC-based month boundary counted it here.
      { amount: 999, category: 'Renda', date: new Date('2026-09-30T23:30:00Z') },
    ];
    await prisma.transaction.createMany({ data: seed.map((s) => ({ ...s, userId: alice.id })) });
    // Bob's data must never show up in Alice's totals.
    await prisma.transaction.create({ data: { userId: bob.id, amount: 500, category: 'Renda', date: new Date(2026, 8, 10) } });

    const { status, body } = await asAlice.get('/api/reports?type=month&year=2026&month=9');
    assert.equal(status, 200);
    assert.equal(body.total, 10.3); // not 10.300000000000001
    assert.equal(body.transactionCount, 3);
    assert.equal(body.previousTotal, 7.25);
    assert.deepEqual(body.byCategory, [
      { category: 'Alimentação', total: 10, count: 1, previous: 0 },
      { category: 'Renda', total: 0.3, count: 2, previous: 7.25 },
    ]);

    const october = await asAlice.get('/api/reports?type=month&year=2026&month=10');
    assert.equal(october.body.total, 999);

    const year = await asAlice.get('/api/reports?type=year&year=2026');
    assert.equal(year.body.total, 1016.55);
  });

  await t.test('transaction date filter includes the whole last day', async () => {
    const { body } = await asAlice.get('/api/transactions?from=2026-09-30&to=2026-09-30');
    assert.deepEqual(body.map((t) => t.amount), [10]);
  });

  await t.test('budgets report spending for the current month', async () => {
    await asAlice.put('/api/budgets', { budgets: [{ category: 'Hobbies', monthlyLimit: 50 }] });
    await asAlice.post('/api/transactions', { amount: 30.1, category: 'Hobbies' });
    await asAlice.post('/api/transactions', { amount: 30.2, category: 'Hobbies' });

    const { body } = await asAlice.get('/api/budgets');
    const lazer = body.budgets.find((b) => b.category === 'Hobbies');
    assert.deepEqual(
      { spent: lazer.spent, remaining: lazer.remaining, percent: lazer.percent, exceeded: lazer.exceeded },
      { spent: 60.3, remaining: -10.3, percent: 121, exceeded: true }
    );
    assert.equal((await asBob.get('/api/budgets')).body.budgets.length, 0);
  });

  await t.test('fractional investment quantities are kept', async () => {
    const res = await asAlice.post('/api/investments', {
      name: 'BTC-USD', type: 'crypto', amount: 0.0035, buyPrice: 0.00001234, currency: 'USD',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.amount, 0.0035);
    assert.equal(res.body.buyPrice, 0.00001234);
  });

  await t.test('CSV export neutralises spreadsheet formulas', async () => {
    await prisma.transaction.create({
      data: { userId: alice.id, amount: 1, category: 'Renda', description: '=HYPERLINK("x")', date: new Date(2026, 8, 15) },
    });
    const { status, body } = await asAlice.get('/api/reports/export?format=csv&type=month&year=2026&month=9');
    assert.equal(status, 200);
    assert.match(body, /"'=HYPERLINK\(""x""\)"/);
    assert.doesNotMatch(body, /999/);
  });

  await t.test('logout revokes the session', async () => {
    await asBob.post('/api/auth/logout');
    assert.equal((await asBob.get('/api/transactions')).status, 401);
  });
});
