import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('users', {
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
  });

  pgm.dropTable('document_settings');
}
