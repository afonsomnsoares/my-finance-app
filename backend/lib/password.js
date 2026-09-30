const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

/*
 * Password hashing with scrypt from Node's core crypto — no native build step
 * and no third-party dependency in the path of the login flow.
 *
 * Stored format: scrypt$N$r$p$<salt-hex>$<hash-hex>
 * The parameters travel with the hash so they can be raised later without
 * invalidating existing passwords.
 */
const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

async function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(plain, salt, PARAMS.keylen, {
    N: PARAMS.N, r: PARAMS.r, p: PARAMS.p,
    // scrypt needs memory proportional to N*r*128; the default 32MB cap is
    // below what these parameters require.
    maxmem: 256 * 1024 * 1024,
  });
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

async function verifyPassword(plain, stored) {
  if (typeof stored !== 'string') return false;

  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, N, r, p, saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');

  let derived;
  try {
    derived = await scrypt(plain, salt, expected.length, {
      N: Number(N), r: Number(r), p: Number(p),
      maxmem: 256 * 1024 * 1024,
    });
  } catch {
    return false;
  }

  // Constant-time compare: a length-dependent or short-circuiting comparison
  // leaks how much of the hash matched.
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

module.exports = { hashPassword, verifyPassword };
