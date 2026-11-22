'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getToken, setToken, type Candidate, type StateResponse } from '@/lib/client';
import { CANDIDATE_NAMES } from '@/lib/candidates';
import { LABELS } from '@/lib/labels';
import { RULES } from '@/lib/rules';
import { MissPhoto } from '@/app/_components/MissPhoto';
import { Footer } from '@/app/_components/Footer';

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
  const [showScores, setShowScores] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<string[]>([]);
  const [orderRanks, setOrderRanks] = useState<Record<string, string>>({});
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
    setSearch('');
  }, [myPicksKey, state?.me?.pseudo]);

  useEffect(() => {
    if (!state?.stage.startsWith('final') || !state?.me) return;
    setOrderRanks(Object.fromEntries((state.me.picks.order ?? []).map((id, i) => [id, String(i + 1)])));
  }, [state?.stage, state?.me?.pseudo]);

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
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submitOrder(ordered: string[]) {
    setError('');
    try {
      await api(`/api/salons/${code}/picks`, { token, stage: 'order', data: ordered });
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
        <p className="tagline">{LABELS.joueur.loadingSalon}…</p>
        {error && <p className="error">{error}</p>}
      </main>
    );
  }

  if (!token || !state.me) {
    return (
      <main className="container">
        <div className="logo">{LABELS.app.title}</div>
        <p className="tagline">{LABELS.joueur.joinHeadingSuffix}</p>
        <div className="card">
          <h2>{LABELS.joueur.joinCardTitle}</h2>
          <input
            type="text"
            value={joinPseudo}
            onChange={(e) => setJoinPseudo(e.target.value)}
            placeholder={LABELS.accueil.pseudoPlaceholder}
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
  const savedTop = Boolean(state.me.picks[stage === 'top15_open' ? 'top15' : 'top5']);
  const savedOrder = Boolean(state.me.picks.order);

  let body: React.ReactNode = null;

  if (stage === 'top15_open' || stage === 'top5_open') {
    const max = stage === 'top15_open' ? RULES.top15.size : RULES.top5.size;
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
              <MissPhoto region={c.region} />
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
          {savedTop
            ? stage === 'top15_open'
              ? LABELS.joueur.savedTop15Button
              : LABELS.joueur.savedTop5Button
            : stage === 'top15_open'
              ? LABELS.joueur.validateTop15
              : LABELS.joueur.validateTop5}
        </button>
        {savedTop && (
          <p className="hint" style={{ textAlign: 'center' }}>{LABELS.joueur.savedPicks}</p>
        )}
      </div>
    );
  } else if (stage === 'final_open') {
    const options = realTop5 ?? [];
    const positions = LABELS.joueur.orderPositions;
    const ranksAssigned = Object.keys(orderRanks).length === 5;
    body = (
      <div className="card">
        <h2>{LABELS.joueur.orderTitle}</h2>
        <p className="hint">{LABELS.joueur.orderHint}</p>
        {options.map((c) => {
          const cand = byId.get(Number(c));
          return (
            <div className="order-row" key={c}>
              <MissPhoto region={cand ? cand.region : c} size={36} />
              <span className="names">{cand ? cand.region : c}</span>
              <select
                value={orderRanks[c] ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setOrderRanks((prev) => {
                    const next = { ...prev };
                    if (val) next[c] = val;
                    else delete next[c];
                    return next;
                  });
                }}
              >
                <option value="">{LABELS.joueur.choosePosition}</option>
                {positions.map((lbl, i) => {
                  const pos = String(i + 1);
                  const takenByOther = Object.entries(orderRanks).some(([id, r]) => id !== c && r === pos);
                  return (
                    <option key={pos} value={pos} disabled={takenByOther}>
                      {lbl}
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })}
        <button
          onClick={() =>
            submitOrder(Object.entries(orderRanks).sort((a, b) => Number(a[1]) - Number(b[1])).map(([id]) => id))
          }
          disabled={!ranksAssigned}
        >
          {savedOrder ? LABELS.joueur.savedOrderButton : LABELS.joueur.validateOrder}
        </button>
        {savedOrder && (
          <p className="hint" style={{ textAlign: 'center' }}>{LABELS.joueur.savedOrder}</p>
        )}
      </div>
    );
  } else if (stage === 'done') {
    body = <FinalScreen state={state} />;
  } else {
    body = <RevealScreen state={state} regions={regions} me={state.me.pseudo} myPicks={state.me.picks} />;
  }

  return (
    <main className="container">
      <div className="logo" style={{ fontSize: 20, padding: '16px 0 4px' }}>
        {LABELS.app.title}
      </div>
      <div className="stage-tabs">
        {STAGE_ORDER.map((s, i) => (
          <span key={s} className={i === idx && stage !== 'done' ? 'active' : i < idx || stage === 'done' ? 'done' : ''}>
            {STAGE_LABELS[s] ?? s}
          </span>
        ))}
      </div>

      <div className="rules-bar">
        <a
          className="link"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setShowRules(true);
          }}
        >
          {LABELS.joueur.rules.detailLink}
        </a>
      </div>

      {showRules && <RulesOverlay onClose={() => setShowRules(false)} />}

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

      {stage.endsWith('_open') && (
        <p style={{ textAlign: 'center', marginTop: 12 }}>
          <button className="small" onClick={() => setShowScores((v) => !v)}>
            {showScores ? LABELS.joueur.hideScores : LABELS.joueur.showScores}
          </button>
        </p>
      )}
      {stage.endsWith('_open') && showScores && <ScoresCard state={state} me={state.me.pseudo} />}

      {error && <p className="error" style={{ textAlign: 'center' }}>{error}</p>}

      {state.isAdmin && (
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <a className="link" href={`/admin/${code}`}>
            {LABELS.joueur.adminLink}
          </a>
        </p>
      )}

      <Footer />
    </main>
  );
}

function RevealScreen({
  state,
  regions,
  me,
  myPicks,
}: {
  state: StateResponse;
  regions: (ids: string[] | undefined) => string;
  me: string;
  myPicks: StateResponse['me'] extends null ? never : NonNullable<StateResponse['me']>['picks'];
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
      <ScoresCard state={state} me={me} />
      <div className="card">
        <h2>{LABELS.joueur.lockedTitle}</h2>
        <div className="picks-list">
          <h2 style={{ marginTop: 12 }}>{LABELS.joueur.myPicksTitle}</h2>
          {Object.values(revealed).map(({ label, key }) => (
            <div className="row" key={key}>
              <span>{label}</span>
              <span className="names">{regions(myPicks[key])}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function RulesOverlay({ onClose }: { onClose: () => void }) {
  const rules = LABELS.joueur.rules;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
        <button className="small secondary overlay-close" onClick={onClose}>
          ✕
        </button>
        <h2>{rules.title}</h2>
        <h3>{rules.step1Title}</h3>
        <p>{rules.step1}</p>
        <h3>{rules.step2Title}</h3>
        <p>{rules.step2}</p>
        <h3>{rules.step3Title}</h3>
        <p>{rules.step3}</p>
        <div className="rules-total">{rules.maxBadge}</div>
      </div>
    </div>
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
    </div>
  );
}

function FinalScreen({ state }: { state: StateResponse }) {
  const classement = state.classement;
  const winner = classement[0];
  const winnerMissId = state.results.podium?.[0];
  const winnerMiss = winnerMissId ? state.candidates.find((c) => String(c.id) === winnerMissId) : undefined;
  const winnerMissName = winnerMiss ? CANDIDATE_NAMES[winnerMiss.region] : undefined;

  return (
    <>
      {winnerMiss && (
        <div className="card">
          <div className="miss-winner">
            <MissPhoto region={winnerMiss.region} size={150} />
            <div>
              <div className="crown">👑</div>
              <div className="region">{LABELS.joueur.missWinnerRegion(winnerMiss.region)}</div>
              {winnerMissName && <div className="name">{winnerMissName}</div>}
            </div>
          </div>
          <p className="hint" style={{ textAlign: 'center' }}>{LABELS.joueur.missWinnerTitle}</p>
        </div>
      )}
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
    </>
  );
}
