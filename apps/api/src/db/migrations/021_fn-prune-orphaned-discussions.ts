import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION prune_orphaned_discussions(
      doc_id UUID,
      active_ids UUID[]
    ) RETURNS void AS $$
    BEGIN
      IF active_ids IS NULL OR array_length(active_ids, 1) IS NULL THEN
        RETURN;
      END IF;

      DELETE FROM discussions
      WHERE document_id = doc_id
        AND id != ALL(active_ids)
        AND document_id IN (
          SELECT id FROM documents
          WHERE user_id::text = current_setting('app.current_user_id', true)
        );
    END;
    $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
  `);
}
