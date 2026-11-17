'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getToken, type StateResponse } from '@/lib/client';

const STAGE_TEXT: Record<string, string> = {
  top15_open: 'Étape 1 · Top 15 — OUVERT',
  top15_locked: 'Étape 1 · Top 15 — verrouillé',
  top5_open: 'Étape 2 · Top 5 — OUVERT',
  top5_locked: 'Étape 2 · Top 5 — verrouillé',
  final_open: 'Étape 3 · Classement — OUVERT',
  final_locked: 'Étape 3 · Classement — verrouillé',
  done: 'Soirée terminée',
};

export default function AdminPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code || '').toUpperCase();
  const [token, setTok] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [top15Input, setTop15Input] = useState('');
  const [top5Input, setTop5Input] = useState('');
  const [candidatesText, setCandidatesText] = useState('');

  useEffect(() => {
    setTok(getToken(code));
    setChecked(true);
  }, [code]);

  const refresh = useCallback(async () => {
    try {
      const s = await api<StateResponse>(`/api/salons/${code}/state${token ? `?token=${token}` : ''}`);
      setState(s);
      if (!s.isAdmin) setError('Ce lien n’est pas une console admin (token non admin).');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [code, token]);

  useEffect(() => {
    if (!checked) return;
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [checked, refresh]);

  async function act(payload: Record<string, unknown>, okMsg: string) {
    setError('');
    setInfo('');
    try {
      await api(`/api/salons/${code}/admin`, { token, ...payload });
      setInfo(okMsg);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!checked) return <main className="container" />;
  if (!state) {
    return (
      <main className="container">
        <div className="logo">🎛️ Console admin</div>
        <p className="tagline">Chargement…</p>
        {error && <p className="error">{error}</p>}
      </main>
    );
  }

  const byId = new Map(state.candidates.map((c) => [String(c.id), c]));
  const stage = state.stage;
  const hasTop15 = Boolean(state.results.top15);
  const hasTop5 = Boolean(state.results.top5);

  function namesOf(ids: string[] | undefined): string {
    return (ids ?? []).map((id) => byId.get(id)?.region ?? '?').join(', ');
  }

  return (
    <main className="container">
      <div className="logo" style={{ fontSize: 20, padding: '16px 0 4px' }}>
        🎛️ Console admin · {state.code}
      </div>
      <div className="card">
        <h2>{STAGE_TEXT[stage] ?? stage}</h2>
        {stage === 'top15_open' && (
          <button onClick={() => act({ action: 'lock' }, '🔒 Top 15 verrouillé')}>🔒 VERROUILLER MAINTENANT</button>
        )}
        {stage === 'top15_locked' && (
          <button onClick={() => act({ action: 'open', stage: 'top5' }, 'Fenêtre Top 5 ouverte')}>▶️ OUVRIR LA FENÊTRE TOP 5</button>
        )}
        {stage === 'top5_locked' && (
          <button onClick={() => act({ action: 'open', stage: 'final' }, 'Fenêtre Classement ouverte')}>▶️ OUVRIR LA FENÊTRE CLASSEMENT</button>
        )}
        {stage === 'final_locked' && (
          <button onClick={() => act({ action: 'finish' }, '🎉 Soirée terminée')}>🏁 TERMINER LA SOIRÉE</button>
        )}
        {stage === 'done' && <p className="success">La soirée est terminée — classement final visible par tous.</p>}
      </div>

      <div className="card">
        <h2>📝 Résultats réels (au fil du direct)</h2>
        <label>Top 15 — IDs des 15 régions, séparés par des virgules</label>
        <input
          type="text"
          value={top15Input}
          onChange={(e) => setTop15Input(e.target.value)}
          placeholder="Ex : 1, 4, 7, …"
        />
        <button
          className="small"
          disabled={hasTop15}
          onClick={() =>
            act(
              { action: 'setResults', stage: 'top15', ids: top15Input.split(',').map((s) => s.trim()).filter(Boolean) },
              '✅ Top 15 réel enregistré'
            )
          }
        >
          {hasTop15 ? `✔ Top 15 saisi : ${namesOf(state.results.top15)}` : 'Enregistrer le top 15'}
        </button>

        <label>Top 5 — IDs dans l’ordre : gagnante, 1re dauphine, 2e dauphine, puis les 2 dernières (peu importe l’ordre)</label>
        <input
          type="text"
          value={top5Input}
          onChange={(e) => setTop5Input(e.target.value)}
          placeholder="Ex : 1, 4, 3, 2, 7"
        />
        <button
          className="small"
          disabled={hasTop5}
          onClick={() =>
            act(
              { action: 'setResults', stage: 'top5', ids: top5Input.split(',').map((s) => s.trim()).filter(Boolean) },
              '✅ Top 5 réel enregistré'
            )
          }
        >
          {hasTop5 ? `✔ Top 5 saisi : ${namesOf(state.results.top5)}` : 'Enregistrer le top 5'}
        </button>
      </div>

      <div className="card">
        <h2>👥 Candidates ({state.candidates.length})</h2>
        <p className="hint">Une région par ligne, une ligne par miss.</p>
        <textarea
          rows={6}
          value={candidatesText}
          onChange={(e) => setCandidatesText(e.target.value)}
          placeholder={'Île-de-France\nAuvergne-Rhône-Alpes\nNormandie'}
        />
        <button className="small" onClick={() => act({ action: 'addCandidates', text: candidatesText }, 'Candidates ajoutées')}>
          Importer
        </button>
        <div style={{ marginTop: 12 }}>
          {state.candidates.map((c) => (
            <span className="chip" key={c.id}>
              {c.id} · {c.region}
            </span>
          ))}
        </div>
      </div>

      {info && <p className="success">{info}</p>}
      {error && <p className="error">{error}</p>}
      <p style={{ textAlign: 'center', marginTop: 16 }}>
        <a className="link" href={`/salon/${code}`}>
          ← Retour à l’écran joueur
        </a>
      </p>
    </main>
  );
}
