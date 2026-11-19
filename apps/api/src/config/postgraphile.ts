import { postgraphile } from 'postgraphile';
import type { Request } from 'express';
import { pool } from './db.js';
import { BODY_SIZE_LIMIT } from '../constants/auth.constants.js';

interface AuthRequest extends Request {
  userId?: string;
}

export const postgraphileMiddleware = postgraphile(pool, 'public', {
  watchPg: process.env.NODE_ENV !== 'production',
  graphiql: process.env.NODE_ENV !== 'production',
  enhanceGraphiql: process.env.NODE_ENV !== 'production',
  dynamicJson: true,
  bodySizeLimit: BODY_SIZE_LIMIT,
  setofFunctionsContainNulls: false,
  ignoreRBAC: false,
  showErrorStack: process.env.NODE_ENV !== 'production',
  extendedErrors:
    process.env.NODE_ENV !== 'production'
      ? ['hint', 'detail', 'errcode']
      : ['errcode'],
  graphileBuildOptions: {
    pgOmitListSuffix: true,
  },
  pgSettings: async (req: Request) => {
    const authReq = req as AuthRequest;
    const settings: Record<string, string> = {
      role: 'nudo_visitor',
    };
    if (authReq.userId) {
      settings['app.current_user_id'] = authReq.userId;
    }
    return settings;
  },
});
