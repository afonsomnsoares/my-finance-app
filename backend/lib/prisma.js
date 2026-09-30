const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const env = require('./env');
const pool = require('./pool');

// Shares the process-wide pool with the session store (see lib/pool.js).
// `schema` is only set by the integration tests, which run in their own.
const adapter = new PrismaPg(pool, env.DB_SCHEMA ? { schema: env.DB_SCHEMA } : undefined);

const basePrisma = new PrismaClient({ adapter });

// Money fields are stored as Postgres NUMERIC (via Prisma's Decimal scalar)
// for exact arithmetic at rest — see migration `money_as_decimal`. Prisma
// returns those fields as Decimal objects, which the rest of the app
// (JSON responses, sums in server.js, the whole frontend) expects to be
// plain JS numbers. This extension converts them at the query boundary so
// every other file can keep treating amounts as numbers, same as before.
function toNumber(value) {
  return value === null || value === undefined ? value : Number(value);
}

const decimalField = (fieldName) => ({
  needs: { [fieldName]: true },
  compute(row) {
    return toNumber(row[fieldName]);
  },
});

const prisma = basePrisma.$extends({
  name: 'decimalToNumber',
  result: {
    user: {
      monthlyIncome: decimalField('monthlyIncome'),
      monthlyExpenses: decimalField('monthlyExpenses'),
      fixedExpenses: decimalField('fixedExpenses'),
      savingsTarget: decimalField('savingsTarget'),
    },
    categoryBudget: {
      monthlyLimit: decimalField('monthlyLimit'),
    },
    transaction: {
      amount: decimalField('amount'),
    },
    investment: {
      amount: decimalField('amount'),
      buyPrice: decimalField('buyPrice'),
    },
  },
});

module.exports = prisma;
