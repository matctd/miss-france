import { NextResponse } from 'next/server';
import { db, getSalon, newToken } from '@/lib/db';

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const salon = getSalon(code);
  if (!salon) {
    return NextResponse.json({ error: 'Salon introuvable' }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const pseudo = typeof body?.pseudo === 'string' ? body.pseudo.trim().slice(0, 30) : '';
  if (!pseudo) {
    return NextResponse.json({ error: 'Pseudo requis' }, { status: 400 });
  }
  const existing = db
    .prepare('SELECT token FROM amis WHERE salon_id = ? AND pseudo = ?')
    .get(salon.id, pseudo) as { token: string } | undefined;
  if (existing) {
    return NextResponse.json({ error: 'Ce pseudo est déjà pris dans ce salon' }, { status: 409 });
  }
  const token = newToken();
  db.prepare('INSERT INTO amis (salon_id, pseudo, token) VALUES (?, ?, ?)').run(salon.id, pseudo, token);
  return NextResponse.json({ token, isAdmin: false });
}
