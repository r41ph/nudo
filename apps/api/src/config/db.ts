import pg from 'pg';
import { requireEnv } from './env.js';

const user = requireEnv('DB_USER');
const password = requireEnv('DB_PASSWORD');
const database = requireEnv('DB_NAME');
const host = process.env.DB_HOST || 'localhost';
const port = parseInt(process.env.DB_PORT || '5432', 10);

export const pool = new pg.Pool({ user, password, host, port, database });

export const DATABASE_URL = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
