import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Plotline colours become neutral keys (color1–color8). The web app maps each
 * key to its hex value and label, so the palette can be redesigned without
 * another migration.
 *
 * Forward-only.
 */

const PLOTLINE_COLOR_COUNT = 8;

// The named keys from 025, mapped to the slot that replaces them.
const LEGACY_COLORS = {
  blue: 'color6',
  green: 'color4',
  plum: 'color7',
  ochre: 'color2',
  teal: 'color6',
  rose: 'color8',
  slate: 'color5',
};

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('plotlines', 'plotlines_color_check');

  for (const [from, to] of Object.entries(LEGACY_COLORS)) {
    pgm.sql(`UPDATE plotlines SET color = '${to}' WHERE color = '${from}'`);
  }

  pgm.addConstraint('plotlines', 'plotlines_color_check', {
    check: `color ~ '^color[1-${PLOTLINE_COLOR_COUNT}]$'`,
  });

  // Same as 025 except the starter plotline's colour, which was 'blue'.
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
        VALUES (uid, plot_project_id, 'Main plot', 'color1', 0);

      INSERT INTO plot_beats (user_id, project_id, name, position)
        VALUES (uid, plot_project_id, 'Beginning', 0),
               (uid, plot_project_id, 'Middle', 1),
               (uid, plot_project_id, 'End', 2);
    END;
    $$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
       SET search_path = pg_catalog, public;
  `);
}
