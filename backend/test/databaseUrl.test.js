const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanConnectionString, ensureDatabaseEnv } = require('../lib/databaseUrl');

const pooled = 'postgresql://user:secret@ep-example-pooler.c-2.eu-west-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

test('strips channel_binding and the pooler suffix for the direct URL', () => {
  const direct = cleanConnectionString(pooled, { direct: true });
  const url = new URL(direct);
  assert.equal(url.hostname, 'ep-example.c-2.eu-west-2.aws.neon.tech');
  assert.equal(url.searchParams.get('channel_binding'), null);
  assert.equal(url.searchParams.get('sslmode'), 'require');
  assert.equal(url.password, 'secret');
});

test('fills DATABASE_URL_UNPOOLED from the pooled URL', () => {
  const env = { DATABASE_URL: pooled };
  ensureDatabaseEnv(env);
  assert.match(env.DATABASE_URL, /-pooler\./);
  assert.doesNotMatch(env.DATABASE_URL, /channel_binding/);
  assert.equal(new URL(env.DATABASE_URL_UNPOOLED).hostname, 'ep-example.c-2.eu-west-2.aws.neon.tech');
});

test('keeps an explicit direct URL and still strips channel_binding', () => {
  const env = {
    DATABASE_URL: pooled,
    DATABASE_URL_UNPOOLED: 'postgresql://user:secret@ep-example.c-2.eu-west-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require',
  };
  ensureDatabaseEnv(env);
  assert.equal(new URL(env.DATABASE_URL_UNPOOLED).hostname, 'ep-example.c-2.eu-west-2.aws.neon.tech');
  assert.equal(new URL(env.DATABASE_URL_UNPOOLED).searchParams.get('channel_binding'), null);
});
