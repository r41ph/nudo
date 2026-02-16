import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('documents', {
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
      default: pgm.func("'Untitled'"),
    },
    slug: {
      type: 'text',
      notNull: true,
    },
    content: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'[]'::jsonb"),
    },
    plain_text: {
      type: 'text',
      notNull: true,
      default: pgm.func("''"),
    },
    word_count: {
      type: 'integer',
      notNull: true,
      default: 0,
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

  pgm.createIndex('documents', 'user_id');
  pgm.createIndex('documents', ['user_id', 'slug'], { unique: true });

  pgm.sql(`
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
    CREATE POLICY documents_select_own ON documents
      FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
    CREATE POLICY documents_insert_own ON documents
      FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));
    CREATE POLICY documents_update_own ON documents
      FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));
    CREATE POLICY documents_delete_own ON documents
      FOR DELETE USING (user_id::text = current_setting('app.current_user_id', true));
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('documents');
}
