/*
 * Audits the database's security posture and exits non-zero if anything is
 * open that should not be. Safe to run in CI.
 *
 * Replaces the old check-db.js, which dumped user rows and printed half the
 * connection string to stdout.
 *
 *   npm run check:security
 */
const pool = require('./lib/pool');

const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok, detail });

async function main() {
  const { rows: publicGrants } = await pool.query(`
    SELECT table_name, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee = 'PUBLIC'
  `);
  check(
    'No table is granted to PUBLIC',
    publicGrants.length === 0,
    publicGrants.map((r) => `${r.table_name}:${r.privilege_type}`).join(', ')
  );

  const { rows: [schemaPriv] } = await pool.query(`
    SELECT has_schema_privilege('public', 'public', 'CREATE') AS can_create
  `);
  check('PUBLIC cannot CREATE in schema public', schemaPriv.can_create === false);

  const { rows: [role] } = await pool.query(`
    SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls, rolconnlimit
    FROM pg_roles WHERE rolname = current_user
  `);
  check('App role is not a superuser', role.rolsuper === false);
  check('App role cannot create databases', role.rolcreatedb === false);
  check('App role cannot create roles', role.rolcreaterole === false);
  check('App role cannot bypass RLS', role.rolbypassrls === false);
  check(
    'App role has a connection limit',
    role.rolconnlimit > 0,
    role.rolconnlimit === -1 ? 'unlimited' : String(role.rolconnlimit)
  );

  const { rows: [sessions] } = await pool.query(`
    SELECT to_regclass('public.user_sessions') IS NOT NULL AS present
  `);
  check('Session table exists', sessions.present === true);

  const { rows: [pw] } = await pool.query(`
    SELECT count(*)::int AS without_password FROM users WHERE password IS NULL
  `);
  check(
    'Every account has a password set',
    pw.without_password === 0,
    pw.without_password ? `${pw.without_password} account(s) without one — run: npm run set-password` : ''
  );

  let failed = 0;
  console.log('\nDatabase security audit\n');
  for (const c of checks) {
    if (!c.ok) failed += 1;
    const mark = c.ok ? '  PASS' : '  FAIL';
    console.log(`${mark}  ${c.name}${c.detail ? `  (${c.detail})` : ''}`);
  }
  console.log(`\n${checks.length - failed}/${checks.length} checks passed.\n`);

  process.exitCode = failed > 0 ? 1 : 0;
}

main()
  .catch((e) => { console.error('Audit failed:', e.message); process.exitCode = 1; })
  .finally(() => pool.end());
