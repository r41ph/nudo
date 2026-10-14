import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Introduces projects: one book or manuscript per row. Every document now
 * belongs to exactly one project.
 *
 * documents.user_id stays the RLS key; project_id is the domain owner, and
 * documents_check_project keeps the two consistent.
 *
 * Forward-only.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('projects', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    title: {
      type: 'text',
      notNull: true,
      default: 'Untitled manuscript',
      check: 'char_length(trim(title)) BETWEEN 1 AND 200',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
  pgm.createIndex('projects', 'user_id');

  pgm.sql(`
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY projects_select_own ON projects
      FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
    CREATE POLICY projects_insert_own ON projects
      FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));
    CREATE POLICY projects_update_own ON projects
      FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));
    CREATE POLICY projects_delete_own ON projects
      FOR DELETE USING (user_id::text = current_setting('app.current_user_id', true));
  `);

  // A project made through the generic insert would have no starter
  // documents, and its mutation name would clash with create_project's.
  pgm.sql(`COMMENT ON TABLE projects IS E'@omit create';`);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION projects_touch_updated_at()
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
    CREATE TRIGGER projects_touch_updated_at_trg
      BEFORE UPDATE OF title ON projects
      FOR EACH ROW EXECUTE FUNCTION projects_touch_updated_at();
  `);

  pgm.addColumn('documents', {
    project_id: {
      type: 'uuid',
      references: 'projects',
      onDelete: 'CASCADE',
    },
  });

  // Unqualified names and no pinned search_path so the integration test can
  // run it again against a scratch schema; nudo_visitor can't call it.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION backfill_projects()
    RETURNS void
    LANGUAGE sql
    AS $$
      INSERT INTO projects (user_id, title)
        SELECT u.id, 'Untitled manuscript' FROM users u
         WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.user_id = u.id);

      UPDATE documents d SET project_id = p.id
        FROM projects p
       WHERE p.user_id = d.user_id AND d.project_id IS NULL;
    $$;
    REVOKE EXECUTE ON FUNCTION backfill_projects() FROM PUBLIC, nudo_visitor;
    COMMENT ON FUNCTION backfill_projects() IS E'@omit';
  `);
  pgm.sql(`SELECT backfill_projects();`);

  pgm.alterColumn('documents', 'project_id', { notNull: true });
  pgm.createIndex('documents', ['project_id', 'parent_id', 'position']);

  // PostGraphile also exposes the generic createDocument and
  // updateDocumentById, so these rules have to hold on every write path.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION documents_check_project()
    RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = pg_catalog, public
    AS $$
    BEGIN
      IF TG_OP = 'UPDATE' AND NEW.project_id <> OLD.project_id THEN
        RAISE EXCEPTION 'a document cannot move to another project';
      END IF;

      -- Under RLS a foreign project reads as NULL, which also fails here.
      IF (SELECT user_id FROM projects WHERE id = NEW.project_id)
           IS DISTINCT FROM NEW.user_id THEN
        RAISE EXCEPTION 'project does not belong to the document owner';
      END IF;

      IF NEW.parent_id IS NOT NULL
         AND (SELECT project_id FROM documents WHERE id = NEW.parent_id)
           IS DISTINCT FROM NEW.project_id THEN
        RAISE EXCEPTION 'parent is in another project';
      END IF;

      RETURN NEW;
    END;
    $$;
  `);
  pgm.sql(`
    CREATE TRIGGER documents_check_project_trg
      BEFORE INSERT OR UPDATE OF project_id, parent_id, user_id ON documents
      FOR EACH ROW EXECUTE FUNCTION documents_check_project();
  `);

  // Dropped rather than replaced: two create_node signatures would make
  // PostGraphile expose clashing overloads (see 012).
  pgm.sql(`DROP FUNCTION IF EXISTS create_node(text, uuid, text, jsonb);`);
  pgm.sql(`
    CREATE OR REPLACE FUNCTION create_node(
      node_project_id uuid,
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

      IF NOT EXISTS (
        SELECT 1 FROM projects WHERE id = node_project_id AND user_id = uid
      ) THEN
        RAISE EXCEPTION 'project not found';
      END IF;

      IF node_parent_id IS NOT NULL THEN
        IF (SELECT kind FROM documents WHERE id = node_parent_id AND user_id = uid) = 'separator' THEN
          RAISE EXCEPTION 'cannot add inside a separator';
        END IF;
      END IF;

      SELECT COALESCE(MAX(position), -1) + 1 INTO next_pos
        FROM documents
        WHERE project_id = node_project_id
          AND parent_id IS NOT DISTINCT FROM node_parent_id;

      INSERT INTO documents (
        user_id, project_id, title, content, plain_text, word_count,
        parent_id, position, kind, status
      )
      VALUES (
        uid, node_project_id, node_title, node_content,
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

  // One call, one transaction: a project never exists without its starter
  // documents.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION create_project(project_title text)
    RETURNS projects AS $$
    DECLARE
      proj projects;
      chapter_id uuid;
      uid uuid;
    BEGIN
      uid := current_setting('app.current_user_id', true)::uuid;
      IF uid IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
      END IF;

      INSERT INTO projects (user_id, title)
        VALUES (uid, trim(project_title))
        RETURNING * INTO proj;

      INSERT INTO documents (user_id, project_id, parent_id, kind, title, position)
        VALUES (uid, proj.id, NULL, 'folder', 'Chapter One', 0)
        RETURNING id INTO chapter_id;

      INSERT INTO documents (user_id, project_id, parent_id, kind, title, position)
        VALUES (uid, proj.id, chapter_id, 'document', 'Untitled', 0);

      RETURN proj;
    END;
    $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
       SET search_path = pg_catalog, public;
  `);
}
