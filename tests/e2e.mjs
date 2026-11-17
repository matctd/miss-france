const BASE = process.env.BASE || 'http://127.0.0.1:3112';

async function api(path, body, method) {
  const res = await fetch(BASE + path, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function assert(cond, label) {
  if (!cond) throw new Error('ÉCHEC: ' + label);
  console.log('✓', label);
}

(async () => {
  const create = await api('/api/salons', { pseudo: 'Léa' });
  assert(create.status === 200 && create.json.code, 'salon créé, code=' + create.json.code);
  const code = create.json.code;
  const admin = create.json.token;

  const text = Array.from({ length: 30 }, (_, i) => `Région ${i + 1}`).join('\n');
  const add = await api(`/api/salons/${code}/admin`, { token: admin, action: 'addCandidates', text });
  assert(add.status === 200 && add.json.added === 30, '30 candidates importées');

  const karim = await api(`/api/salons/${code}/join`, { pseudo: 'Karim' });
  const sofia = await api(`/api/salons/${code}/join`, { pseudo: 'Sofia' });
  assert(karim.status === 200 && sofia.status === 200, '2 amis ont rejoint');

  let st = (await api(`/api/salons/${code}/state?token=${admin}`)).json;
  assert(st.stage === 'top15_open', 'étape top15 ouverte');
  assert(st.candidates.length === 30, '30 candidates visibles');

  const cands = st.candidates.slice().sort((a, b) => a.number - b.number);
  const real15 = cands.slice(0, 15).map((c) => String(c.id));
  const others = cands.slice(15).map((c) => String(c.id));

  await api(`/api/salons/${code}/picks`, { token: admin, stage: 'top15', data: [...real15.slice(0, 10), ...others.slice(0, 5)] });
  await api(`/api/salons/${code}/picks`, { token: karim.json.token, stage: 'top15', data: [...real15.slice(0, 8), ...others.slice(0, 7)] });
  await api(`/api/salons/${code}/picks`, { token: sofia.json.token, stage: 'top15', data: [...real15.slice(0, 6), ...others.slice(0, 9)] });
  st = (await api(`/api/salons/${code}/state?token=${admin}`)).json;
  assert(st.counts.top15 === 3, '3 picks top15 comptés');
  assert(!('Karim' in st.revealedPicks) && !('Sofia' in st.revealedPicks), 'picks des autres masqués pendant la fenêtre ouverte');

  const bad = await api(`/api/salons/${code}/picks`, { token: admin, stage: 'top15', data: ['x'] });
  assert(bad.status === 400, 'picks invalides refusés (400)');

  await api(`/api/salons/${code}/admin`, { token: admin, action: 'lock' });
  st = (await api(`/api/salons/${code}/state?token=${admin}`)).json;
  assert(st.stage === 'top15_locked', 'top15 verrouillé');
  assert(Object.keys(st.revealedPicks).length === 3, 'picks révélés après verrouillage');

  const late = await api(`/api/salons/${code}/picks`, { token: karim.json.token, stage: 'top15', data: real15 });
  assert(late.status === 409, 'soumission après verrouillage refusée (409)');

  const noRes = await api(`/api/salons/${code}/admin`, { token: admin, action: 'open', stage: 'top5', minutes: 20 });
  assert(noRes.status === 409, 'ouverture top5 bloquée sans résultats top15');
  await api(`/api/salons/${code}/admin`, { token: admin, action: 'setResults', stage: 'top15', ids: real15 });
  await api(`/api/salons/${code}/admin`, { token: admin, action: 'open', stage: 'top5' });
  st = (await api(`/api/salons/${code}/state?token=${admin}`)).json;
  assert(st.stage === 'top5_open', 'fenêtre top5 ouverte');

  st = (await api(`/api/salons/${code}/state?token=${admin}`)).json;
  const scores = Object.fromEntries(st.classement.map((p) => [p.pseudo, p.score.top15]));
  assert(scores['Léa'] === 20 && scores['Karim'] === 16 && scores['Sofia'] === 12, `scores top15 corrects ${JSON.stringify(scores)}`);

  const real5 = [real15[2], real15[8], real15[0], real15[13], real15[6]];
  await api(`/api/salons/${code}/picks`, { token: admin, stage: 'top5', data: real5 });
  await api(`/api/salons/${code}/picks`, { token: karim.json.token, stage: 'top5', data: [real5[0], real5[1], real5[2], real5[3], others[0]] });
  await api(`/api/salons/${code}/picks`, { token: sofia.json.token, stage: 'top5', data: others.slice(0, 5) });

  await api(`/api/salons/${code}/admin`, { token: admin, action: 'lock' });
  await api(`/api/salons/${code}/admin`, { token: admin, action: 'setResults', stage: 'top5', ids: real5 });
  await api(`/api/salons/${code}/admin`, { token: admin, action: 'open', stage: 'final' });
  st = (await api(`/api/salons/${code}/state?token=${admin}`)).json;
  assert(st.stage === 'final_open', 'fenêtre classement ouverte');

  const badOrder = await api(`/api/salons/${code}/picks`, { token: sofia.json.token, stage: 'order', data: others.slice(0, 5) });
  assert(badOrder.status === 400, 'podium avec des misses hors top 5 refusé (400)');
  await api(`/api/salons/${code}/picks`, { token: admin, stage: 'order', data: real5 });
  await api(`/api/salons/${code}/picks`, { token: karim.json.token, stage: 'order', data: [real5[1], real5[0], real5[2], real5[3], real5[4]] });
  await api(`/api/salons/${code}/picks`, { token: sofia.json.token, stage: 'order', data: [real5[4], real5[3], real5[2], real5[1], real5[0]] });

  await api(`/api/salons/${code}/admin`, { token: admin, action: 'lock' });
  await api(`/api/salons/${code}/admin`, { token: admin, action: 'finish' });
  st = (await api(`/api/salons/${code}/state?token=${admin}`)).json;
  assert(st.stage === 'done', 'soirée terminée');

  // Attendu : Léa 20+30+35=85 | Karim 16+24+10=50 | Sofia 12+0+5=17
  const rank = st.classement.map((p) => `${p.pseudo}:${p.score.total}`);
  assert(rank[0] === 'Léa:85' && rank[1] === 'Karim:50' && rank[2] === 'Sofia:17', `classement final ${rank.join(' | ')}`);

  console.log('\n🎉 Simulation complète réussie — ' + rank.join(' | '));
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
