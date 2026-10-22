import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Plot foundation: plotlines and beats, owned by a project.
 *
 * user_id stays the RLS key and is filled from the session; project_id is the
 * domain owner, and plot_check_owner keeps the two consistent. There is no
 * plots table: a project has exactly one Plot.
 *
 * Forward-only.
 */

const PLOTLINE_COLORS = [
  'blue',
  'green',
  'plum',
  'ochre',
  'teal',
  'rose',
  'slate',
];

const PLOT_TABLES = ['plotlines', 'plot_beats'] as const;

export async function up(pgm: MigrationBuilder): Promise<void> {
  const commonColumns = {
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
  } as const;

  pgm.createTable('plotlines', {
    ...commonColumns,
    name: {
      type: 'text',
      notNull: true,
      default: 'Untitled plotline',
      check: 'char_length(trim(name)) BETWEEN 1 AND 120',
    },
    color: {
      type: 'text',
      notNull: true,
      // Keys, not hex values, so a colour can be retuned without a migration.
      check: `color IN (${PLOTLINE_COLORS.map((c) => `'${c}'`).join(', ')})`,
    },
  });

  pgm.createTable('plot_beats', {
    ...commonColumns,
    name: {
      type: 'text',
      notNull: true,
      default: 'Untitled beat',
      check: 'char_length(trim(name)) BETWEEN 1 AND 120',
    },
  });

  pgm.sql(`
    CREATE OR REPLACE FUNCTION plot_touch_updated_at()
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

  // PostGraphile also exposes the generic create and update mutations, so the
  // ownership rules have to hold on every write path, not just in functions.
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

      RETURN NEW;
    END;
    $$;
  `);

  for (const table of PLOT_TABLES) {
    pgm.createIndex(table, ['project_id', 'position']);

    pgm.sql(`
      ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
      CREATE POLICY ${table}_select_own ON ${table}
        FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
      CREATE POLICY ${table}_insert_own ON ${table}
        FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));
      CREATE POLICY ${table}_update_own ON ${table}
        FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));
      CREATE POLICY ${table}_delete_own ON ${table}
        FOR DELETE USING (user_id::text = current_setting('app.current_user_id', true));
    `);

    // A client-supplied user_id could only ever be wrong.
    pgm.sql(`COMMENT ON COLUMN ${table}.user_id IS E'@omit create,update';`);

    pgm.sql(`
      CREATE TRIGGER ${table}_check_owner_trg
        BEFORE INSERT OR UPDATE OF project_id, user_id ON ${table}
        FOR EACH ROW EXECUTE FUNCTION plot_check_owner();
      CREATE TRIGGER ${table}_touch_updated_at_trg
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION plot_touch_updated_at();
    `);
  }

  // FOR UPDATE on the project serialises concurrent calls, so a double click
  // can't create two starter plots.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION start_plot(plot_project_id uuid)
    RETURNS void AS $$
    DECLARE
      uid uuid;
    BEGIN
      uid := current_setting('app.current_user_id', true)::uuid;

      PERFORM 1 FROM projects
        WHERE id = plot_project_id AND user_id = uid
        FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'project not found';
      END IF;

      IF EXISTS (SELECT 1 FROM plotlines WHERE project_id = plot_project_id)
         OR EXISTS (SELECT 1 FROM plot_beats WHERE project_id = plot_project_id)
      THEN
        RETURN;
      END IF;

      INSERT INTO plotlines (user_id, project_id, name, color, position)
        VALUES (uid, plot_project_id, 'Main plot', 'blue', 0);

      INSERT INTO plot_beats (user_id, project_id, name, position)
        VALUES (uid, plot_project_id, 'Beginning', 0),
               (uid, plot_project_id, 'Middle', 1),
               (uid, plot_project_id, 'End', 2);
    END;
    $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
       SET search_path = pg_catalog, public;
  `);

  for (const [fn, table] of [
    ['reorder_plotlines', 'plotlines'],
    ['reorder_plot_beats', 'plot_beats'],
  ] as const) {
    // The list must be exactly the project's rows: a partial list would leave
    // the others with clashing positions.
    pgm.sql(`
      CREATE OR REPLACE FUNCTION ${fn}(plot_project_id uuid, ordered_ids uuid[])
      RETURNS void AS $$
      DECLARE
        uid uuid;
      BEGIN
        uid := current_setting('app.current_user_id', true)::uuid;

        PERFORM 1 FROM projects
          WHERE id = plot_project_id AND user_id = uid
          FOR UPDATE;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'project not found';
        END IF;

        IF ordered_ids IS NULL
           OR cardinality(ordered_ids)
                <> (SELECT count(DISTINCT x) FROM unnest(ordered_ids) x)
           OR cardinality(ordered_ids)
                <> (SELECT count(*) FROM ${table} WHERE project_id = plot_project_id)
           OR EXISTS (
             SELECT 1 FROM unnest(ordered_ids) x
              WHERE NOT EXISTS (
                SELECT 1 FROM ${table}
                 WHERE id = x AND project_id = plot_project_id
              )
           )
        THEN
          RAISE EXCEPTION 'ordered_ids must list each of the project''s rows once';
        END IF;

        UPDATE ${table} t
           SET position = o.ord - 1
          FROM unnest(ordered_ids) WITH ORDINALITY AS o(id, ord)
         WHERE t.id = o.id;
      END;
      $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
         SET search_path = pg_catalog, public;
    `);
  }
}
