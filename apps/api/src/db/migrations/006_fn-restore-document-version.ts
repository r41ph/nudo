import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION restore_document_version(
      doc_id uuid,
      target_version integer
    ) RETURNS documents AS $$
    DECLARE
      ver document_versions;
      doc documents;
    BEGIN
      SELECT * INTO ver
        FROM document_versions
        WHERE document_id = doc_id AND version_number = target_version;

      IF ver IS NULL THEN
        RAISE EXCEPTION 'Version not found';
      END IF;

      UPDATE documents
        SET content = ver.content,
            plain_text = ver.plain_text,
            word_count = ver.word_count,
            updated_at = now()
        WHERE id = doc_id
          AND user_id::text = current_setting('app.current_user_id', true)
        RETURNING * INTO doc;

      IF doc IS NULL THEN
        RAISE EXCEPTION 'Document not found or access denied';
      END IF;

      RETURN doc;
    END;
    $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP FUNCTION IF EXISTS restore_document_version(uuid, integer);');
}
