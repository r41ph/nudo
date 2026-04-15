import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('discussions', {
    id: {
      type: 'uuid',
      primaryKey: true,
    },
    document_id: {
      type: 'uuid',
      notNull: true,
      references: 'documents',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
    },
    is_resolved: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    document_content: {
      type: 'text',
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

  pgm.createIndex('discussions', 'document_id');

  pgm.createTable('discussion_comments', {
    id: {
      type: 'uuid',
      primaryKey: true,
    },
    discussion_id: {
      type: 'uuid',
      notNull: true,
      references: 'discussions',
      onDelete: 'CASCADE',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
    },
    content_rich: {
      type: 'jsonb',
      notNull: true,
    },
    is_edited: {
      type: 'boolean',
      notNull: true,
      default: false,
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

  pgm.createIndex('discussion_comments', 'discussion_id');

  pgm.sql(`
    ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;

    CREATE POLICY discussions_select ON discussions
      FOR SELECT USING (
        document_id IN (
          SELECT id FROM documents
          WHERE user_id::text = current_setting('app.current_user_id', true)
        )
      );
    CREATE POLICY discussions_insert ON discussions
      FOR INSERT WITH CHECK (
        document_id IN (
          SELECT id FROM documents
          WHERE user_id::text = current_setting('app.current_user_id', true)
        )
      );
    CREATE POLICY discussions_update ON discussions
      FOR UPDATE USING (
        document_id IN (
          SELECT id FROM documents
          WHERE user_id::text = current_setting('app.current_user_id', true)
        )
      );
    CREATE POLICY discussions_delete ON discussions
      FOR DELETE USING (
        document_id IN (
          SELECT id FROM documents
          WHERE user_id::text = current_setting('app.current_user_id', true)
        )
      );

    ALTER TABLE discussion_comments ENABLE ROW LEVEL SECURITY;

    CREATE POLICY discussion_comments_select ON discussion_comments
      FOR SELECT USING (
        discussion_id IN (
          SELECT d.id FROM discussions d
          JOIN documents doc ON doc.id = d.document_id
          WHERE doc.user_id::text = current_setting('app.current_user_id', true)
        )
      );
    CREATE POLICY discussion_comments_insert ON discussion_comments
      FOR INSERT WITH CHECK (
        discussion_id IN (
          SELECT d.id FROM discussions d
          JOIN documents doc ON doc.id = d.document_id
          WHERE doc.user_id::text = current_setting('app.current_user_id', true)
        )
      );
    CREATE POLICY discussion_comments_update ON discussion_comments
      FOR UPDATE USING (
        user_id::text = current_setting('app.current_user_id', true)
      );
    CREATE POLICY discussion_comments_delete ON discussion_comments
      FOR DELETE USING (
        user_id::text = current_setting('app.current_user_id', true)
      );
  `);
}
