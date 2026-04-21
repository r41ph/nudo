import { Router, type Router as RouterType } from 'express';
import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { hashPassword, comparePassword, signToken } from './utils.js';
import { WELCOME_DOCUMENT, WELCOME_WORD_COUNT } from '../constants/welcome-document.js';

export const authRouter: RouterType = Router();

authRouter.post('/register', async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
      email,
    ]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3) RETURNING id, email, display_name`,
      [email, passwordHash, displayName || null]
    );
    const user = result.rows[0];
    const token = signToken({ userId: user.id, email: user.email });

    // Create a welcome document for the new user
    const welcomeDoc = await pool.query(
      `INSERT INTO documents (user_id, title, slug, content, plain_text, word_count)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6) RETURNING id`,
      [user.id, WELCOME_DOCUMENT.title, WELCOME_DOCUMENT.slug, JSON.stringify(WELCOME_DOCUMENT.content), WELCOME_DOCUMENT.plainText, WELCOME_WORD_COUNT]
    );
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, display_name FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.setHeader('Clear-Site-Data', '"cache", "storage"');
  res.status(204).end();
});

authRouter.post('/refresh', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const { verifyToken } = await import('./utils.js');
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const token = signToken({ userId: decoded.userId, email: decoded.email });
  res.json({ token });
});
