import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Function to batch-update folder positions
  pgm.sql(`
    CREATE OR REPLACE FUNCTION reorder_folders(folder_positions json)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      current_uid uuid := current_setting('app.current_user_id', true)::uuid;
      item json;
    BEGIN
      FOR item IN SELECT * FROM json_array_elements(folder_positions)
      LOOP
        UPDATE folders
        SET position = (item->>'position')::int,
            updated_at = now()
        WHERE id = (item->>'id')::uuid
          AND user_id = current_uid;
      END LOOP;
    END;
    $$;
  `);

  // Function to move a document to a folder (or root) and batch-update positions
  pgm.sql(`
    CREATE OR REPLACE FUNCTION move_and_reorder_document(
      doc_id uuid,
      target_folder_id uuid,
      doc_positions json
    )
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      current_uid uuid := current_setting('app.current_user_id', true)::uuid;
      item json;
    BEGIN
      -- Move document to target folder (null = root)
      UPDATE documents
      SET folder_id = target_folder_id,
          updated_at = now()
      WHERE id = doc_id
        AND user_id = current_uid;

      -- Batch update positions for all docs in the payload
      FOR item IN SELECT * FROM json_array_elements(doc_positions)
      LOOP
        UPDATE documents
        SET position = (item->>'position')::int
        WHERE id = (item->>'id')::uuid
          AND user_id = current_uid;
      END LOOP;
    END;
    $$;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP FUNCTION IF EXISTS reorder_folders(json);');
  pgm.sql('DROP FUNCTION IF EXISTS move_and_reorder_document(uuid, uuid, json);');
}
