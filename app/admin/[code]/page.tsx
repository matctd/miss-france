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
  const [top15Sel, setTop15Sel] = useState('');
  const [top5Sel, setTop5Sel] = useState('');
  const [podiumSel, setPodiumSel] = useState('');
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
  const top15 = state.results.top15 ?? [];
  const top5 = state.results.top5 ?? [];
  const podium = state.results.podium ?? [];

  function regionsOf(ids: string[]): string {
    return ids.map((id) => byId.get(id)?.region ?? '?').join(', ');
  }

  function ResultsBlock({
    resStage,
    max,
    label,
    saved,
    addLabel,
    chooseLabel,
    savedLabel,
    selected,
    setSelected,
    candidates,
  }: {
    resStage: 'top15' | 'top5' | 'podium';
    max: number;
    label: string;
    saved: string[];
    addLabel: string;
    chooseLabel: string;
    savedLabel: (regions: string) => string;
    selected: string;
    setSelected: (v: string) => void;
    candidates: StateResponse['candidates'];
  }) {
    const complete = saved.length === max;
    const available = candidates.filter((c) => !saved.includes(String(c.id)));
    return (
      <div className="admin-section">
        <label>{label}</label>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} disabled={complete}>
          <option value="">{chooseLabel}</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.region}
            </option>
          ))}
        </select>
        <button
          className="small"
          disabled={complete || !selected}
          onClick={() =>
            act(
              {
                action: 'setResults',
                stage: resStage,
                ids: [...saved, selected],
              },
              LABELS.admin.resultsSaved(resStage === 'podium' ? 'Podium' : resStage === 'top15' ? 'Top 15' : 'Top 5')
            ).then(() => setSelected(''))
          }
        >
          {complete ? `✔ ${saved.length}/${max}` : `➕ ${addLabel} (${saved.length}/${max})`}
        </button>
        {saved.length > 0 && (
          <>
            <p className="hint">{savedLabel(regionsOf(saved))}</p>
            <button className="small secondary danger" onClick={() => act({ action: 'resetResults', stage: resStage }, 'Résultats réinitialisés')}>
              Réinitialiser
            </button>
          </>
        )}
      </div>
    );
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
        {stage === 'top5_open' && (
          <>
            <button onClick={() => act({ action: 'lock' }, LABELS.admin.lockTop5Msg)}>{LABELS.admin.lockTop5Button}</button>
            <p className="hint">Saisis les 5 finalistes ci-dessous pendant l’annonce, puis verrouille.</p>
          </>
        )}
        {stage === 'top5_locked' && (
          <button onClick={() => act({ action: 'open', stage: 'final' }, LABELS.admin.openFinalMsg)}>{LABELS.admin.openFinalButton}</button>
        )}
        {stage === 'final_open' && (
          <>
            <button onClick={() => act({ action: 'lock' }, LABELS.admin.lockFinalMsg)}>{LABELS.admin.lockFinalButton}</button>
            <p className="hint">Saisis le podium ci-dessous pendant le couronnement, puis verrouille.</p>
          </>
        )}
        {stage === 'final_locked' && (
          <button onClick={() => act({ action: 'finish' }, LABELS.admin.finishMsg)}>{LABELS.admin.finishButton}</button>
        )}
        {stage === 'done' && <p className="success">{LABELS.admin.doneText}</p>}
      </div>

      <div className="card">
        <h2>{LABELS.admin.resultsTitle}</h2>

        <ResultsBlock
          resStage="top15"
          max={15}
          label={LABELS.admin.top15Label}
          saved={top15}
          addLabel={LABELS.admin.top15Save}
          chooseLabel={LABELS.admin.chooseMiss}
          savedLabel={LABELS.admin.top15Saved}
          selected={top15Sel}
          setSelected={setTop15Sel}
          candidates={state.candidates}
        />

        <ResultsBlock
          resStage="top5"
          max={5}
          label={LABELS.admin.top5Label}
          saved={top5}
          addLabel={LABELS.admin.top5Save}
          chooseLabel={LABELS.admin.chooseMiss}
          savedLabel={LABELS.admin.top5Saved}
          selected={top5Sel}
          setSelected={setTop5Sel}
          candidates={state.candidates}
        />

        <ResultsBlock
          resStage="podium"
          max={5}
          label={LABELS.admin.podiumLabel}
          saved={podium}
          addLabel={LABELS.admin.podiumSave}
          chooseLabel={LABELS.admin.chooseMiss}
          savedLabel={LABELS.admin.podiumSaved}
          selected={podiumSel}
          setSelected={setPodiumSel}
          candidates={state.candidates}
        />
      </div>

      <div className="card">
        <h2>{LABELS.admin.candidatesTitle(state.candidates.length)}</h2>
        <p className="hint">{LABELS.admin.candidatesHint}</p>
        <textarea
          rows={6}
          value={candidatesText}
          onChange={(e) => setCandidatesText(e.target.value)}
          placeholder={'Alsace\nAuvergne\nNormandie'}
        />
        <button className="small" onClick={() => act({ action: 'addCandidates', text: candidatesText }, LABELS.admin.importMsg)}>
          {LABELS.admin.importButton}
        </button>
        <div style={{ marginTop: 12 }}>
          {state.candidates.map((c) => (
            <span className="chip" key={c.id}>
              {c.region}
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
