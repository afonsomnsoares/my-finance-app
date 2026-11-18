const prisma = require('./lib/prisma');
const pool = require('./lib/pool');
const { hashPassword, passwordPolicyError } = require('./lib/password');
const { destroyAllSessionsForUser } = require('./lib/session');
const { ask, close } = require('./lib/prompt');

async function main() {
  const user = await prisma.user.findFirst({ orderBy: { id: 'asc' } });
  if (!user) {
    console.error('Nenhum utilizador encontrado. Corre primeiro: npm run create-user');
    process.exitCode = 1;
    return;
  }

  console.log(`\nA definir a password de: ${user.username} (${user.email})`);
  console.log('Mínimo 12 caracteres, com letras e números. Não aparece no ecrã enquanto escreves.\n');

  const password = await ask('Nova password: ', { silent: true });
  const policyError = passwordPolicyError(password);
  if (policyError) {
    console.error(`\n${policyError} Nada foi alterado.`);
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

  const revoked = await destroyAllSessionsForUser(user.id);

  console.log(`\nPassword definida. ${revoked} sessão(ões) terminada(s).`);
  console.log('Já podes entrar em http://localhost:3000');
}

main()
  .catch((e) => { console.error('Não foi possível definir a password:', e.message); process.exitCode = 1; })
  .finally(async () => { close(); await prisma.$disconnect(); await pool.end(); });
