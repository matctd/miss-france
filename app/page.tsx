'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/client';
import { LABELS } from '@/lib/labels';

export default function Home() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinPseudo, setJoinPseudo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function createSalon() {
    setError('');
    setBusy(true);
    try {
      const res = await api<{ code: string; token: string }>('/api/salons', { pseudo });
      setToken(res.code, res.token);
      router.push(`/salon/${res.code}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function joinSalon() {
    setError('');
    setBusy(true);
    try {
      const code = joinCode.trim().toUpperCase();
      const res = await api<{ token: string }>(`/api/salons/${code}/join`, { pseudo: joinPseudo });
      setToken(code, res.token);
      router.push(`/salon/${code}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div className="logo">{LABELS.app.title}</div>
      <p className="tagline">{LABELS.app.tagline}</p>

      <div className="card">
        <h2>{LABELS.accueil.createTitle}</h2>
        <label>{LABELS.accueil.pseudoLabel}</label>
        <input
          type="text"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder={LABELS.accueil.pseudoPlaceholder}
          maxLength={30}
        />
        <button onClick={createSalon} disabled={busy || !pseudo.trim()}>
          {LABELS.accueil.createButton}
        </button>
      </div>

      <div className="card">
        <h2>{LABELS.accueil.joinTitle}</h2>
        <label>{LABELS.accueil.codeLabel}</label>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder={LABELS.accueil.codePlaceholder}
          maxLength={5}
          style={{ textTransform: 'uppercase', letterSpacing: 4 }}
        />
        <label>{LABELS.accueil.pseudoLabel}</label>
        <input
          type="text"
          value={joinPseudo}
          onChange={(e) => setJoinPseudo(e.target.value)}
          placeholder={LABELS.accueil.pseudoPlaceholder}
          maxLength={30}
        />
        <button onClick={joinSalon} disabled={busy || !joinCode.trim() || !joinPseudo.trim()}>
          {LABELS.accueil.joinButton}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
