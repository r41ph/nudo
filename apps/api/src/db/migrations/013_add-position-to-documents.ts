import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('documents', {
    position: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
  });

  // Backfill positions based on updated_at order, grouped by folder_id
  pgm.sql(`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY COALESCE(folder_id, '00000000-0000-0000-0000-000000000000')
        ORDER BY updated_at DESC
      ) - 1 AS pos
      FROM documents
    )
    UPDATE documents SET position = ranked.pos
    FROM ranked WHERE documents.id = ranked.id;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('documents', 'position');
}
