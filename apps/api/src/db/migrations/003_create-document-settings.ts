import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('document_settings', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    document_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'documents',
      onDelete: 'CASCADE',
    },
    enabled_tools: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func(`'["bold", "italic"]'::jsonb`),
    },
    toolbar_type: {
      type: 'text',
      notNull: true,
      default: pgm.func("'floating'"),
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

  pgm.sql(`
    ALTER TABLE document_settings ENABLE ROW LEVEL SECURITY;
    CREATE POLICY document_settings_select ON document_settings
      FOR SELECT USING (
        document_id IN (
          SELECT id FROM documents WHERE user_id::text = current_setting('app.current_user_id', true)
        )
      );
    CREATE POLICY document_settings_insert ON document_settings
      FOR INSERT WITH CHECK (
        document_id IN (
          SELECT id FROM documents WHERE user_id::text = current_setting('app.current_user_id', true)
        )
      );
    CREATE POLICY document_settings_update ON document_settings
      FOR UPDATE USING (
        document_id IN (
          SELECT id FROM documents WHERE user_id::text = current_setting('app.current_user_id', true)
        )
      );
  `);
}
