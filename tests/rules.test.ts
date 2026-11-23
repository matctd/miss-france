import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreTop15, scoreTop5, scoreOrder, scorePlayer, rankPlayers, RULES } from '../lib/rules.ts';

const REAL_TOP15 = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12'];
const REAL_TOP5 = ['c3', 'c9', 'c1', 'c14', 'c7'];
const PODIUM = ['c3', 'c9', 'c1']; // c3 gagnante, c9 1re dauphine, c1 2e dauphine

test('top15 : 2 points par miss trouvée', () => {
  const picks = ['c1', 'c2', 'c16', 'c17', 'c3'];
  assert.equal(scoreTop15(picks, REAL_TOP15), 6);
});

test('top15 : picks vides ou résultats absents = 0', () => {
  assert.equal(scoreTop15(undefined, REAL_TOP15), 0);
  assert.equal(scoreTop15(['c1'], undefined), 0);
});

test('top15 : maximum 24 points (top 12)', () => {
  assert.equal(scoreTop15(REAL_TOP15, REAL_TOP15), 24);
  assert.equal(RULES.top15.perMiss * RULES.top15.size, 24);
});

test('top5 : 6 points par finaliste trouvé', () => {
  assert.equal(scoreTop5(['c3', 'c9', 'c20'], REAL_TOP5), 12);
  assert.equal(scoreTop5(REAL_TOP5, REAL_TOP5), 30);
});

test('ordre : points exacts du podium', () => {
  assert.equal(scoreOrder(['c3', 'c9', 'c1', 'c14', 'c7'], REAL_TOP5, PODIUM), 36);
  assert.equal(scoreOrder(['c9', 'c3', 'c1', 'c14', 'c7'], REAL_TOP5, PODIUM), 11);
  assert.equal(scoreOrder(['c1', 'c9', 'c3', 'c14', 'c7'], REAL_TOP5, PODIUM), 16);
});

test('ordre : places 4 et 5 non ordonnées', () => {
  assert.equal(scoreOrder(['c3', 'c9', 'c1', 'c7', 'c14'], REAL_TOP5, PODIUM), 36);
});

test('ordre : une miss hors top 5 aux places 4-5 ne rapporte rien', () => {
  assert.equal(scoreOrder(['c3', 'c9', 'c1', 'c20', 'c21'], REAL_TOP5, PODIUM), 30);
});

test('ordre : podium saisi sur les 5 places, places 4-5 toujours indulgentes', () => {
  const podium5 = ['c3', 'c9', 'c1', 'c14', 'c7'];
  assert.equal(scoreOrder(['c3', 'c9', 'c1', 'c14', 'c7'], REAL_TOP5, podium5), 36);
  assert.equal(scoreOrder(['c3', 'c9', 'c1', 'c7', 'c14'], REAL_TOP5, podium5), 36);
});

test('ordre : la gagnante seule rapporte 15', () => {
  assert.equal(scoreOrder(['c3', 'c20', 'c21', 'c22', 'c23'], REAL_TOP5, PODIUM), 15);
});

test('scorePlayer : total et détail par étape', () => {
  const s = scorePlayer(
    { top15: ['c1', 'c2', 'c3'], top5: ['c3', 'c9'], order: ['c3', 'c9', 'c1', 'c14', 'c7'] },
    { top15: REAL_TOP15, top5: REAL_TOP5, podium: PODIUM }
  );
  assert.deepEqual(s, { top15: 6, top5: 12, order: 36, total: 54 });
});

test('classement : total décroissant', () => {
  const ranked = rankPlayers(
    [
      { pseudo: 'A', picks: { top15: REAL_TOP15 }, earliestSubmittedAt: 100 },
      { pseudo: 'B', picks: { top15: ['c1'] }, earliestSubmittedAt: 200 },
    ],
    { top15: REAL_TOP15, top5: REAL_TOP5, podium: PODIUM }
  );
  assert.equal(ranked[0].pseudo, 'A');
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].pseudo, 'B');
});

test('départage : gagnante trouvée avant tout (à total égal)', () => {
  const ranked = rankPlayers(
    [
      { pseudo: 'Sans gagnante', picks: { top15: REAL_TOP15.slice(0, 6), order: ['c20', 'c21', 'c1', 'c22', 'c23'] }, earliestSubmittedAt: 100 },
      { pseudo: 'Avec gagnante', picks: { top15: ['c1'], order: ['c3', 'c20', 'c21', 'c22', 'c23'] }, earliestSubmittedAt: 999 },
    ],
    { top15: REAL_TOP15, top5: REAL_TOP5, podium: PODIUM }
  );
  assert.equal(ranked[0].pseudo, 'Avec gagnante');
});

test('départage : podium complet avant score top15 (à total égal)', () => {
  const ranked = rankPlayers(
    [
      { pseudo: 'Podium incomplet', picks: { top15: REAL_TOP15.slice(0, 2), order: ['c3', 'c9', 'c20', 'c21', 'c22'] }, earliestSubmittedAt: 100 },
      { pseudo: 'Podium complet', picks: { top15: REAL_TOP15.slice(0, 2), order: ['c3', 'c9', 'c1', 'c20', 'c21'] }, earliestSubmittedAt: 999 },
    ],
    { top15: REAL_TOP15, top5: REAL_TOP5, podium: PODIUM }
  );
  assert.equal(ranked[0].pseudo, 'Podium complet');
});

test('départage : score top15 avant précocité', () => {
  const ranked = rankPlayers(
    [
      { pseudo: 'Tôt mais moins bon', picks: { top15: ['c1'], order: ['c3', 'c9', 'c1', 'c14', 'c7'] }, earliestSubmittedAt: 100 },
      { pseudo: 'Tard mais meilleur top15', picks: { top15: ['c1', 'c2'], order: ['c3', 'c9', 'c1', 'c14', 'c7'] }, earliestSubmittedAt: 999 },
    ],
    { top15: REAL_TOP15, top5: REAL_TOP5, podium: PODIUM }
  );
  assert.equal(ranked[0].pseudo, 'Tard mais meilleur top15');
});

test('départage : soumission la plus précoce en dernier recours', () => {
  const picks = { top15: ['c1'], order: ['c3', 'c9', 'c1', 'c14', 'c7'] };
  const ranked = rankPlayers(
    [
      { pseudo: 'Late', picks, earliestSubmittedAt: 500 },
      { pseudo: 'Early', picks, earliestSubmittedAt: 100 },
    ],
    { top15: REAL_TOP15, top5: REAL_TOP5, podium: PODIUM }
  );
  assert.equal(ranked[0].pseudo, 'Early');
});

test('égalité parfaite : classement par ordre alphabétique de pseudo', () => {
  const picks = { top15: REAL_TOP15.slice(0, 5) };
  const ranked = rankPlayers(
    [
      { pseudo: 'Zoé', picks, earliestSubmittedAt: 100 },
      { pseudo: 'Adam', picks, earliestSubmittedAt: 100 },
    ],
    { top15: REAL_TOP15, top5: REAL_TOP5, podium: PODIUM }
  );
  assert.equal(ranked[0].pseudo, 'Adam');
  assert.equal(ranked[1].pseudo, 'Zoé');
});

test('barème : le total maximum correspond au barème défini', () => {
  const s = scorePlayer(
    { top15: REAL_TOP15, top5: REAL_TOP5, order: ['c3', 'c9', 'c1', 'c14', 'c7'] },
    { top15: REAL_TOP15, top5: REAL_TOP5, podium: PODIUM }
  );
  assert.equal(s.total, RULES.maxTotal);
  assert.equal(RULES.maxTotal, 90);
});
