import { NextResponse } from 'next/server';
import { db, getSalon, effectiveStage } from '@/lib/db';

function requireAdmin(salonId: number, token: unknown) {
  if (typeof token !== 'string') return null;
  const admin = db
    .prepare('SELECT * FROM amis WHERE token = ? AND salon_id = ? AND is_admin = 1')
    .get(token, salonId) as any;
  return admin;
}

function getResultat(salonId: number, stage: string): string[] | null {
  const row = db.prepare('SELECT data FROM resultats WHERE salon_id = ? AND stage = ?').get(salonId, stage) as any;
  return row ? JSON.parse(row.data) : null;
}

function saveResultat(salonId: number, stage: string, ids: string[]) {
  db.prepare(
    `INSERT INTO resultats (salon_id, stage, data) VALUES (?, ?, ?)
     ON CONFLICT(salon_id, stage) DO UPDATE SET data = excluded.data`
  ).run(salonId, stage, JSON.stringify(ids));
}

function validateIds(salonId: number, ids: unknown, max: number, min: number): string[] | string {
  if (!Array.isArray(ids) || ids.length < min || ids.length > max || new Set(ids.map(String)).size !== ids.length) {
    return `Il faut entre ${min} et ${max} miss distinctes`;
  }
  const placeholders = ids.map(() => '?').join(',');
  const valid = db
    .prepare(`SELECT id FROM candidates WHERE salon_id = ? AND id IN (${placeholders})`)
    .all(salonId, ...ids.map(String)) as any[];
  if (valid.length !== ids.length) return 'Certaines miss sont invalides';
  return ids.map(String);
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const salon = getSalon(code);
  if (!salon) {
    return NextResponse.json({ error: 'Salon introuvable' }, { status: 404 });
  }
  const body = await request.json().catch(() => null);
  if (!requireAdmin(salon.id, body?.token)) {
    return NextResponse.json({ error: 'Réservé à l’admin' }, { status: 403 });
  }
  const action = body?.action;
  const stage = effectiveStage(salon);

  if (action === 'lock') {
    if (!stage.endsWith('_open')) {
      return NextResponse.json({ error: 'Aucune fenêtre ouverte' }, { status: 409 });
    }
    db.prepare('UPDATE salons SET stage = ? WHERE id = ?').run(stage.replace('_open', '_locked'), salon.id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'open') {
    const target = body?.stage === 'top5' ? 'top5_open' : body?.stage === 'final' ? 'final_open' : null;
    if (!target) return NextResponse.json({ error: 'Étape invalide' }, { status: 400 });
    if (stage !== 'top15_locked' && stage !== 'top5_locked') {
      return NextResponse.json({ error: 'Verrouille d’abord l’étape en cours' }, { status: 409 });
    }
    const top15 = getResultat(salon.id, 'top15');
    const top5 = getResultat(salon.id, 'top5');
    if (target === 'top5_open' && (!top15 || top15.length !== 15)) {
      return NextResponse.json({ error: 'Saisis d’abord les 15 du top 15 complet' }, { status: 409 });
    }
    if (target === 'final_open' && (!top5 || top5.length !== 5)) {
      return NextResponse.json({ error: 'Saisis d’abord les 5 finalistes' }, { status: 409 });
    }
    db.prepare('UPDATE salons SET stage = ? WHERE id = ?').run(target, salon.id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'setResults') {
    const resStage = body?.stage;
    if (resStage !== 'top15' && resStage !== 'top5' && resStage !== 'podium') {
      return NextResponse.json({ error: 'Étape invalide' }, { status: 400 });
    }
    if (resStage === 'podium') {
      const validated = validateIds(salon.id, body?.ids, 3, 1);
      if (typeof validated === 'string') {
        return NextResponse.json({ error: validated }, { status: 400 });
      }
      saveResultat(salon.id, 'podium', validated);
      return NextResponse.json({ ok: true, count: validated.length });
    }
    const max = resStage === 'top15' ? 15 : 5;
    const validated = validateIds(salon.id, body?.ids, max, 1);
    if (typeof validated === 'string') {
      return NextResponse.json({ error: validated }, { status: 400 });
    }
    const existing = getResultat(salon.id, resStage) ?? [];
    const merged = [...new Set([...existing, ...validated])].slice(0, max);
    saveResultat(salon.id, resStage, merged);
    return NextResponse.json({ ok: true, count: merged.length });
  }

  if (action === 'resetResults') {
    const resStage = body?.stage;
    if (resStage !== 'top15' && resStage !== 'top5' && resStage !== 'podium') {
      return NextResponse.json({ error: 'Étape invalide' }, { status: 400 });
    }
    db.prepare('DELETE FROM resultats WHERE salon_id = ? AND stage = ?').run(salon.id, resStage);
    return NextResponse.json({ ok: true });
  }

  if (action === 'addCandidates') {
    const text = typeof body?.text === 'string' ? body.text : '';
    const regions = text
      .split('\n')
      .map((r: string) => r.trim().slice(0, 80))
      .filter(Boolean);
    if (regions.length === 0) {
      return NextResponse.json({ error: 'Une région par ligne (au moins une)' }, { status: 400 });
    }
    const insert = db.prepare('INSERT INTO candidates (salon_id, region) VALUES (?, ?)');
    for (const region of regions) insert.run(salon.id, region);
    return NextResponse.json({ ok: true, added: regions.length });
  }

  if (action === 'finish') {
    const top5 = getResultat(salon.id, 'top5');
    const podium = getResultat(salon.id, 'podium');
    if (!top5 || top5.length !== 5 || !podium || podium.length !== 3) {
      return NextResponse.json(
        { error: 'Saisis d’abord les 5 finalistes et le podium complet' },
        { status: 409 }
      );
    }
    db.prepare(`UPDATE salons SET stage = 'done' WHERE id = ?`).run(salon.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}
