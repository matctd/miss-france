import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CANDIDATES, CANDIDATE_NAMES } from '../lib/candidates.ts';

test('candidates : un prénom/nom pour chacune des 31 régions', () => {
  assert.equal(Object.keys(CANDIDATE_NAMES).length, DEFAULT_CANDIDATES.length);
  for (const region of DEFAULT_CANDIDATES) {
    assert.match(CANDIDATE_NAMES[region] ?? '', /^[A-ZÀ-ÿ][^ ]+ [A-ZÀ-ÿ]/, `nom inattendu pour ${region}`);
  }
});
