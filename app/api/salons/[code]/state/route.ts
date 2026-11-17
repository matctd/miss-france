import { NextResponse } from 'next/server';
import { db, getSalon, effectiveStage, parseUtc } from '@/lib/db';
import { rankPlayers, type Picks, type Results, type Stage } from '@/lib/rules';

const ORDER_AFTER: Record<string, Stage[]> = {
  top15: ['top15_locked', 'top5_open', 'top5_locked', 'final_open', 'final_locked', 'done'],
  top5: ['top5_locked', 'final_open', 'final_locked', 'done'],
  order: ['final_locked', 'done'],
};

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const salon = getSalon(code);
  if (!salon) {
    return NextResponse.json({ error: 'Salon introuvable' }, { status: 404 });
  }
  const stage = effectiveStage(salon);
  const token = new URL(request.url).searchParams.get('token');

  const amis = db.prepare('SELECT * FROM amis WHERE salon_id = ? ORDER BY created_at').all(salon.id) as any[];
  const me = token ? amis.find((a) => a.token === token) : undefined;
  const isAdmin = Boolean(me?.is_admin);

  const candidates = (
    db.prepare('SELECT * FROM candidates WHERE salon_id = ? ORDER BY number').all(salon.id) as any[]
  ).filter((c) => isAdmin || !c.withdrawn);

  const picksRows = db
    .prepare(
      `SELECT p.* FROM picks p JOIN amis a ON a.id = p.ami_id WHERE a.salon_id = ?`
    )
    .all(salon.id) as any[];

  const picksByAmi = new Map<number, Picks>();
  const submittedAtByAmi = new Map<number, number>();
  for (const row of picksRows) {
    const current = picksByAmi.get(row.ami_id) || {};
    current[row.stage as keyof Picks] = JSON.parse(row.data);
    picksByAmi.set(row.ami_id, current);
    const ts = parseUtc(row.submitted_at);
    submittedAtByAmi.set(row.ami_id, Math.min(submittedAtByAmi.get(row.ami_id) ?? Infinity, ts));
  }

  const resultsRows = db
    .prepare('SELECT stage, data FROM resultats WHERE salon_id = ?')
    .all(salon.id) as any[];
  const results: Results = {};
  for (const row of resultsRows) {
    results[row.stage as keyof Results] = JSON.parse(row.data);
  }

  const revealedPicks: Record<string, Picks> = {};
  if (me) {
    for (const ami of amis) {
      const p = picksByAmi.get(ami.id);
      if (!p) continue;
      if (ami.id === me.id) {
        revealedPicks[ami.pseudo] = p;
        continue;
      }
      const visible: Picks = {};
      for (const key of ['top15', 'top5', 'order'] as const) {
        if (p[key] && ORDER_AFTER[key].includes(stage as Stage)) {
          visible[key] = p[key];
        }
      }
      if (Object.keys(visible).length > 0) revealedPicks[ami.pseudo] = visible;
    }
  }

  const players = amis.map((a) => ({
    pseudo: a.pseudo,
    picks: picksByAmi.get(a.id) || {},
    earliestSubmittedAt: submittedAtByAmi.get(a.id) ?? Number.MAX_SAFE_INTEGER,
  }));
  const classement = me ? rankPlayers(players, results) : [];

  const counts = {
    players: amis.length,
    top15: picksRows.filter((r) => r.stage === 'top15').length,
    top5: picksRows.filter((r) => r.stage === 'top5').length,
    order: picksRows.filter((r) => r.stage === 'order').length,
  };

  return NextResponse.json({
    code: salon.code,
    stage,
    openUntil: salon.open_until,
    serverNow: new Date().toISOString(),
    isAdmin,
    me: me ? { pseudo: me.pseudo, picks: picksByAmi.get(me.id) || {} } : null,
    candidates,
    counts,
    revealedPicks,
    results,
    classement,
  });
}
