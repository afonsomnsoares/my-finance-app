const { z } = require('zod');
const categories = require('../constants/categories');

/* ───────── Building blocks ───────── */

/*
 * Free text from a user ends up in a PDF, in a CSV and in the DOM. Strip
 * control characters (which break all three), collapse the string and cap its
 * length so a single field cannot be used to bloat a row.
 */
const safeText = (max) =>
  z.string()
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, '').trim())
    .pipe(z.string().max(max, `Must be at most ${max} characters.`));

const optionalText = (max) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    safeText(max).optional()
  );

/*
 * Money. Bounded on both ends: negatives silently flipped a spending total
 * into a credit, and an unbounded value overflows the NUMERIC(12,2) column.
 */
const money = z.coerce
  .number({ message: 'Must be a number.' })
  .finite('Must be a finite number.')
  .nonnegative('Cannot be negative.')
  .max(99_999_999, 'Value is unrealistically large.')
  // Money is exact to the cent; anything finer is a mistake upstream.
  .transform((n) => Math.round(n * 100) / 100);

const positiveMoney = money.refine((n) => n > 0, 'Must be greater than zero.');

/*
 * Investment quantities and unit prices. These are not money totals: 0.0035
 * BTC or a token priced at 0.00001234 are ordinary values, and rounding them
 * to the cent turned both into 0 — which positiveMoney then rejected, so
 * fractional crypto holdings could not be saved at all. Eight decimals is
 * what exchanges quote (1 satoshi = 0.00000001 BTC).
 */
const positiveQuantity = z.coerce
  .number({ message: 'Must be a number.' })
  .finite('Must be a finite number.')
  .max(99_999_999, 'Value is unrealistically large.')
  .transform((n) => Math.round(n * 1e8) / 1e8)
  .refine((n) => n > 0, 'Must be greater than zero.');

const optionalMoney = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  money.optional()
);

const category = z.enum(categories, { message: 'Unknown category.' });

const idParam = z.object({
  // Every message on this one is the same: the caller never needs to know
  // whether the id was non-numeric, negative or fractional.
  id: z.coerce.number({ message: 'Invalid id.' })
    .int('Invalid id.')
    .positive('Invalid id.'),
});

// Accepts "2026-09-23" or a full ISO timestamp, and rejects anything the Date
// constructor would quietly turn into Invalid Date.
const isoDate = z.coerce.date({ message: 'Invalid date.' })
  .refine((d) => !Number.isNaN(d.getTime()), 'Invalid date.')
  .refine((d) => d.getFullYear() >= 1900 && d.getFullYear() <= 2200, 'Date out of range.');

/*
 * A ticker symbol goes straight into an outbound request. Constrain it to the
 * shape Yahoo actually uses, so nothing else can be smuggled through.
 */
const tickerSymbol = z.string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9.\-=^]{0,19}$/, 'Invalid ticker symbol.');

/*
 * Symbol lists were previously split from a raw query string with no ceiling,
 * so one request with 5,000 comma-separated symbols became 5,000 outbound
 * calls. The cap is the actual fix; the rate limiter is the second line.
 */
const symbolList = (max) =>
  z.string()
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(tickerSymbol).min(1, 'At least one symbol is required.').max(max, `At most ${max} symbols per request.`));

/* ───────── Auth ───────── */

/*
 * Mudança de password. A password atual é exigida mesmo havendo sessão ativa:
 * sem isso, quem se sentasse ao computador com a sessão aberta podia trocar a
 * password e trancar o dono da conta cá fora.
 */
const passwordChange = z.object({
  currentPassword: z.string().min(1, 'A password atual é obrigatória.').max(200),
  newPassword: z.string()
    .min(12, 'A nova password tem de ter pelo menos 12 caracteres.')
    .max(200, 'A password é demasiado longa.'),
}).refine((o) => o.currentPassword !== o.newPassword, {
  message: 'A nova password tem de ser diferente da atual.',
  path: ['newPassword'],
});

const login = z.object({
  username: z.string().trim().min(1, 'Username is required.').max(100),
  password: z.string().min(1, 'Password is required.').max(200),
});

/* ───────── Transactions ───────── */

const transactionCreate = z.object({
  amount: positiveMoney,
  category,
  description: optionalText(200),
  date: isoDate.optional(),
});

const transactionUpdate = z.object({
  amount: positiveMoney.optional(),
  category: category.optional(),
  description: optionalText(200).nullable(),
  date: isoDate.optional(),
}).refine((o) => Object.values(o).some((v) => v !== undefined), {
  message: 'Provide at least one field to update.',
});

const transactionQuery = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  category: category.optional(),
}).refine((o) => !o.from || !o.to || o.from <= o.to, {
  message: '"from" must not be after "to".',
});

/* ───────── Profile & onboarding ───────── */

const profileUpdate = z.object({
  firstName: optionalText(100),
  lastName: optionalText(100),
  phoneNumber: optionalText(40),
  // A blank date input posts "" — not null and not an omitted field.
  birthday: z.preprocess(
    (v) => (v === '' ? null : v),
    z.union([z.null(), isoDate]).optional()
  ),
  email: z.email('Invalid email.').max(200).optional(),
  username: z.string().trim().min(1).max(100).optional(),
  monthlyIncome: optionalMoney,
  currency: z.enum(['EUR', 'USD', 'GBP']).optional(),
  financialGoal: optionalText(60).nullable(),
  monthlyExpenses: optionalMoney,
  fixedExpenses: optionalMoney.nullable(),
  savingsTarget: optionalMoney.nullable(),
  employmentStatus: optionalText(60).nullable(),
  budgetingExperience: optionalText(60).nullable(),
});

/* ───────── Budgets ───────── */

const budgetsUpdate = z.object({
  budgets: z.array(z.object({
    category,
    monthlyLimit: positiveMoney,
  })).min(1, 'At least one budget is required.').max(categories.length)
    .refine(
      (list) => new Set(list.map((b) => b.category)).size === list.length,
      'The same category appears more than once.'
    ),
});

/* ───────── Investments ───────── */

const investmentCreate = z.object({
  name: tickerSymbol,
  type: z.enum(['stock', 'etf', 'crypto', 'commodity']),
  amount: positiveQuantity,
  buyPrice: positiveQuantity,
  currency: z.enum(['EUR', 'USD', 'GBP']).default('EUR'),
});

const investmentUpdate = investmentCreate.partial().refine(
  (o) => Object.values(o).some((v) => v !== undefined),
  { message: 'Provide at least one field to update.' }
);

/* ───────── Reports & market ───────── */

const reportQuery = z.object({
  type: z.enum(['month', 'year']).default('month'),
  year: z.coerce.number().int().min(1900).max(2200).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

const exportQuery = reportQuery.extend({
  format: z.enum(['csv', 'pdf']).default('csv'),
});

const marketQuotesQuery = z.object({
  symbols: symbolList(25).optional(),
});

const marketPricesQuery = z.object({
  symbols: symbolList(50).optional(),
});

const marketSearchQuery = z.object({
  q: z.string().trim().min(1, 'Query is required.').max(50),
});

module.exports = {
  idParam,
  login, passwordChange,
  transactionCreate, transactionUpdate, transactionQuery,
  profileUpdate,
  budgetsUpdate,
  investmentCreate, investmentUpdate,
  reportQuery, exportQuery,
  marketQuotesQuery, marketPricesQuery, marketSearchQuery,
};
