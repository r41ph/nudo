import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('folders', {
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
    name: {
      type: 'text',
      notNull: true,
      default: pgm.func("'Untitled Folder'"),
    },
    position: {
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

  pgm.createIndex('folders', 'user_id');

  pgm.sql(`
    ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
    CREATE POLICY folders_select_own ON folders
      FOR SELECT USING (user_id::text = current_setting('app.current_user_id', true));
    CREATE POLICY folders_insert_own ON folders
      FOR INSERT WITH CHECK (user_id::text = current_setting('app.current_user_id', true));
    CREATE POLICY folders_update_own ON folders
      FOR UPDATE USING (user_id::text = current_setting('app.current_user_id', true));
    CREATE POLICY folders_delete_own ON folders
      FOR DELETE USING (user_id::text = current_setting('app.current_user_id', true));
  `);

  pgm.addColumn('documents', {
    folder_id: {
      type: 'uuid',
      references: 'folders',
      onDelete: 'SET NULL',
    },
  });

  pgm.createIndex('documents', 'folder_id');
}
