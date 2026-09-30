-- Database hardening. Idempotent: safe to run repeatedly.
--
-- Run as the database OWNER or a superuser, not as the app role:
--   psql "$ADMIN_DATABASE_URL" -f prisma/security/harden.sql
--
-- Postgres ships with defaults that are convenient rather than safe. Each
-- statement below closes one of them.

-- 1. Nothing should be reachable by "everyone". PUBLIC is an implicit role
--    that every database user belongs to, so a grant here is a grant to all.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- 2. Tables created later must not inherit a permissive default either.
--    Without this, the next `prisma migrate` re-opens what step 1 just closed.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC;

-- 3. Nobody connects to this database except the app.
REVOKE ALL ON DATABASE personal_finances FROM PUBLIC;

-- 4. The app role gets exactly what it needs on the schema: use it, and read
--    and write the rows it owns. Not CREATE — schema changes are a migration's
--    job, run with different credentials.
GRANT USAGE ON SCHEMA public TO pf_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO pf_app;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO pf_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pf_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO pf_app;

-- 5. The app role must never be able to create databases, create roles, or
--    read past a row-level security policy.
ALTER ROLE pf_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION;

-- 6. Cap concurrent connections so a connection leak cannot exhaust the
--    server's slots and lock out everything else.
ALTER ROLE pf_app CONNECTION LIMIT 20;
