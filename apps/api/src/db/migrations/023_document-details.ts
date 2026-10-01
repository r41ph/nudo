import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Adds the two optional metadata fields the document details inspector edits,
 * and makes `updated_at` honest for metadata edits.
 *
 *   - summary — a synopsis, unbounded: how long one needs to be is the author's
 *     call, not the schema's.
 *   - pov     — a point-of-view label. Free text for now; when a characters
 *     table exists, a nullable pov_character_id goes alongside and this column
 *     becomes the denormalised fallback label, so no rename is needed.
 *
 * Both are NOT NULL DEFAULT '' rather than nullable: every controlled input
 * then has a string, and `create_node` needs no change.
 *
 * Forward-only.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('documents', {
    summary: {
      type: 'text',
      notNull: true,
      default: '',
    },
    pov: {
      type: 'text',
      notNull: true,
      default: '',
      check: 'char_length(pov) <= 120',
    },
  });

  // Nothing stamps updated_at on a metadata edit today: only the SQL functions
  // (update_document_content, move_and_reorder_node) set it, and PostGraphile's
  // generic updateDocumentById — which rename, status and this inspector all go
  // through — sets nothing. Without this the inspector's "Updated" would lie.
  //
  // Scoped to these four columns on purpose: move_and_reorder_node rewrites
  // `position` on every sibling, so a blanket BEFORE UPDATE would restamp a
  // whole chapter on a single drag.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION documents_touch_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = pg_catalog, public
    AS $$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER documents_touch_updated_at_trg
      BEFORE UPDATE OF title, status, summary, pov ON documents
      FOR EACH ROW EXECUTE FUNCTION documents_touch_updated_at();
  `);
}
