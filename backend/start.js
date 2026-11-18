const { spawn } = require('child_process');
const { ensureDatabaseEnv } = require('./lib/databaseUrl');

ensureDatabaseEnv();

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', env: process.env });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with status ${code}`));
    });
  });
}

run('npx', ['prisma', 'migrate', 'deploy'])
  .then(() => run('npx', ['prisma', 'generate']))
  .then(() => run(process.execPath, ['server.js']))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
