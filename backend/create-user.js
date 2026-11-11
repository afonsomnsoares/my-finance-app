/*
 * Cria a conta da aplicação, interativamente.
 *
 * Substitui o seed.js, que tinha o nome e o email fixos no código ("Afonso
 * Noronha / afonso@gmail.com") e não definia password nenhuma.
 *
 * Como a app é de utilizador único, criar uma conta nova implica substituir a
 * existente — por isso o script mostra primeiro o que vai apagar e pede
 * confirmação explícita.
 *
 *   npm run create-user
 */
const prisma = require('./lib/prisma');
const pool = require('./lib/pool');
const { hashPassword } = require('./lib/password');
const { ask, askUntilValid, confirm, close } = require('./lib/prompt');

const MIN_PASSWORD = 12;

const required = (label) => (v) => (v ? null : `${label} é obrigatório.`);

const validEmail = (v) => {
  if (!v) return 'O email é obrigatório.';
  // Suficiente para apanhar erros de escrita; a validação a sério é conseguir
  // receber correio, que não é trabalho deste script.
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

  console.log(`\nPassword — mínimo ${MIN_PASSWORD} caracteres, não aparece enquanto escreves.\n`);

  const password = await askUntilValid(
    'Password: ',
    (v) => (v.length >= MIN_PASSWORD ? null : `Pelo menos ${MIN_PASSWORD} caracteres.`),
    { silent: true }
  );

  const confirmation = await ask('Confirma a password: ', { silent: true });
  if (password !== confirmation) {
    console.error('\nAs passwords não coincidem. Nada foi alterado.');
    process.exitCode = 1;
    return;
  }

  /*
   * Apagar e criar numa só transação: se a criação falhar (um email duplicado,
   * por exemplo), a conta antiga não fica apagada sem substituta.
   */
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

  // As sessões antigas apontavam para um utilizador que já não existe.
  // Sessions live in memory, so there is no user_sessions table to clear.
  await pool.query('DELETE FROM user_sessions').catch((err) => {
    if (err.code !== '42P01') throw err;
  });

  console.log(`\nConta criada: ${user.firstName} ${user.lastName} — ${user.username} <${user.email}>`);
  console.log('Já podes entrar em http://localhost:3000');
}

main()
  .catch((e) => {
    // P2002 = violação de unicidade (email ou username já existem).
    if (e.code === 'P2002') {
      console.error(`\nJá existe uma conta com esse ${e.meta?.target?.join(' / ') || 'valor'}.`);
    } else {
      console.error('\nNão foi possível criar a conta:', e.message);
    }
    process.exitCode = 1;
  })
  .finally(async () => { close(); await prisma.$disconnect(); await pool.end(); });
