import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION extract_plain_text(content jsonb) RETURNS text AS $$
    DECLARE
      result text := '';
      element jsonb;
      child jsonb;
    BEGIN
      IF jsonb_typeof(content) = 'array' THEN
        FOR element IN SELECT * FROM jsonb_array_elements(content)
        LOOP
          result := result || extract_plain_text(element);
        END LOOP;
      ELSIF jsonb_typeof(content) = 'object' THEN
        IF content ? 'text' THEN
          result := result || (content->>'text') || ' ';
        END IF;
        IF content ? 'children' THEN
          result := result || extract_plain_text(content->'children');
        END IF;
      END IF;
      RETURN result;
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;

    CREATE OR REPLACE FUNCTION count_words(plain text) RETURNS integer AS $$
    BEGIN
      RETURN array_length(
        regexp_split_to_array(trim(plain), '\\s+'),
        1
      );
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;

    CREATE OR REPLACE FUNCTION update_document_content(
      doc_id uuid,
      new_content jsonb
    ) RETURNS documents AS $$
    DECLARE
      doc documents;
      plain text;
      wc integer;
      next_version integer;
    BEGIN
      plain := trim(extract_plain_text(new_content));
      wc := count_words(plain);

      UPDATE documents
        SET content = new_content, plain_text = plain, word_count = wc, updated_at = now()
        WHERE id = doc_id
          AND user_id::text = current_setting('app.current_user_id', true)
        RETURNING * INTO doc;

      IF doc IS NULL THEN
        RAISE EXCEPTION 'Document not found or access denied';
      END IF;

      SELECT COALESCE(MAX(version_number), 0) + 1
        INTO next_version
        FROM document_versions
        WHERE document_id = doc_id;

      INSERT INTO document_versions (document_id, content, plain_text, word_count, version_number)
        VALUES (doc_id, new_content, plain, wc, next_version);

      -- Enforce 50-version limit
      DELETE FROM document_versions
        WHERE document_id = doc_id
          AND version_number <= (next_version - 50);

      RETURN doc;
    END;
    $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DROP FUNCTION IF EXISTS update_document_content(uuid, jsonb);
    DROP FUNCTION IF EXISTS count_words(text);
    DROP FUNCTION IF EXISTS extract_plain_text(jsonb);
  `);
}
