const readline = require('readline');
const { Writable } = require('stream');

/*
 * Perguntas no terminal, partilhadas por create-user.js e set-password.js.
 *
 * Uma única interface readline para toda a sessão. Antes criava-se uma por
 * pergunta e fechava-se logo a seguir — o que funciona quando alguém está
 * mesmo a escrever, mas descarta o que já estivesse em buffer, por isso
 * qualquer input encadeado (um teste, um script) perdia-se a meio.
 */
let rl = null;
let silent = false;

// Engole o eco enquanto `silent` estiver ligado: é o que impede a password de
// aparecer no ecrã à medida que se escreve.
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!silent) process.stdout.write(chunk, encoding);
    callback();
  },
});

function getInterface() {
  if (!rl) {
    rl = readline.createInterface({ input: process.stdin, output, terminal: true });
  }
  return rl;
}

function ask(question, options = {}) {
  const iface = getInterface();
  return new Promise((resolve) => {
    // A pergunta escreve-se diretamente no stdout, fora do stream silenciado,
    // para continuar visível mesmo quando a resposta não é.
    process.stdout.write(question);
    silent = Boolean(options.silent);
    iface.question('', (answer) => {
      if (silent) process.stdout.write('\n');
      silent = false;
      resolve(answer.trim());
    });
  });
}

/* Repete a pergunta até a resposta passar na validação. */
async function askUntilValid(question, validate, options) {
  for (;;) {
    const answer = await ask(question, options);
    const problem = validate(answer);
    if (!problem) return answer;
    console.error(`  ${problem}`);
  }
}

async function confirm(question) {
  const answer = await ask(`${question} (escreve "sim" para confirmar): `);
  return answer.toLowerCase() === 'sim';
}

/* Sem isto o processo fica preso com o stdin aberto. */
function close() {
  if (rl) { rl.close(); rl = null; }
}

module.exports = { ask, askUntilValid, confirm, close };
