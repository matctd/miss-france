'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/client';
import { LABELS } from '@/lib/labels';
import { Footer } from '@/app/_components/Footer';

export default function Home() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState('');
  const [showCreate, setShowCreate] = useState(false);
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

  return (
    <main className="container">
      <div className="logo">{LABELS.app.title}</div>
      <p className="tagline">{LABELS.app.tagline}</p>

      <div className="card">
        <h2>{LABELS.accueil.guestTitle}</h2>
        <p className="hint">{LABELS.accueil.guestHint}</p>
      </div>

      {showCreate ? (
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
      ) : (
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <a
            className="link"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setShowCreate(true);
            }}
          >
            {LABELS.accueil.organizerLink}
          </a>
        </p>
      )}

      {error && <p className="error">{error}</p>}

      <Footer />
    </main>
  );
}
