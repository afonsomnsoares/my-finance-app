const readline = require('readline');
const { Writable } = require('stream');

let rl = null;
let silent = false;

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

    process.stdout.write(question);
    silent = Boolean(options.silent);
    iface.question('', (answer) => {
      if (silent) process.stdout.write('\n');
      silent = false;
      resolve(answer.trim());
    });
  });
}

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

function close() {
  if (rl) { rl.close(); rl = null; }
}

module.exports = { ask, askUntilValid, confirm, close };
