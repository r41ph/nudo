import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION create_new_folder(
      folder_name text DEFAULT 'Untitled Folder'
    ) RETURNS folders AS $$
    DECLARE
      f folders;
      uid uuid;
      next_pos integer;
    BEGIN
      uid := current_setting('app.current_user_id', true)::uuid;

      -- Folders and root docs share position space, so take the max across both.
      SELECT COALESCE(GREATEST(
        (SELECT MAX(position) FROM folders WHERE user_id = uid),
        (SELECT MAX(position) FROM documents WHERE user_id = uid AND folder_id IS NULL)
      ), -1) + 1 INTO next_pos;

      INSERT INTO folders (user_id, name, position)
        VALUES (uid, folder_name, next_pos)
        RETURNING * INTO f;

      RETURN f;
    END;
    $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION create_new_folder(
      folder_name text DEFAULT 'Untitled Folder'
    ) RETURNS folders AS $$
    DECLARE
      f folders;
      uid uuid;
      next_pos integer;
    BEGIN
      uid := current_setting('app.current_user_id', true)::uuid;

      SELECT COALESCE(MAX(position), -1) + 1 INTO next_pos
        FROM folders WHERE user_id = uid;

      INSERT INTO folders (user_id, name, position)
        VALUES (uid, folder_name, next_pos)
        RETURNING * INTO f;

      RETURN f;
    END;
    $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
  `);
}
