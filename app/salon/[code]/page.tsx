'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getToken, setToken, type Candidate, type StateResponse } from '@/lib/client';
import { LABELS } from '@/lib/labels';

const STAGE_LABELS: Record<string, string> = {
  top15_open: LABELS.joueur.stageTabs.top15,
  top15_locked: LABELS.joueur.stageTabs.top15,
  top5_open: LABELS.joueur.stageTabs.top5,
  top5_locked: LABELS.joueur.stageTabs.top5,
  final_open: LABELS.joueur.stageTabs.final,
  final_locked: LABELS.joueur.stageTabs.final,
  done: LABELS.joueur.stageTabs.done,
};

const STAGE_ORDER = ['top15', 'top5', 'final'];

function stageIndex(stage: string): number {
  if (stage.startsWith('top15')) return 0;
  if (stage.startsWith('top5')) return 1;
  if (stage.startsWith('final')) return 2;
  return 3;
}

export default function SalonPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code || '').toUpperCase();
  const [token, setTok] = useState<string | null>(null);
  const [checkedToken, setCheckedToken] = useState(false);
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<string[]>([]);
  const [orderSelection, setOrderSelection] = useState<string[]>([]);
  const [joinPseudo, setJoinPseudo] = useState('');

  useEffect(() => {
    setTok(getToken(code));
    setCheckedToken(true);
  }, [code]);

  const refresh = useCallback(async () => {
    try {
      const qs = token ? `?token=${token}` : '';
      const s = await api<StateResponse>(`/api/salons/${code}/state${qs}`);
      setState(s);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [code, token]);

  useEffect(() => {
    if (!checkedToken) return;
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [checkedToken, refresh]);

  const byId = useMemo(() => {
    const map = new Map<number, Candidate>();
    state?.candidates.forEach((c) => map.set(c.id, c));
    return map;
  }, [state]);

  const myPicksKey = state?.stage.startsWith('top15') ? 'top15' : state?.stage.startsWith('top5') ? 'top5' : '';
  useEffect(() => {
    if (!myPicksKey || !state?.me) return;
    setSelection(state.me.picks[myPicksKey] ?? []);
    setOrderSelection(state.me.picks.order ?? []);
    setSearch('');
  }, [myPicksKey, state?.me?.pseudo]);

  function regions(ids: string[] | undefined): string {
    if (!ids) return '—';
    return ids.map((id) => byId.get(Number(id))?.region ?? '?').join(', ');
  }

  async function join() {
    setError('');
    try {
      const res = await api<{ token: string }>(`/api/salons/${code}/join`, { pseudo: joinPseudo });
      setToken(code, res.token);
      setTok(res.token);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function toggle(id: number, max: number) {
    setError('');
    setInfo('');
    const key = String(id);
    setSelection((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= max) {
        setError(LABELS.joueur.maxError(max));
        return prev;
      }
      return [...prev, key];
    });
  }

  function randomComplete(max: number, pool: Candidate[]) {
    const remaining = pool.filter((c) => !selection.includes(String(c.id)));
    const shuffled = [...remaining].sort(() => Math.random() - 0.5);
    setSelection((prev) => [...prev, ...shuffled.slice(0, max - prev.length).map((c) => String(c.id))]);
  }

  async function submitPicks(stage: string, data: string[]) {
    setError('');
    try {
      await api(`/api/salons/${code}/picks`, { token, stage, data });
      setInfo(LABELS.joueur.savedPicks);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submitOrder() {
    setError('');
    try {
      await api(`/api/salons/${code}/picks`, { token, stage: 'order', data: orderSelection });
      setInfo(LABELS.joueur.savedOrder);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!checkedToken) return <main className="container" />;

  if (!state) {
    return (
      <main className="container">
        <div className="logo">{LABELS.app.title}</div>
        <p className="tagline">{LABELS.joueur.loadingSalon} {code}…</p>
        {error && <p className="error">{error}</p>}
      </main>
    );
  }

  if (!token || !state.me) {
    return (
      <main className="container">
        <div className="logo">{LABELS.app.title}</div>
        <p className="tagline">{LABELS.joueur.joinHeading} {code} {LABELS.joueur.joinHeadingSuffix}</p>
        <div className="card">
          <h2>{LABELS.joueur.joinCardTitle}</h2>
          <input
            type="text"
            value={joinPseudo}
            onChange={(e) => setJoinPseudo(e.target.value)}
            placeholder="Ex : Léa"
            maxLength={30}
          />
          <button onClick={join} disabled={!joinPseudo.trim()}>
            {LABELS.joueur.joinButton}
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      </main>
    );
  }

  const stage = state.stage;
  const idx = stageIndex(stage);
  const realTop15 = state.results.top15;
  const realTop5 = state.results.top5;

  const top5Pool = realTop15 ? state.candidates.filter((c) => realTop15.includes(String(c.id))) : state.candidates;
  const filtered = state.candidates.filter((c) => c.region.toLowerCase().includes(search.toLowerCase()));

  let body: React.ReactNode = null;

  if (stage === 'top15_open' || stage === 'top5_open') {
    const max = stage === 'top15_open' ? 15 : 5;
    const activePool = stage === 'top15_open' ? state.candidates : top5Pool;
    const list = stage === 'top15_open' ? filtered : activePool;
    const current = selection;
    body = (
      <div className="card">
        <h2>
          {stage === 'top15_open' ? LABELS.joueur.top15Title : LABELS.joueur.top5Title}
        </h2>
        <div className="progressbar">
          <div style={{ width: `${(Math.min(current.length, max) / max) * 100}%` }} />
        </div>
        <p className="hint">
          {current.length}/{max} {LABELS.joueur.selectedCount}
        </p>
        {stage === 'top15_open' && (
          <input
            className="search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={LABELS.joueur.searchPlaceholder}
          />
        )}
        <div className="grid-candidates">
          {list.map((c) => (
            <div
              key={c.id}
              className={`candidate ${current.includes(String(c.id)) ? 'checked' : ''}`}
              onClick={() => toggle(c.id, max)}
            >
              <span>{c.region}</span>
            </div>
          ))}
        </div>
        <button className="secondary" onClick={() => randomComplete(max, activePool)}>
          {LABELS.joueur.randomButton}
        </button>
        <button
          onClick={() => submitPicks(stage === 'top15_open' ? 'top15' : 'top5', current)}
          disabled={current.length !== max}
        >
          {stage === 'top15_open' ? LABELS.joueur.validateTop15 : LABELS.joueur.validateTop5}
        </button>
      </div>
    );
  } else if (stage === 'final_open') {
    const options = realTop5 ?? [];
    body = (
      <div className="card">
        <h2>{LABELS.joueur.orderTitle}</h2>
        <p className="hint">{LABELS.joueur.orderHint}</p>
        {[0, 1, 2, 3, 4].map((slot) => {
          const medals = LABELS.joueur.orderMedals;
          const points = LABELS.joueur.orderPoints[slot];
          return (
            <div className="order-row" key={slot}>
              <span className="medal">{medals[slot]}</span>
              <select
                value={orderSelection[slot] ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setOrderSelection((prev) => {
                    const next = [...prev];
                    next[slot] = val;
                    return next.filter(Boolean);
                  });
                }}
              >
                <option value="">{LABELS.joueur.chooseOption}</option>
                {options.map((c) => {
                  const cand = byId.get(Number(c));
                  return (
                    <option key={c} value={c} disabled={orderSelection.includes(c) && orderSelection[slot] !== c}>
                      {cand ? cand.region : c}
                    </option>
                  );
                })}
              </select>
              <span className="chip">{points}</span>
            </div>
          );
        })}
        <button onClick={submitOrder} disabled={orderSelection.length !== 5}>
          {LABELS.joueur.validateOrder}
        </button>
      </div>
    );
  } else if (stage === 'done') {
    body = <FinalScreen state={state} regions={regions} />;
  } else {
    body = <RevealScreen state={state} regions={regions} me={state.me.pseudo} />;
  }

  return (
    <main className="container">
      <div className="logo" style={{ fontSize: 20, padding: '16px 0 4px' }}>
        {LABELS.app.title} · {state.code}
      </div>
      <div className="stage-tabs">
        {STAGE_ORDER.map((s, i) => (
          <span key={s} className={i === idx && stage !== 'done' ? 'active' : i < idx || stage === 'done' ? 'done' : ''}>
            {STAGE_LABELS[s] ?? s}
          </span>
        ))}
      </div>

      {stage === 'top15_open' && (
        <p className="hint" style={{ textAlign: 'center' }}>
          {LABELS.joueur.countsTop15(state.counts.top15, state.counts.players)}
        </p>
      )}
      {stage === 'top5_open' && (
        <p className="hint" style={{ textAlign: 'center' }}>
          {LABELS.joueur.countsTop5(state.counts.top5, state.counts.players)}
        </p>
      )}
      {stage === 'final_open' && (
        <p className="hint" style={{ textAlign: 'center' }}>
          {LABELS.joueur.countsOrder(state.counts.order, state.counts.players)}
        </p>
      )}

      {body}

      {info && <p className="success" style={{ textAlign: 'center' }}>{info}</p>}
      {error && <p className="error" style={{ textAlign: 'center' }}>{error}</p>}

      {state.isAdmin && (
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <a className="link" href={`/admin/${code}`}>
            {LABELS.joueur.adminLink}
          </a>
        </p>
      )}
    </main>
  );
}

function RevealScreen({
  state,
  regions,
  me,
}: {
  state: StateResponse;
  regions: (ids: string[] | undefined) => string;
  me: string;
}) {
  const stage = state.stage;
  const revealed: Record<string, { label: string; key: string }> = {};
  if (stage !== 'top15_open') revealed.top15 = { label: LABELS.joueur.revealLabels.top15, key: 'top15' };
  if (['top5_locked', 'final_open', 'final_locked', 'done'].includes(stage))
    revealed.top5 = { label: LABELS.joueur.revealLabels.top5, key: 'top5' };
  if (['final_locked', 'done'].includes(stage))
    revealed.order = { label: LABELS.joueur.revealLabels.order, key: 'order' };

  return (
    <>
      <div className="card">
        <h2>{LABELS.joueur.lockedTitle}</h2>
        {Object.values(revealed).map(({ label, key }) => (
          <div key={key} className="picks-list">
            <h2 style={{ marginTop: 12 }}>{label}</h2>
            {Object.entries(state.revealedPicks).map(([pseudo, picks]) => (
              <div className="row" key={pseudo}>
                <span>{pseudo === me ? `⭐ ${pseudo}` : pseudo}</span>
                <span className="names">{regions(picks[key])}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <ScoresCard state={state} me={me} />
    </>
  );
}

function ScoresCard({ state, me }: { state: StateResponse; me: string }) {
  if (!state.classement.length) return null;
  return (
    <div className="card">
      <h2>{LABELS.joueur.scoresTitle}</h2>
      <table className="scores">
        <thead>
          <tr>
            <th>{LABELS.joueur.scoresHead.player}</th>
            <th>{LABELS.joueur.scoresHead.top15}</th>
            <th>{LABELS.joueur.scoresHead.top5}</th>
            <th>{LABELS.joueur.scoresHead.order}</th>
            <th>{LABELS.joueur.scoresHead.total}</th>
          </tr>
        </thead>
        <tbody>
          {state.classement.map((p) => (
            <tr key={p.pseudo} style={p.pseudo === me ? { color: 'var(--gold)' } : undefined}>
              <td>{p.rank === 1 ? '🥇 ' : p.rank === 2 ? '🥈 ' : p.rank === 3 ? '🥉 ' : `${p.rank}. `}{p.pseudo}</td>
              <td>{p.score.top15}</td>
              <td>{p.score.top5}</td>
              <td>{p.score.order}</td>
              <td>
                <strong>{p.score.total}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint" style={{ marginTop: 8 }}>
        {LABELS.joueur.tiebreakHint}
      </p>
    </div>
  );
}

function FinalScreen({
  state,
  regions,
}: {
  state: StateResponse;
  regions: (ids: string[] | undefined) => string;
}) {
  const classement = state.classement;
  const winner = classement[0];
  const realWinner = state.results.podium?.[0];
  const winnerCount = classement.filter(
    (p) => realWinner && p.pseudo && state.revealedPicks[p.pseudo]?.order?.[0] === realWinner
  ).length;

  const missCounts = new Map<string, number>();
  Object.values(state.revealedPicks).forEach((picks) => {
    (picks.top15 ?? []).forEach((id) => missCounts.set(id, (missCounts.get(id) ?? 0) + 1));
  });
  const mostPicked = [...missCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const avg =
    classement.length > 0
      ? (classement.reduce((sum, p) => sum + p.score.total, 0) / classement.length).toFixed(1)
      : '0';

  return (
    <>
      <div className="card winner-banner">
        <h2 style={{ border: 'none' }}>{LABELS.joueur.winnerTitle}</h2>
        <div className="name">👑 {winner?.pseudo ?? '—'} 👑</div>
        <div className="pts">{winner?.score.total ?? 0} points</div>
        <p className="hint">{LABELS.joueur.winnerSubtitle}</p>
      </div>
      <div className="card">
        <h2>{LABELS.joueur.finalRankingTitle}</h2>
        {classement.map((p) => (
          <div className="ranking-row" key={p.pseudo}>
            <span className="rank">
              {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `${p.rank}.`}
            </span>
            <span>{p.pseudo}</span>
            <span className="pts">{p.score.total} pts</span>
          </div>
        ))}
      </div>
      <div className="card">
        <h2>{LABELS.joueur.statsTitle}</h2>
        <p className="hint">
          {mostPicked
            ? LABELS.joueur.statsMostPicked(byIdRegion(state, mostPicked[0]), mostPicked[1])
            : '—'}
        </p>
        <p className="hint">{LABELS.joueur.statsAvg(avg)}</p>
        <p className="hint">
          {winnerCount === 1 ? LABELS.joueur.statsOneWinner : LABELS.joueur.statsWinners(winnerCount)}
        </p>
        <p className="hint">{LABELS.joueur.statsPodium(regions(state.results.podium))}</p>
      </div>
    </>
  );
}

function byIdRegion(state: StateResponse, id: string): string {
  const c = state.candidates.find((x) => String(x.id) === id);
  return c ? c.region : '?';
}
