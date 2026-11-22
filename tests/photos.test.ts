import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISS_PHOTOS } from '../lib/photos.ts';
import { DEFAULT_CANDIDATES } from '../lib/candidates.ts';

test('photos : une URL pour chacune des 31 candidates', () => {
  assert.equal(Object.keys(MISS_PHOTOS).length, DEFAULT_CANDIDATES.length);
  assert.equal(Object.keys(MISS_PHOTOS).length, 31);
  for (const region of DEFAULT_CANDIDATES) {
    const url = MISS_PHOTOS[region];
    assert.ok(url, `photo manquante pour ${region}`);
    assert.match(url, /^https:\/\/img\.20mn\.fr\/[A-Za-z0-9_-]+\/460x0_miss-[a-z-]+-2026$/, `URL inattendue pour ${region} : ${url}`);
  }
});

test('photos : pas de doublon d\'URL entre candidates', () => {
  const urls = Object.values(MISS_PHOTOS);
  assert.equal(new Set(urls).size, urls.length);
});
