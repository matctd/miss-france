export type Stage =
  | 'top15_open'
  | 'top15_locked'
  | 'top5_open'
  | 'top5_locked'
  | 'final_open'
  | 'final_locked'
  | 'done';

// Pour changer la taille de la première étape (ex. top 12 au lieu de top 15),
// il suffit de modifier `size` ci-dessous : le maximum de points, les écrans
// joueur/admin et les vérifications serveur suivent automatiquement.
const RULES_BASE = {
  top15: { perMiss: 3, size: 12 },
  top5: { perFinalist: 6, size: 5 },
  order: { winner: 15, firstDauphine: 10, secondDauphine: 5, thirdOrFourthDauphine: 3 },
};

export const RULES = {
  ...RULES_BASE,
  maxTotal:
    RULES_BASE.top15.perMiss * RULES_BASE.top15.size +
    RULES_BASE.top5.perFinalist * RULES_BASE.top5.size +
    RULES_BASE.order.winner +
    RULES_BASE.order.firstDauphine +
    RULES_BASE.order.secondDauphine +
    2 * RULES_BASE.order.thirdOrFourthDauphine,
};

export type Picks = {
  top15?: string[];
  top5?: string[];
  order?: string[];
};

export type Results = {
  top15?: string[];
  top5?: string[];
  podium?: string[];
};

export type PlayerScore = {
  top15: number;
  top5: number;
  order: number;
  total: number;
};

export function scoreTop15(picks: string[] | undefined, realTop15: string[] | undefined): number {
  if (!picks || !realTop15) return 0;
  return picks.filter((id) => realTop15.includes(id)).length * RULES.top15.perMiss;
}

export function scoreTop5(picks: string[] | undefined, realTop5: string[] | undefined): number {
  if (!picks || !realTop5) return 0;
  return picks.filter((id) => realTop5.includes(id)).length * RULES.top5.perFinalist;
}

export function scoreOrder(
  order: string[] | undefined,
  realTop5: string[] | undefined,
  podium: string[] | undefined
): number {
  if (!order || !realTop5 || !podium) return 0;
  const nonPodium = realTop5.filter((id) => !podium.slice(0, 3).includes(id));
  let points = 0;
  if (order[0] && order[0] === podium[0]) points += RULES.order.winner;
  if (order[1] && order[1] === podium[1]) points += RULES.order.firstDauphine;
  if (order[2] && order[2] === podium[2]) points += RULES.order.secondDauphine;
  for (const slot of order.slice(3)) {
    if (slot && nonPodium.includes(slot)) points += RULES.order.thirdOrFourthDauphine;
  }
  return points;
}

export function scorePlayer(picks: Picks, results: Results): PlayerScore {
  const top15 = scoreTop15(picks.top15, results.top15);
  const top5 = scoreTop5(picks.top5, results.top5);
  const order = scoreOrder(picks.order, results.top5, results.podium);
  return { top15, top5, order, total: top15 + top5 + order };
}

export type RankedPlayer = {
  pseudo: string;
  score: PlayerScore;
  rank: number;
  tiebreak: number[];
};

export function rankPlayers(
  players: { pseudo: string; picks: Picks; earliestSubmittedAt: number }[],
  results: Results
): RankedPlayer[] {
  const podium = results.podium ?? [];
  const scored = players.map((p) => {
    const score = scorePlayer(p.picks, results);
    const winnerFound = podium.length > 0 && p.picks.order?.[0] === podium[0] ? 1 : 0;
    const podiumComplete =
      podium.length === 3 &&
      p.picks.order?.[0] === podium[0] &&
      p.picks.order?.[1] === podium[1] &&
      p.picks.order?.[2] === podium[2]
        ? 1
        : 0;
    const tiebreak = [winnerFound, podiumComplete, score.top15, -p.earliestSubmittedAt];
    return { pseudo: p.pseudo, score, tiebreak, rank: 0 };
  });
  scored.sort((a, b) => {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    for (let i = 0; i < a.tiebreak.length; i++) {
      if (b.tiebreak[i] !== a.tiebreak[i]) return b.tiebreak[i] - a.tiebreak[i];
    }
    return a.pseudo.localeCompare(b.pseudo);
  });
  scored.forEach((p, i) => {
    p.rank = i + 1;
  });
  return scored;
}
