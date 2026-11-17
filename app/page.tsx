'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/client';

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
      <div className="logo">👑 MISS PRONOS 👑</div>
      <p className="tagline">« Qui connaît vraiment la couronne ? »</p>

      <div className="card">
        <h2>✨ Créer un salon (admin)</h2>
        <label>Ton pseudo</label>
        <input
          type="text"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="Ex : Léa"
          maxLength={30}
        />
        <button onClick={createSalon} disabled={busy || !pseudo.trim()}>
          CRÉER LE SALON →
        </button>
      </div>

      <div className="card">
        <h2>🎉 Rejoindre la soirée</h2>
        <label>Code du salon</label>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Ex : K7XM2"
          maxLength={5}
          style={{ textTransform: 'uppercase', letterSpacing: 4 }}
        />
        <label>Ton pseudo</label>
        <input
          type="text"
          value={joinPseudo}
          onChange={(e) => setJoinPseudo(e.target.value)}
          placeholder="Ex : Karim"
          maxLength={30}
        />
        <button onClick={joinSalon} disabled={busy || !joinCode.trim() || !joinPseudo.trim()}>
          REJOINDRE →
        </button>
      </div>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
