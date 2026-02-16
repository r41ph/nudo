import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('document_versions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    document_id: {
      type: 'uuid',
      notNull: true,
      references: 'documents',
      onDelete: 'CASCADE',
    },
    content: {
      type: 'jsonb',
      notNull: true,
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
    version_number: {
      type: 'integer',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createIndex('document_versions', 'document_id');
  pgm.createIndex('document_versions', ['document_id', 'version_number'], {
    unique: true,
  });

  pgm.sql(`
    ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY document_versions_select ON document_versions
      FOR SELECT USING (
        document_id IN (
          SELECT id FROM documents WHERE user_id::text = current_setting('app.current_user_id', true)
        )
      );
    CREATE POLICY document_versions_insert ON document_versions
      FOR INSERT WITH CHECK (
        document_id IN (
          SELECT id FROM documents WHERE user_id::text = current_setting('app.current_user_id', true)
        )
      );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('document_versions');
}
