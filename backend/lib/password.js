const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

async function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(plain, salt, PARAMS.keylen, {
    N: PARAMS.N, r: PARAMS.r, p: PARAMS.p,

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

  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function passwordPolicyError(plain) {
  if (typeof plain !== 'string' || plain.length < 12) {
    return 'A password tem de ter pelo menos 12 caracteres.';
  }
  if (plain.length > 200) {
    return 'A password é demasiado longa.';
  }
  if (!/[A-Za-z]/.test(plain) || !/\d/.test(plain)) {
    return 'A password precisa de letras e números.';
  }
  return null;
}

module.exports = { hashPassword, verifyPassword, passwordPolicyError };
