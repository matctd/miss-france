import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import type { Stage } from './rules';

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const dataDir = process.env.DB_DIR || path.join(process.cwd(), 'data');
if (!isBuildPhase) mkdirSync(dataDir, { recursive: true });

// During `next build`, use an in-memory DB so parallel build workers never contend for the on-disk file.
export const db = new Database(isBuildPhase ? ':memory:' : path.join(dataDir, 'miss-pronos.db'));
if (!isBuildPhase) db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS salons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  stage TEXT NOT NULL DEFAULT 'top15_open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  salon_id INTEGER NOT NULL REFERENCES salons(id),
  region TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS amis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  salon_id INTEGER NOT NULL REFERENCES salons(id),
  pseudo TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(salon_id, pseudo)
);
CREATE TABLE IF NOT EXISTS picks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ami_id INTEGER NOT NULL REFERENCES amis(id),
  stage TEXT NOT NULL,
  data TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(ami_id, stage)
);
CREATE TABLE IF NOT EXISTS resultats (
  salon_id INTEGER NOT NULL REFERENCES salons(id),
  stage TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (salon_id, stage)
);
`);

export type SalonRow = {
  id: number;
  code: string;
  stage: Stage;
};

export function getSalon(code: string): SalonRow | undefined {
  return db.prepare('SELECT * FROM salons WHERE code = ?').get(code.toUpperCase()) as SalonRow | undefined;
}

export function effectiveStage(salon: SalonRow): Stage {
  return salon.stage;
}

export function newToken(): string {
  return randomBytes(16).toString('hex');
}

export function newSalonCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 5; i++) code += alphabet[randomBytes(1)[0] % alphabet.length];
    if (!getSalon(code)) return code;
  }
  throw new Error('Impossible de générer un code de salon');
}

export function parseUtc(sqlUtc: string | null): number {
  if (!sqlUtc) return Number.MAX_SAFE_INTEGER;
  return new Date(sqlUtc.replace(' ', 'T') + 'Z').getTime();
}
