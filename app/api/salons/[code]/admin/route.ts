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

function validateIds(salonId: number, ids: unknown, expected: number): string[] | string {
  if (!Array.isArray(ids) || ids.length !== expected || new Set(ids.map(String)).size !== expected) {
    return `Il faut exactement ${expected} miss distinctes`;
  }
  const placeholders = ids.map(() => '?').join(',');
  const valid = db
    .prepare(`SELECT id FROM candidates WHERE salon_id = ? AND id IN (${placeholders})`)
    .all(salonId, ...ids.map(String)) as any[];
  if (valid.length !== expected) return 'Certaines miss sont invalides';
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
    db.prepare('UPDATE salons SET stage = ?, open_until = NULL WHERE id = ?').run(
      stage.replace('_open', '_locked'),
      salon.id
    );
    return NextResponse.json({ ok: true });
  }

  if (action === 'open') {
    const target = body?.stage === 'top5' ? 'top5_open' : body?.stage === 'final' ? 'final_open' : null;
    if (!target) return NextResponse.json({ error: 'Étape invalide' }, { status: 400 });
    if (stage !== 'top15_locked' && stage !== 'top5_locked') {
      return NextResponse.json({ error: 'Verrouille d’abord l’étape en cours' }, { status: 409 });
    }
    if (target === 'top5_open' && !getResultat(salon.id, 'top15')) {
      return NextResponse.json({ error: 'Saisis d’abord les résultats du top 15' }, { status: 409 });
    }
    if (target === 'final_open' && !getResultat(salon.id, 'top5')) {
      return NextResponse.json({ error: 'Saisis d’abord les résultats du top 5' }, { status: 409 });
    }
    const minutes = Number(body?.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 120) {
      return NextResponse.json({ error: 'Durée invalide (1 à 120 minutes)' }, { status: 400 });
    }
    const until = new Date(Date.now() + minutes * 60_000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
    db.prepare('UPDATE salons SET stage = ?, open_until = ? WHERE id = ?').run(target, until, salon.id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'setResults') {
    const resStage = body?.stage;
    if (resStage !== 'top15' && resStage !== 'top5') {
      return NextResponse.json({ error: 'Étape invalide' }, { status: 400 });
    }
    const expected = resStage === 'top15' ? 15 : 5;
    const validated = validateIds(salon.id, body?.ids, expected);
    if (typeof validated === 'string') {
      return NextResponse.json({ error: validated }, { status: 400 });
    }
    db.prepare(
      `INSERT INTO resultats (salon_id, stage, data) VALUES (?, ?, ?)
       ON CONFLICT(salon_id, stage) DO UPDATE SET data = excluded.data`
    ).run(salon.id, resStage, JSON.stringify(validated));
    return NextResponse.json({ ok: true });
  }

  if (action === 'withdraw') {
    const candidateId = Number(body?.candidateId);
    const candidate = db
      .prepare('SELECT id FROM candidates WHERE salon_id = ? AND id = ?')
      .get(salon.id, candidateId) as any;
    if (!candidate) return NextResponse.json({ error: 'Candidate introuvable' }, { status: 404 });
    db.prepare('UPDATE candidates SET withdrawn = 1 WHERE id = ?').run(candidateId);
    return NextResponse.json({ ok: true });
  }

  if (action === 'addCandidates') {
    const text = typeof body?.text === 'string' ? body.text : '';
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const insert = db.prepare('INSERT INTO candidates (salon_id, number, name, region) VALUES (?, ?, ?, ?)');
    let added = 0;
    for (const line of lines) {
      const parts = line.split('|').map((p: string) => p.trim());
      const number = Number(parts[0]);
      if (!Number.isInteger(number) || !parts[1]) continue;
      insert.run(salon.id, number, parts[1].slice(0, 80), (parts[2] || '').slice(0, 80));
      added++;
    }
    if (added === 0) {
      return NextResponse.json({ error: 'Format attendu : numéro | nom | région (une miss par ligne)' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, added });
  }

  if (action === 'finish') {
    if (!getResultat(salon.id, 'top5')) {
      return NextResponse.json({ error: 'Saisis d’abord les résultats du top 5' }, { status: 409 });
    }
    db.prepare(`UPDATE salons SET stage = 'done', open_until = NULL WHERE id = ?`).run(salon.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}
