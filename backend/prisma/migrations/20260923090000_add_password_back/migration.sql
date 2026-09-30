-- Restores the password column dropped in 20260703194141_remove_password.
--
-- Deliberately nullable: the existing row predates authentication and has no
-- credential to migrate. Login treats NULL as "no password set" and refuses
-- the account, so an un-migrated install fails closed rather than open.
-- Set a password with: npm run set-password
ALTER TABLE "users" ADD COLUMN "password" TEXT;
