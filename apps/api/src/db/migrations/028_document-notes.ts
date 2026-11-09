import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Adds the plain-text scratchpad behind the inspector's Notes tab. One note per
 * document or folder, so a column rather than a table.
 *
 * NOT NULL DEFAULT '' for the same reason as summary and pov: controlled inputs
 * get a string and `create_node` needs no change.
 *
 * Forward-only.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('documents', {
    notes: {
      type: 'text',
      notNull: true,
      default: '',
    },
  });

  // A trigger's column list can't be altered in place. Still scoped to the
  // metadata columns: see 023 for why `position` must stay out.
  pgm.sql(`
    DROP TRIGGER documents_touch_updated_at_trg ON documents;
    CREATE TRIGGER documents_touch_updated_at_trg
      BEFORE UPDATE OF title, status, summary, pov, notes ON documents
      FOR EACH ROW EXECUTE FUNCTION documents_touch_updated_at();
  `);
}
