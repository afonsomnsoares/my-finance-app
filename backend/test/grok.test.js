const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SESSION_SECRET ??= 'test-secret-that-is-long-enough-to-pass-validation';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';

const { complete, GrokError } = require('../lib/grok');
const { buildSnapshot } = require('../lib/assistantContext');
const schemas = require('../schemas');

test('Grok refuses to call xAI when no key is configured', async () => {
  let called = false;
  await assert.rejects(
    () => complete({
      system: 'test',
      messages: [{ role: 'user', content: 'olá' }],
      apiKey: undefined,
      fetchImpl: () => { called = true; },
    }),
    (err) => err instanceof GrokError && err.code === 'grok_not_configured' && err.status === 503
  );
  assert.equal(called, false);
});

test('Grok returns the assistant text and never forwards an upstream 401', async () => {
  const reply = await complete({
    system: 'test',
    messages: [{ role: 'user', content: 'quanto gastei?' }],
    apiKey: 'test-key',
    fetchImpl: async (_url, init) => {
      assert.equal(init.headers.Authorization, 'Bearer test-key');
      const body = JSON.parse(init.body);
      assert.equal(body.model, 'grok-4.7');
      assert.equal(body.messages[0].role, 'system');
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: 'bad key' }),
      };
    },
  }).catch((err) => err);

  assert.ok(reply instanceof GrokError);
  assert.equal(reply.status, 502);
  assert.notEqual(reply.status, 401);
});

test('Grok reads the message content from a successful completion', async () => {
  const text = await complete({
    system: 'test',
    messages: [{ role: 'user', content: 'olá' }],
    apiKey: 'test-key',
    model: 'grok-4.7',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '  Gastaste 10 EUR.  ' } }] }),
    }),
  });
  assert.equal(text, 'Gastaste 10 EUR.');
});

test('the snapshot keeps money totals and drops the password', () => {
  const snapshot = buildSnapshot({
    now: new Date(2026, 10, 13),
    user: {
      currency: 'EUR',
      monthlyIncome: 2000,
      monthlyExpenses: 1500,
      password: 'secret',
      email: 'a@b.c',
    },
    transactions: [
      { date: new Date(2026, 10, 2), category: 'Alimentação', amount: 12.5, description: 'Café' },
      { date: new Date(2026, 9, 2), category: 'Renda', amount: 800, description: 'Outubro' },
    ],
    investments: [
      { name: 'VWCE', type: 'etf', amount: 2, buyPrice: 100, currency: 'EUR' },
    ],
  });

  assert.equal(snapshot.spentThisMonth, 12.5);
  assert.equal(snapshot.spentPreviousMonth, 800);
  assert.equal(snapshot.recentTransactions[0].description, 'Café');
  assert.equal(snapshot.investments[0].name, 'VWCE');
  assert.equal(snapshot.password, undefined);
  assert.equal(snapshot.email, undefined);
});

test('assistant messages must end with the user and stay bounded', () => {
  assert.throws(() => schemas.assistantChat.parse({
    messages: [{ role: 'assistant', content: 'oi' }],
  }));
  assert.throws(() => schemas.assistantChat.parse({
    messages: [{ role: 'user', content: 'x'.repeat(1501) }],
  }));
  const parsed = schemas.assistantChat.parse({
    messages: [{ role: 'user', content: '  Quanto gastei?  ' }],
  });
  assert.equal(parsed.messages[0].content, 'Quanto gastei?');
});
