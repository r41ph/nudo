import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create unprivileged role for PostGraphile RLS enforcement
  pgm.sql(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'writing_app_visitor') THEN
        CREATE ROLE writing_app_visitor;
      END IF;
    END $$;

    GRANT USAGE ON SCHEMA public TO writing_app_visitor;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO writing_app_visitor;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO writing_app_visitor;
    GRANT writing_app_visitor TO writing_app;

    -- Auto-grant on future tables/functions
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO writing_app_visitor;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT EXECUTE ON FUNCTIONS TO writing_app_visitor;

    -- Hide pgmigrations from GraphQL
    COMMENT ON TABLE pgmigrations IS E'@omit';

    -- Hide sensitive user fields/mutations from GraphQL
    COMMENT ON TABLE users IS E'@omit create,update,delete';
    COMMENT ON COLUMN users.password_hash IS E'@omit';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    COMMENT ON COLUMN users.password_hash IS NULL;
    COMMENT ON TABLE users IS NULL;
    COMMENT ON TABLE pgmigrations IS NULL;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM writing_app_visitor;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      REVOKE EXECUTE ON FUNCTIONS FROM writing_app_visitor;

    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM writing_app_visitor;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM writing_app_visitor;
    REVOKE USAGE ON SCHEMA public FROM writing_app_visitor;
    REVOKE writing_app_visitor FROM writing_app;
    DROP ROLE IF EXISTS writing_app_visitor;
  `);
}
