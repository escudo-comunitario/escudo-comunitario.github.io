import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transcriptFromResults } from './speechTranscript.js';

for (const phrase of ['200 mil pesos', 'doscientos mil pesos', '200.000 pesos colombianos']) {
  test(`la transcripción conserva literalmente “${phrase}”`, () => {
    const results = [{ 0: { transcript: phrase } }];
    assert.equal(transcriptFromResults(results), phrase);
  });
}

test('concatena fragmentos sin cambiar símbolos, cifras ni moneda', () => {
  const results = [
    { 0: { transcript: '$200.000 ' } },
    { 0: { transcript: 'pesos colombianos' } },
  ];
  assert.equal(transcriptFromResults(results), '$200.000 pesos colombianos');
});
