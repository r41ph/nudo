import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

function findRepoRoot(start: string): string {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('Could not locate repo root (no pnpm-workspace.yaml found)');
}

const repoRoot = findRepoRoot(import.meta.dirname);
dotenv.config({ path: path.join(repoRoot, '.env') });

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
