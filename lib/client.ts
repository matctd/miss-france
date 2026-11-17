export type StateResponse = {
  code: string;
  stage: string;
  openUntil: string | null;
  serverNow: string;
  isAdmin: boolean;
  me: { pseudo: string; picks: Record<string, string[]> } | null;
  candidates: { id: number; number: number; name: string; region: string; withdrawn: number }[];
  counts: { players: number; top15: number; top5: number; order: number };
  revealedPicks: Record<string, Record<string, string[]>>;
  results: Record<string, string[]>;
  classement: {
    pseudo: string;
    rank: number;
    score: { top15: number; top5: number; order: number; total: number };
  }[];
};

export type Candidate = StateResponse['candidates'][number];

export function tokenKey(code: string): string {
  return `mp_token_${code.toUpperCase()}`;
}

export function getToken(code: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(tokenKey(code));
}

export function setToken(code: string, token: string): void {
  window.localStorage.setItem(tokenKey(code.toUpperCase()), token);
}

export async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || 'Erreur inconnue');
  return json as T;
}
