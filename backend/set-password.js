/*
 * Sets the password for the single account, interactively.
 *
 * Deliberately not an HTTP endpoint: an unauthenticated "set the password"
 * route is exactly the kind of admin backdoor that should not exist. Whoever
 * runs this already has shell access to the server.
 *
 *   npm run set-password
 */

const prisma = require('./lib/prisma');
const pool = require('./lib/pool');
const { hashPassword } = require('./lib/password');
const { ask, close } = require('./lib/prompt');

const MIN_LENGTH = 12;

async function main() {
  const user = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
  if (!user) {
    console.error('Nenhum utilizador encontrado. Corre primeiro: node backend/seed.js');
    process.exitCode = 1;
    return;
  }

  console.log(`\nA definir a password de: ${user.username} (${user.email})`);
  console.log(`Mínimo ${MIN_LENGTH} caracteres. Não aparece no ecrã enquanto escreves.\n`);

  const password = await ask('Nova password: ', { silent: true });
  if (password.length < MIN_LENGTH) {
    console.error(`\nA password tem de ter pelo menos ${MIN_LENGTH} caracteres. Nada foi alterado.`);
    process.exitCode = 1;
    return;
  }

  const confirm = await ask('Confirma a password: ', { silent: true });
  if (password !== confirm) {
    console.error('\nAs passwords não coincidem. Nada foi alterado.');
    process.exitCode = 1;
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(password) },
  });

  console.log('\nPassword definida. Já podes entrar em http://localhost:3000');
}

main()
  .catch((e) => { console.error('Não foi possível definir a password:', e.message); process.exitCode = 1; })
  .finally(async () => { close(); await prisma.$disconnect(); await pool.end(); });
