'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getToken, type StateResponse } from '@/lib/client';
import { LABELS } from '@/lib/labels';

const STAGE_TEXT: Record<string, string> = LABELS.admin.stageText;

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
      if (!s.isAdmin) setError(LABELS.admin.notAdmin);
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
        <div className="logo">{LABELS.admin.title}</div>
        <p className="tagline">{LABELS.admin.loading}</p>
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
        {LABELS.admin.title} · {state.code}
      </div>
      <div className="card">
        <h2>{STAGE_TEXT[stage] ?? stage}</h2>
        {stage === 'top15_open' && (
          <button onClick={() => act({ action: 'lock' }, LABELS.admin.lockMsg)}>{LABELS.admin.lockButton}</button>
        )}
        {stage === 'top15_locked' && (
          <button onClick={() => act({ action: 'open', stage: 'top5' }, LABELS.admin.openTop5Msg)}>{LABELS.admin.openTop5Button}</button>
        )}
        {stage === 'top5_locked' && (
          <button onClick={() => act({ action: 'open', stage: 'final' }, LABELS.admin.openFinalMsg)}>{LABELS.admin.openFinalButton}</button>
        )}
        {stage === 'final_locked' && (
          <button onClick={() => act({ action: 'finish' }, LABELS.admin.finishMsg)}>{LABELS.admin.finishButton}</button>
        )}
        {stage === 'done' && <p className="success">{LABELS.admin.doneText}</p>}
      </div>

      <div className="card">
        <h2>{LABELS.admin.resultsTitle}</h2>
        <label>{LABELS.admin.top15Label}</label>
        <input
          type="text"
          value={top15Input}
          onChange={(e) => setTop15Input(e.target.value)}
          placeholder={LABELS.admin.top15Placeholder}
        />
        <button
          className="small"
          disabled={hasTop15}
          onClick={() =>
            act(
              { action: 'setResults', stage: 'top15', ids: top15Input.split(',').map((s) => s.trim()).filter(Boolean) },
              LABELS.admin.resultsSaved('Top 15')
            )
          }
        >
          {hasTop15 ? LABELS.admin.top15Saved(namesOf(state.results.top15)) : LABELS.admin.top15Save}
        </button>

        <label>{LABELS.admin.top5Label}</label>
        <input
          type="text"
          value={top5Input}
          onChange={(e) => setTop5Input(e.target.value)}
          placeholder={LABELS.admin.top5Placeholder}
        />
        <button
          className="small"
          disabled={hasTop5}
          onClick={() =>
            act(
              { action: 'setResults', stage: 'top5', ids: top5Input.split(',').map((s) => s.trim()).filter(Boolean) },
              LABELS.admin.resultsSaved('Top 5')
            )
          }
        >
          {hasTop5 ? LABELS.admin.top5Saved(namesOf(state.results.top5)) : LABELS.admin.top5Save}
        </button>
      </div>

      <div className="card">
        <h2>{LABELS.admin.candidatesTitle(state.candidates.length)}</h2>
        <p className="hint">{LABELS.admin.candidatesHint}</p>
        <textarea
          rows={6}
          value={candidatesText}
          onChange={(e) => setCandidatesText(e.target.value)}
          placeholder={'Île-de-France\nAuvergne-Rhône-Alpes\nNormandie'}
        />
        <button className="small" onClick={() => act({ action: 'addCandidates', text: candidatesText }, LABELS.admin.importMsg)}>
          {LABELS.admin.importButton}
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
          {LABELS.admin.backLink}
        </a>
      </p>
    </main>
  );
}
