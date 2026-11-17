import { NextResponse } from 'next/server';
import { db, getSalon, effectiveStage } from '@/lib/db';

const SIZES: Record<string, number> = { top15: 15, top5: 5, order: 5 };
const OPEN_STAGES: Record<string, string> = {
  top15: 'top15_open',
  top5: 'top5_open',
  order: 'final_open',
};

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const salon = getSalon(code);
  if (!salon) {
    return NextResponse.json({ error: 'Salon introuvable' }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  const me = body?.token
    ? (db.prepare('SELECT * FROM amis WHERE token = ? AND salon_id = ?').get(body.token, salon.id) as any)
    : undefined;
  if (!me) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 403 });
  }
  const stage = typeof body?.stage === 'string' ? body.stage : '';
  if (!SIZES[stage] || OPEN_STAGES[stage] !== salon.stage) {
    return NextResponse.json({ error: 'Cette étape n’est pas ouverte' }, { status: 409 });
  }
  if (salon.open_until && Date.now() > new Date(salon.open_until.replace(' ', 'T') + 'Z').getTime()) {
    return NextResponse.json({ error: 'Fenêtre expirée' }, { status: 409 });
  }
  const data = Array.isArray(body?.data) ? body.data : [];
  const distinct = new Set(data.map(String));
  if (distinct.size !== SIZES[stage] || data.length !== SIZES[stage]) {
    return NextResponse.json({ error: `Il faut exactement ${SIZES[stage]} miss distinctes` }, { status: 400 });
  }
  const placeholders = data.map(() => '?').join(',');
  const valid = db
    .prepare(
      `SELECT id FROM candidates WHERE salon_id = ? AND withdrawn = 0 AND id IN (${placeholders})`
    )
    .all(salon.id, ...data.map(String)) as any[];
  if (valid.length !== SIZES[stage]) {
    return NextResponse.json({ error: 'Certaines miss sont invalides' }, { status: 400 });
  }
  if (stage === 'order') {
    const top5 = db
      .prepare(`SELECT data FROM resultats WHERE salon_id = ? AND stage = 'top5'`)
      .get(salon.id) as { data: string } | undefined;
    if (top5) {
      const realTop5: string[] = JSON.parse(top5.data);
      if (!data.every((id: string) => realTop5.includes(String(id)))) {
        return NextResponse.json({ error: 'Le classement doit reprendre les 5 finalistes' }, { status: 400 });
      }
    }
  }
  db.prepare(
    `INSERT INTO picks (ami_id, stage, data) VALUES (?, ?, ?)
     ON CONFLICT(ami_id, stage) DO UPDATE SET data = excluded.data`
  ).run(me.id, stage, JSON.stringify(data.map(String)));
  return NextResponse.json({ ok: true });
}
