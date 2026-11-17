import { NextResponse } from 'next/server';
import { db, newSalonCode, newToken } from '@/lib/db';
import { DEFAULT_CANDIDATES } from '@/lib/candidates';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const pseudo = typeof body?.pseudo === 'string' ? body.pseudo.trim().slice(0, 30) : '';
  if (!pseudo) {
    return NextResponse.json({ error: 'Pseudo requis' }, { status: 400 });
  }
  const code = newSalonCode();
  const adminToken = newToken();
  const salonId = db.prepare('INSERT INTO salons (code) VALUES (?)').run(code).lastInsertRowid as number;
  db.prepare('INSERT INTO amis (salon_id, pseudo, token, is_admin) VALUES (?, ?, ?, 1)').run(salonId, pseudo, adminToken);
  const insertCandidate = db.prepare('INSERT INTO candidates (salon_id, region) VALUES (?, ?)');
  for (const region of DEFAULT_CANDIDATES) insertCandidate.run(salonId, region);
  return NextResponse.json({ code, token: adminToken, isAdmin: true });
}
