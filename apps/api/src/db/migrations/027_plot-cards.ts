import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Plot cards: planning ideas placed in a plotline × beat cell, or Unassigned
 * when both are NULL.
 *
 * Forward-only.
 */

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable(
    'plot_cards',
    {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      user_id: {
        type: 'uuid',
        notNull: true,
        default: pgm.func("current_setting('app.current_user_id', true)::uuid"),
        references: 'users',
        onDelete: 'CASCADE',
      },
      project_id: {
        type: 'uuid',
        notNull: true,
        references: 'projects',
        onDelete: 'CASCADE',
      },
      // RESTRICT so a generic delete can't silently take cards with it; the
      // delete functions make that choice explicit.
      plotline_id: {
        type: 'uuid',
        references: 'plotlines',
        onDelete: 'RESTRICT',
      },
      beat_id: {
        type: 'uuid',
        references: 'plot_beats',
        onDelete: 'RESTRICT',
      },
      title: {
        type: 'text',
        notNull: true,
        default: '',
        check: 'char_length(title) <= 200',
      },
      description: { type: 'text', notNull: true, default: '' },
      position: { type: 'integer', notNull: true },
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
    },
    {
      constraints: {
        check: '(plotline_id IS NULL) = (beat_id IS NULL)',
      },
    }
  );

  pgm.createIndex('plot_cards', ['plotline_id', 'beat_id', 'position']);
  pgm.createIndex('plot_cards', ['project_id', 'position']);

  pgm.sql(`
    ALTER TABLE plot_cards ENABLE ROW LEVEL SECURITY;
    CREATE POLICY plot_cards_select_own ON plot_cards
      FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
    CREATE POLICY plot_cards_insert_own ON plot_cards
      FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));
    CREATE POLICY plot_cards_update_own ON plot_cards
      FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));
    CREATE POLICY plot_cards_delete_own ON plot_cards
      FOR DELETE USING (user_id::text = current_setting('app.current_user_id', true));
  `);

  pgm.sql(`COMMENT ON COLUMN plot_cards.user_id IS E'@omit create,update';`);

  // NEW.plotline_id is only evaluated inside the plot_cards branch, so the
  // shared function still works for tables without those columns.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION plot_check_owner()
    RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = pg_catalog, public
    AS $$
    BEGIN
      IF TG_OP = 'UPDATE' AND NEW.project_id <> OLD.project_id THEN
        RAISE EXCEPTION 'a plot row cannot move to another project';
      END IF;

      -- Under RLS a foreign project reads as NULL, which also fails here.
      IF (SELECT user_id FROM projects WHERE id = NEW.project_id)
           IS DISTINCT FROM NEW.user_id THEN
        RAISE EXCEPTION 'project does not belong to the plot row owner';
      END IF;

      IF TG_TABLE_NAME = 'plot_cards' THEN
        IF NEW.plotline_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM plotlines
           WHERE id = NEW.plotline_id AND project_id = NEW.project_id
        ) THEN
          RAISE EXCEPTION 'plotline does not belong to the card''s project';
        END IF;

        IF NEW.beat_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM plot_beats
           WHERE id = NEW.beat_id AND project_id = NEW.project_id
        ) THEN
          RAISE EXCEPTION 'beat does not belong to the card''s project';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$;
  `);

  pgm.sql(`
    CREATE TRIGGER plot_cards_check_owner_trg
      BEFORE INSERT OR UPDATE OF project_id, user_id, plotline_id, beat_id
      ON plot_cards
      FOR EACH ROW EXECUTE FUNCTION plot_check_owner();
    CREATE TRIGGER plot_cards_touch_updated_at_trg
      BEFORE UPDATE ON plot_cards
      FOR EACH ROW EXECUTE FUNCTION plot_touch_updated_at();
  `);

  // Parameters are prefixed (to_*) because plain plotline_id / beat_id would
  // be ambiguous with the columns inside the queries.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION move_plot_card(
      plot_card_id uuid,
      to_plotline_id uuid,
      to_beat_id uuid,
      ordered_ids uuid[]
    )
    RETURNS void AS $$
    DECLARE
      uid uuid;
      card_project_id uuid;
      from_plotline_id uuid;
      from_beat_id uuid;
    BEGIN
      uid := current_setting('app.current_user_id', true)::uuid;

      SELECT project_id, plotline_id, beat_id
        INTO card_project_id, from_plotline_id, from_beat_id
        FROM plot_cards
       WHERE id = plot_card_id AND user_id = uid;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'card not found';
      END IF;

      PERFORM 1 FROM projects
        WHERE id = card_project_id AND user_id = uid
        FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'project not found';
      END IF;

      IF (to_plotline_id IS NULL) <> (to_beat_id IS NULL) THEN
        RAISE EXCEPTION 'a card needs both a plotline and a beat, or neither';
      END IF;

      IF to_plotline_id IS NOT NULL AND (
        NOT EXISTS (
          SELECT 1 FROM plotlines
           WHERE id = to_plotline_id AND project_id = card_project_id
        )
        OR NOT EXISTS (
          SELECT 1 FROM plot_beats
           WHERE id = to_beat_id AND project_id = card_project_id
        )
      ) THEN
        RAISE EXCEPTION 'destination is not in the card''s project';
      END IF;

      -- Exactly the destination's cards plus the moved one: anything else
      -- would leave clashing positions behind.
      IF ordered_ids IS NULL
         OR cardinality(ordered_ids)
              <> (SELECT count(DISTINCT x) FROM unnest(ordered_ids) x)
         OR cardinality(ordered_ids) <> 1 + (
              SELECT count(*) FROM plot_cards
               WHERE project_id = card_project_id
                 AND plotline_id IS NOT DISTINCT FROM to_plotline_id
                 AND beat_id IS NOT DISTINCT FROM to_beat_id
                 AND id <> plot_card_id
            )
         OR EXISTS (
           SELECT 1 FROM unnest(ordered_ids) x
            WHERE x IS DISTINCT FROM plot_card_id
              AND NOT EXISTS (
                SELECT 1 FROM plot_cards
                 WHERE id = x
                   AND project_id = card_project_id
                   AND plotline_id IS NOT DISTINCT FROM to_plotline_id
                   AND beat_id IS NOT DISTINCT FROM to_beat_id
              )
         )
      THEN
        RAISE EXCEPTION 'ordered_ids must list the destination''s cards and the moved card once';
      END IF;

      UPDATE plot_cards
         SET plotline_id = to_plotline_id, beat_id = to_beat_id
       WHERE id = plot_card_id;

      UPDATE plot_cards c
         SET position = o.ord - 1
        FROM unnest(ordered_ids) WITH ORDINALITY AS o(id, ord)
       WHERE c.id = o.id;

      IF from_plotline_id IS DISTINCT FROM to_plotline_id
         OR from_beat_id IS DISTINCT FROM to_beat_id
      THEN
        UPDATE plot_cards c
           SET position = r.ord - 1
          FROM (
            SELECT id, row_number() OVER (ORDER BY position, id) AS ord
              FROM plot_cards
             WHERE project_id = card_project_id
               AND plotline_id IS NOT DISTINCT FROM from_plotline_id
               AND beat_id IS NOT DISTINCT FROM from_beat_id
          ) r
         WHERE c.id = r.id;
      END IF;
    END;
    $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
       SET search_path = pg_catalog, public;
  `);
}
