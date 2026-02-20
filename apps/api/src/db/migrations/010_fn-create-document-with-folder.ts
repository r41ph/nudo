import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Drop the old 2-arg overload first; CREATE OR REPLACE only replaces
  // functions with the exact same argument list, so adding a parameter
  // created a second overload instead of replacing.
  pgm.sql(`DROP FUNCTION IF EXISTS create_new_document(text, jsonb);`);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION create_new_document(
      doc_title text DEFAULT 'Untitled',
      doc_content jsonb DEFAULT '[]'::jsonb,
      doc_folder_id uuid DEFAULT NULL
    ) RETURNS documents AS $$
    DECLARE
      doc documents;
      base_slug text;
      final_slug text;
      counter integer := 0;
      uid uuid;
    BEGIN
      uid := current_setting('app.current_user_id', true)::uuid;
      base_slug := lower(regexp_replace(doc_title, '[^a-zA-Z0-9]+', '-', 'g'));
      base_slug := trim(both '-' from base_slug);
      IF base_slug = '' THEN
        base_slug := 'untitled';
      END IF;

      final_slug := base_slug;
      LOOP
        EXIT WHEN NOT EXISTS (
          SELECT 1 FROM documents WHERE user_id = uid AND slug = final_slug
        );
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
      END LOOP;

      INSERT INTO documents (user_id, title, slug, content, plain_text, word_count, folder_id)
        VALUES (
          uid,
          doc_title,
          final_slug,
          doc_content,
          trim(extract_plain_text(doc_content)),
          count_words(trim(extract_plain_text(doc_content))),
          doc_folder_id
        )
        RETURNING * INTO doc;

      INSERT INTO document_settings (document_id)
        VALUES (doc.id);

      RETURN doc;
    END;
    $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Restore original function without folder_id parameter
  pgm.sql(`
    CREATE OR REPLACE FUNCTION create_new_document(
      doc_title text DEFAULT 'Untitled',
      doc_content jsonb DEFAULT '[]'::jsonb
    ) RETURNS documents AS $$
    DECLARE
      doc documents;
      base_slug text;
      final_slug text;
      counter integer := 0;
      uid uuid;
    BEGIN
      uid := current_setting('app.current_user_id', true)::uuid;
      base_slug := lower(regexp_replace(doc_title, '[^a-zA-Z0-9]+', '-', 'g'));
      base_slug := trim(both '-' from base_slug);
      IF base_slug = '' THEN
        base_slug := 'untitled';
      END IF;

      final_slug := base_slug;
      LOOP
        EXIT WHEN NOT EXISTS (
          SELECT 1 FROM documents WHERE user_id = uid AND slug = final_slug
        );
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
      END LOOP;

      INSERT INTO documents (user_id, title, slug, content, plain_text, word_count)
        VALUES (
          uid,
          doc_title,
          final_slug,
          doc_content,
          trim(extract_plain_text(doc_content)),
          count_words(trim(extract_plain_text(doc_content)))
        )
        RETURNING * INTO doc;

      INSERT INTO document_settings (document_id)
        VALUES (doc.id);

      RETURN doc;
    END;
    $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
  `);
}
