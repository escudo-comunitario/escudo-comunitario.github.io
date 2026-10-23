import test from 'node:test';
import assert from 'node:assert/strict';

const voices = [{ name: 'Español Colombia', lang: 'es-CO' }];
const utterances = [];
let cancelCalls = 0;
class MockUtterance {
  constructor(text) { this.text = text; utterances.push(this); }
}
const synthesis = {
  getVoices: () => voices,
  addEventListener() {},
  speak(utterance) { this.current = utterance; },
  cancel() { cancelCalls += 1; },
};
globalThis.window = {
  speechSynthesis: synthesis,
  SpeechSynthesisUtterance: MockUtterance,
  setTimeout(callback) { callback(); return 1; },
  clearTimeout() {},
};
const speech = await import('./guidedSpeech.js?test=mocked');

test('announces in Colombian Spanish and completes without remaining active', () => {
  utterances.length = 0;
  assert.equal(speech.announceGuided('Prueba de voz', { owner: 'a' }), true);
  assert.equal(utterances.at(-1).text, 'Prueba de voz');
  assert.equal(utterances.at(-1).lang, 'es-CO');
  assert.equal(utterances.at(-1).voice, voices[0]);
  assert.equal(speech.getGuidedSpeechSnapshot().speaking, true);
  utterances.at(-1).onend();
  assert.equal(speech.getGuidedSpeechSnapshot().status, 'completed');
  assert.equal(speech.getGuidedSpeechSnapshot().speaking, false);
  assert.equal(speech.getGuidedSpeechSnapshot().owner, 'a');
});

test('stops only its active run and ignores a late completion', () => {
  utterances.length = 0;
  const priorCancelCalls = cancelCalls;
  speech.announceGuided('Mensaje cancelable', { owner: 'b' });
  const oldUtterance = utterances.at(-1);
  assert.equal(speech.stopGuidedSpeech('other-owner'), false);
  assert.equal(speech.stopGuidedSpeech('b'), true);
  assert.equal(cancelCalls, priorCancelCalls + 1);
  oldUtterance.onend();
  assert.equal(speech.getGuidedSpeechSnapshot().status, 'cancelled');
  assert.equal(speech.stopGuidedSpeech(), false);
});

test('does not duplicate an active run from the same owner', () => {
  utterances.length = 0;
  assert.equal(speech.announceGuided('Una sola vez', { owner: 'same' }), true);
  assert.equal(speech.announceGuided('Una sola vez', { owner: 'same' }), false);
  assert.equal(utterances.length, 1);
  speech.stopGuidedSpeech('same');
});

test('unexpected synthesis errors produce a visible fallback message', () => {
  utterances.length = 0;
  speech.announceGuided('Mensaje con error', { owner: 'err' });
  utterances.at(-1).onerror({ error: 'audio-busy' });
  const state = speech.getGuidedSpeechSnapshot();
  assert.equal(state.status, 'error');
  assert.equal(state.owner, 'err');
  assert.match(state.error, /leer el texto en pantalla/);
});
