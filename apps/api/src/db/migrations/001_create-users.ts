import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    email: {
      type: 'text',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'text',
      notNull: true,
    },
    display_name: {
      type: 'text',
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
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    CREATE POLICY users_select_own ON users
      FOR SELECT USING (id::text = current_setting('app.current_user_id', true));
    CREATE POLICY users_update_own ON users
      FOR UPDATE USING (id::text = current_setting('app.current_user_id', true));
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('users');
}
