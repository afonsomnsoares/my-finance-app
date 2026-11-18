const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SESSION_SECRET ??= 'test-secret-that-is-long-enough-to-pass-validation';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';

const { hashPassword, verifyPassword, passwordPolicyError } = require('../lib/password');
const schemas = require('../schemas');

test('a correct password verifies', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.equal(await verifyPassword('correct horse battery staple', hash), true);
});

test('a wrong password does not verify', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.equal(await verifyPassword('Correct horse battery staple', hash), false);
  assert.equal(await verifyPassword('', hash), false);
});

test('the same password produces a different hash each time', async () => {

  const [a, b] = await Promise.all([hashPassword('same'), hashPassword('same')]);
  assert.notEqual(a, b);
  assert.equal(await verifyPassword('same', a), true);
  assert.equal(await verifyPassword('same', b), true);
});

test('malformed stored hashes are rejected rather than throwing', async () => {
  for (const bad of ['', 'not-a-hash', 'scrypt$only$four$parts', null, undefined, 42]) {
    assert.equal(await verifyPassword('x', bad), false, `should reject: ${String(bad)}`);
  }
});

test('the hash records its own parameters', async () => {
  const hash = await hashPassword('x');
  assert.match(hash, /^scrypt\$\d+\$\d+\$\d+\$[0-9a-f]+\$[0-9a-f]+$/);
});

test('negative amounts are rejected', () => {
  assert.throws(() => schemas.transactionCreate.parse({ amount: -50, category: 'Renda' }));
});

test('zero amounts are rejected', () => {
  assert.throws(() => schemas.transactionCreate.parse({ amount: 0, category: 'Renda' }));
});

test('non-numeric amounts are rejected instead of becoming NaN', () => {

  assert.throws(() => schemas.transactionCreate.parse({ amount: 'abc', category: 'Renda' }));
});

test('amounts are rounded to the cent', () => {
  const parsed = schemas.transactionCreate.parse({ amount: '25.509', category: 'Renda' });
  assert.equal(parsed.amount, 25.51);
});

test('absurdly large amounts are rejected', () => {
  assert.throws(() => schemas.transactionCreate.parse({ amount: 1e15, category: 'Renda' }));
});

test('control characters are stripped from descriptions', () => {
  const parsed = schemas.transactionCreate.parse({
    amount: 10, category: 'Renda', description: 'Caf\u0007\u0000é\u001B',
  });
  assert.equal(parsed.description, 'Café');
});

test('over-long descriptions are rejected', () => {
  assert.throws(() => schemas.transactionCreate.parse({
    amount: 10, category: 'Renda', description: 'A'.repeat(201),
  }));
});

test('an unknown category is rejected', () => {
  assert.throws(() => schemas.transactionCreate.parse({ amount: 10, category: 'Hackerman' }));
});

test('only positive integer ids are accepted', () => {
  assert.equal(schemas.idParam.parse({ id: '7' }).id, 7);
  for (const bad of ['abc', '-1', '0', '1.5', '']) {
    assert.throws(() => schemas.idParam.parse({ id: bad }), `should reject: ${bad}`);
  }
});

test('id errors never explain which rule failed', () => {
  for (const bad of ['abc', '-1', '1.5']) {
    try {
      schemas.idParam.parse({ id: bad });
      assert.fail('should have thrown');
    } catch (e) {
      assert.equal(e.issues[0].message, 'Invalid id.');
    }
  }
});

test('symbol lists are capped so one request cannot fan out upstream', () => {
  const many = Array(60).fill('NVDA').join(',');
  assert.throws(() => schemas.marketPricesQuery.parse({ symbols: many }), /At most 50/);
});

test('symbols that are not tickers are rejected', () => {
  for (const bad of ['../../etc/passwd', 'NVDA;DROP TABLE', 'a'.repeat(30), '<script>']) {
    assert.throws(() => schemas.marketPricesQuery.parse({ symbols: bad }), `should reject: ${bad}`);
  }
});

test('valid symbols are normalised to upper case', () => {
  const parsed = schemas.marketPricesQuery.parse({ symbols: 'nvda, btc-usd , msft' });
  assert.deepEqual(parsed.symbols, ['NVDA', 'BTC-USD', 'MSFT']);
});

test('an inverted date range is rejected', () => {
  assert.throws(() => schemas.transactionQuery.parse({ from: '2026-12-01', to: '2026-01-01' }));
});

test('an unparseable date is rejected', () => {
  assert.throws(() => schemas.transactionQuery.parse({ from: 'nao-e-data' }));
});

test('duplicate categories in one budget payload are rejected', () => {
  assert.throws(() => schemas.budgetsUpdate.parse({
    budgets: [
      { category: 'Renda', monthlyLimit: 100 },
      { category: 'Renda', monthlyLimit: 200 },
    ],
  }), /more than once/);
});

test('a non-positive budget limit is rejected', () => {
  assert.throws(() => schemas.budgetsUpdate.parse({
    budgets: [{ category: 'Renda', monthlyLimit: 0 }],
  }));
});

test('a partial profile update leaves untouched fields undefined', () => {

  const parsed = schemas.profileUpdate.parse({ monthlyIncome: 2500, currency: 'EUR' });
  assert.equal(parsed.phoneNumber, undefined);
  assert.equal(parsed.birthday, undefined);
  assert.equal(parsed.firstName, undefined);
});

test('an invalid currency is rejected', () => {
  assert.throws(() => schemas.profileUpdate.parse({ currency: 'XXX' }));
});

test('new passwords need letters and numbers', () => {
  assert.throws(() => schemas.passwordChange.parse({
    currentPassword: 'old-password-here',
    newPassword: 'only letters here',
  }));
  const ok = schemas.passwordChange.parse({
    currentPassword: 'old-password-here',
    newPassword: 'letters and 12 nums',
  });
  assert.equal(ok.newPassword, 'letters and 12 nums');
});

test('CLI password policy matches the API rule', () => {
  assert.match(passwordPolicyError('short'), /12/);
  assert.match(passwordPolicyError('only letters here'), /letras e números/);
  assert.equal(passwordPolicyError('letters and 12 nums'), null);
});

test('the frontend category list matches the backend one', () => {

  const fs = require('node:fs');
  const path = require('node:path');

  const backend = require('../constants/categories');
  const source = fs.readFileSync(
    path.join(__dirname, '..', '..', 'src', 'utils', 'categories.js'),
    'utf8'
  );

  const block = source.match(/export const CATEGORIES = \[([\s\S]*?)\];/);
  assert.ok(block, 'CATEGORIES não encontrado em src/utils/categories.js');

  const frontend = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

  assert.deepEqual(
    frontend,
    backend,
    'src/utils/categories.js e backend/constants/categories.js divergiram'
  );
});
