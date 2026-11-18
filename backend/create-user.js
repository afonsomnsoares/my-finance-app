const prisma = require('./lib/prisma');
const pool = require('./lib/pool');
const { hashPassword, passwordPolicyError } = require('./lib/password');
const { ask, askUntilValid, confirm, close } = require('./lib/prompt');

const required = (label) => (v) => (v ? null : `${label} é obrigatório.`);

const validEmail = (v) => {
  if (!v) return 'O email é obrigatório.';

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Email inválido.';
};

const validUsername = (v) => {
  if (!v) return 'O utilizador é obrigatório.';
  if (v.length < 3) return 'Pelo menos 3 caracteres.';
  return /^[a-zA-Z0-9._-]+$/.test(v) ? null : 'Só letras, números, ponto, hífen e underscore.';
};

async function main() {
  const existing = await prisma.user.findFirst({ orderBy: { id: 'asc' } });

  if (existing) {
    const [transactions, investments, budgets] = await Promise.all([
      prisma.transaction.count({ where: { userId: existing.id } }),
      prisma.investment.count({ where: { userId: existing.id } }),
      prisma.categoryBudget.count({ where: { userId: existing.id } }),
    ]);

    console.log('\nJá existe uma conta:');
    console.log(`  ${existing.firstName} ${existing.lastName} — ${existing.username} <${existing.email}>`);
    console.log('\nCriar uma conta nova apaga a atual e, com ela:');
    console.log(`  ${transactions} transações`);
    console.log(`  ${investments} investimentos`);
    console.log(`  ${budgets} orçamentos`);
    if (transactions + investments + budgets > 0) {
      console.log('\n  ATENÇÃO: isto não tem retorno.');
    }
    console.log('');

    if (!(await confirm('Apagar a conta atual e criar uma nova?'))) {
      console.log('Cancelado. Nada foi alterado.');
      return;
    }
  }

  console.log('\nDados da nova conta:\n');

  const firstName = await askUntilValid('Nome: ', required('O nome'));
  const lastName = await askUntilValid('Apelido: ', required('O apelido'));
  const email = await askUntilValid('Email: ', validEmail);
  const username = await askUntilValid('Utilizador (para iniciar sessão): ', validUsername);
  const phoneNumber = await ask('Telefone (opcional): ');

  console.log('\nPassword — mínimo 12 caracteres, com letras e números. Não aparece enquanto escreves.\n');

  const password = await askUntilValid(
    'Password: ',
    (v) => passwordPolicyError(v),
    { silent: true }
  );

  const confirmation = await ask('Confirma a password: ', { silent: true });
  if (password !== confirmation) {
    console.error('\nAs passwords não coincidem. Nada foi alterado.');
    process.exitCode = 1;
    return;
  }

  const user = await prisma.$transaction(async (tx) => {
    if (existing) await tx.user.delete({ where: { id: existing.id } });
    return tx.user.create({
      data: {
        firstName, lastName, email, username,
        phoneNumber: phoneNumber || '',
        password: await hashPassword(password),
        currency: 'EUR',
        onboardingCompleted: true,
      },
    });
  });

  await pool.query('DELETE FROM user_sessions').catch((err) => {
    if (err.code !== '42P01') throw err;
  });

  console.log(`\nConta criada: ${user.firstName} ${user.lastName} — ${user.username} <${user.email}>`);
  console.log('Já podes entrar em http://localhost:3000');
}

main()
  .catch((e) => {

    if (e.code === 'P2002') {
      console.error(`\nJá existe uma conta com esse ${e.meta?.target?.join(' / ') || 'valor'}.`);
    } else {
      console.error('\nNão foi possível criar a conta:', e.message);
    }
    process.exitCode = 1;
  })
  .finally(async () => { close(); await prisma.$disconnect(); await pool.end(); });
