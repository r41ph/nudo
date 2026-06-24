import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Replaces the two-level Folders > Documents outline with a single, uniform
 * self-referencing tree of `documents`.
 *
 * Every node is a document row:
 *   - parent_id (nullable = root) gives arbitrary nesting.
 *   - kind (document | folder | separator) is the node's behaviour:
 *       document  — a leaf you write in.
 *       folder    — a container; a document auto-becomes one when you nest
 *                   inside it (you can also create an empty folder).
 *       separator — a flat scoping marker (no prose, no children); the UI folds
 *                   the sibling run after it. Nesting INTO a separator is
 *                   forbidden.
 *   - status ∈ (planned | drafting | done), nullable and opt-in on any node.
 *
 * The `folders` table is dropped. `document_versions` / `discussions` are
 * untouched (a node is still a document). Forward-only; existing outline data is
 * discarded (greenfield, pre-launch).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // ── count_words: return 0 for empty/whitespace ────────────────────────────
  // `regexp_split_to_array('', '\s+')` yields `{''}`, so the old version
  // counted 1 word for empty content. Guard the empty case.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION count_words(plain text) RETURNS integer AS $$
    DECLARE
      trimmed text := trim(coalesce(plain, ''));
    BEGIN
      IF trimmed = '' THEN
        RETURN 0;
      END IF;
      RETURN array_length(regexp_split_to_array(trimmed, '\\s+'), 1);
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
  `);

  // ── Collapse folders + documents into one document tree ───────────────────
  // TRUNCATE clears documents and (CASCADE) its versions/discussions. Dropping
  // folders CASCADE removes the documents.folder_id FK with it.
  pgm.sql(`TRUNCATE documents CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS folders CASCADE;`);
  pgm.sql(`ALTER TABLE documents DROP COLUMN IF EXISTS folder_id;`);

  // Drop the unused slug. Routing is by document id (/document/:id); the slug
  // was never read, and mirroring it to the title on rename would silently
  // break links if it ever were. Dropping the column drops its unique
  // (user_id, slug) index too.
  pgm.sql(`ALTER TABLE documents DROP COLUMN IF EXISTS slug;`);

  pgm.addColumn('documents', {
    parent_id: {
      type: 'uuid',
      notNull: false,
      references: 'documents',
      onDelete: 'CASCADE',
    },
    kind: {
      type: 'text',
      notNull: true,
      default: 'document',
    },
    status: {
      type: 'text',
      notNull: false,
    },
  });

  pgm.sql(`
    ALTER TABLE documents
      ADD CONSTRAINT documents_kind_check
      CHECK (kind IN ('document', 'folder', 'separator'));
  `);
  pgm.sql(`
    ALTER TABLE documents
      ADD CONSTRAINT documents_status_check
      CHECK (status IS NULL OR status IN ('planned', 'drafting', 'done'));
  `);

  pgm.createIndex('documents', 'parent_id');

  // ── Drop the superseded folder/document functions ─────────────────────────
  pgm.sql(`DROP FUNCTION IF EXISTS create_new_folder(text);`);
  pgm.sql(`DROP FUNCTION IF EXISTS create_new_document(text, jsonb, uuid);`);
  pgm.sql(`DROP FUNCTION IF EXISTS reorder_folders(json);`);
  pgm.sql(
    `DROP FUNCTION IF EXISTS move_and_reorder_document(uuid, uuid, json);`
  );

  // ── create_node ───────────────────────────────────────────────────────────
  // Any kind, under an optional parent, positioned last among its siblings.
  // Rejects nesting inside a separator; after inserting a child, promotes a
  // 'document' parent to 'folder'.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION create_node(
      node_kind text DEFAULT 'document',
      node_parent_id uuid DEFAULT NULL,
      node_title text DEFAULT 'Untitled',
      node_content jsonb DEFAULT '[]'::jsonb
    ) RETURNS documents AS $$
    DECLARE
      doc documents;
      uid uuid;
      next_pos integer;
    BEGIN
      uid := current_setting('app.current_user_id', true)::uuid;

      IF node_parent_id IS NOT NULL THEN
        IF (SELECT kind FROM documents WHERE id = node_parent_id AND user_id = uid) = 'separator' THEN
          RAISE EXCEPTION 'cannot add inside a separator';
        END IF;
      END IF;

      SELECT COALESCE(MAX(position), -1) + 1 INTO next_pos
        FROM documents
        WHERE user_id = uid
          AND parent_id IS NOT DISTINCT FROM node_parent_id;

      INSERT INTO documents (
        user_id, title, content, plain_text, word_count,
        parent_id, position, kind, status
      )
      VALUES (
        uid, node_title, node_content,
        trim(extract_plain_text(node_content)),
        count_words(trim(extract_plain_text(node_content))),
        node_parent_id, next_pos, node_kind, NULL
      )
      RETURNING * INTO doc;

      IF node_parent_id IS NOT NULL THEN
        UPDATE documents SET kind = 'folder'
          WHERE id = node_parent_id AND user_id = uid AND kind = 'document';
      END IF;

      RETURN doc;
    END;
    $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
       SET search_path = pg_catalog, public;
  `);

  // ── move_and_reorder_node ──────────────────────────────────────────────────
  // Reparent (target_parent_id NULL = root) and persist the destination sibling
  // order. Rejects moving into a separator or into the node's own subtree;
  // promotes a 'document' target parent to 'folder'.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION move_and_reorder_node(
      node_id uuid,
      target_parent_id uuid DEFAULT NULL,
      node_positions json DEFAULT '[]'::json
    )
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public
    AS $$
    DECLARE
      current_uid uuid := current_setting('app.current_user_id', true)::uuid;
      item json;
    BEGIN
      IF target_parent_id IS NOT NULL THEN
        IF (SELECT kind FROM documents WHERE id = target_parent_id AND user_id = current_uid) = 'separator' THEN
          RAISE EXCEPTION 'cannot move inside a separator';
        END IF;
        IF target_parent_id = node_id OR EXISTS (
          WITH RECURSIVE subtree AS (
            SELECT id FROM documents WHERE id = node_id AND user_id = current_uid
            UNION ALL
            SELECT d.id FROM documents d JOIN subtree s ON d.parent_id = s.id
          )
          SELECT 1 FROM subtree WHERE id = target_parent_id
        ) THEN
          RAISE EXCEPTION 'cannot move a node into its own subtree';
        END IF;
      END IF;

      UPDATE documents
        SET parent_id = target_parent_id, updated_at = now()
        WHERE id = node_id AND user_id = current_uid;

      IF target_parent_id IS NOT NULL THEN
        UPDATE documents SET kind = 'folder'
          WHERE id = target_parent_id AND user_id = current_uid AND kind = 'document';
      END IF;

      FOR item IN SELECT * FROM json_array_elements(node_positions)
      LOOP
        UPDATE documents
          SET position = (item->>'position')::int
          WHERE id = (item->>'id')::uuid
            AND user_id = current_uid;
      END LOOP;
    END;
    $$;
  `);

  // ── parent_id integrity trigger ────────────────────────────────────────────
  // move_and_reorder_node guards against cycles and separator-parents, but
  // PostGraphile also exposes the generic updateDocumentById, through which a
  // client could patch parent_id directly and bypass those guards — forming a
  // cycle (which would hang the client's tree recursion) or nesting under a
  // separator. Enforce both invariants at the lowest level so every write path
  // is covered.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION documents_check_parent()
    RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = pg_catalog, public
    AS $$
    DECLARE
      ancestor uuid;
      hops integer := 0;
    BEGIN
      IF NEW.parent_id IS NULL THEN
        RETURN NEW;
      END IF;

      IF NEW.parent_id = NEW.id THEN
        RAISE EXCEPTION 'a node cannot be its own parent';
      END IF;

      IF (SELECT kind FROM documents WHERE id = NEW.parent_id) = 'separator' THEN
        RAISE EXCEPTION 'cannot nest inside a separator';
      END IF;

      -- Walk up from the proposed parent; reaching NEW.id closes a cycle.
      ancestor := NEW.parent_id;
      WHILE ancestor IS NOT NULL LOOP
        IF ancestor = NEW.id THEN
          RAISE EXCEPTION 'cannot move a node into its own subtree';
        END IF;
        SELECT parent_id INTO ancestor FROM documents WHERE id = ancestor;
        hops := hops + 1;
        IF hops > 100000 THEN
          RAISE EXCEPTION 'parent chain too deep';
        END IF;
      END LOOP;

      RETURN NEW;
    END;
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER documents_check_parent_trg
      BEFORE INSERT OR UPDATE OF parent_id ON documents
      FOR EACH ROW EXECUTE FUNCTION documents_check_parent();
  `);
}
