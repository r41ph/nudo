import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_user_toolbar(
      new_enabled_tools jsonb,
      new_toolbar_type text DEFAULT NULL
    ) RETURNS users AS $$
    DECLARE
      usr users;
    BEGIN
      UPDATE users
        SET enabled_tools = new_enabled_tools,
            toolbar_type = COALESCE(new_toolbar_type, toolbar_type),
            updated_at = now()
        WHERE id = current_setting('app.current_user_id', true)::uuid
        RETURNING * INTO usr;

      IF usr IS NULL THEN
        RAISE EXCEPTION 'User not found or access denied';
      END IF;

      RETURN usr;
    END;
    $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
  `);
}
