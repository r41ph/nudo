import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new pg.Pool({
  user: process.env.DB_USER || 'writing_app',
  password: process.env.DB_PASSWORD || 'writing_app_dev',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'writing_app',
});

export const DATABASE_URL = `postgres://${process.env.DB_USER || 'writing_app'}:${process.env.DB_PASSWORD || 'writing_app_dev'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'writing_app'}`;
