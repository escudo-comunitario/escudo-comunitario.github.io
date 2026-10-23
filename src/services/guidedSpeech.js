const listeners = new Set();
let pauseTimer = null;
let loadedVoices = [];
let nextRunId = 0;
let activeRunId = 0;

function environmentSupported() {
  return typeof window !== 'undefined'
    && Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
}

function findSpanishVoice() {
  return loadedVoices.find((voice) => /^es[-_]CO$/i.test(voice.lang))
    || loadedVoices.find((voice) => /^es[-_]419$/i.test(voice.lang))
    || loadedVoices.find((voice) => /^es(?:[-_]|$)/i.test(voice.lang))
    || null;
}

let snapshot = {
  speaking: false,
  status: 'idle',
  supported: environmentSupported(),
  hasSpanishVoice: false,
  text: '',
  owner: null,
  error: '',
};

function publish(next) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function refreshVoices() {
  if (!environmentSupported()) {
    loadedVoices = [];
    if (snapshot.supported || snapshot.hasSpanishVoice) {
      publish({ supported: false, hasSpanishVoice: false });
    }
    return;
  }

  try {
    loadedVoices = window.speechSynthesis.getVoices?.() || [];
  } catch {
    loadedVoices = [];
  }
  const hasSpanishVoice = Boolean(findSpanishVoice());
  if (snapshot.supported !== true || snapshot.hasSpanishVoice !== hasSpanishVoice) {
    publish({ supported: true, hasSpanishVoice });
  }
}

if (snapshot.supported) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
}

export function subscribeGuidedSpeech(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGuidedSpeechSnapshot() {
  return snapshot;
}

export function stopGuidedSpeech(owner) {
  if (!snapshot.speaking || !activeRunId) return false;
  if (owner !== undefined && snapshot.owner !== owner) return false;

  activeRunId = 0;
  if (pauseTimer !== null && typeof window !== 'undefined') window.clearTimeout(pauseTimer);
  pauseTimer = null;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // The visual state still returns to idle if a browser rejects cancellation.
  }
  publish({ speaking: false, status: 'cancelled', owner: null, error: '' });
  return true;
}

function splitLongText(text, limit = 240) {
  const remainingText = String(text || '').trim();
  if (remainingText.length <= limit) return remainingText ? [remainingText] : [];

  const chunks = [];
  let remaining = remainingText;
  while (remaining.length > limit) {
    let splitAt = remaining.lastIndexOf(' ', limit);
    if (splitAt < Math.floor(limit / 2)) splitAt = limit;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function userFacingSpeechError() {
  if (!environmentSupported()) return 'La lectura por voz no está disponible en este navegador. Puedes leer el texto en pantalla.';
  refreshVoices();
  if (!findSpanishVoice()) return 'No hay una voz en español disponible. Puedes leer el texto en pantalla.';
  return 'No se pudo reproducir la voz. Puedes leer el texto en pantalla o intentarlo de nuevo.';
}

export function announceGuidedSequence(messages, { pauseMs = 100, onComplete, owner } = {}) {
  const queue = (Array.isArray(messages) ? messages : [messages]).flatMap((message) => splitLongText(message));
  if (!queue.length) {
    onComplete?.({ supported: snapshot.supported, status: 'idle' });
    return false;
  }

  // A repeated effect or click from the same control cannot queue a duplicate run.
  if (snapshot.speaking && owner !== undefined && snapshot.owner === owner) return false;
  stopGuidedSpeech();

  if (!environmentSupported()) {
    const error = userFacingSpeechError();
    publish({ speaking: false, status: 'error', supported: false, hasSpanishVoice: false, text: queue.join(' '), owner: null, error });
    onComplete?.({ supported: false, status: 'error', error });
    return false;
  }

  refreshVoices();
  const voice = findSpanishVoice();
  if (!voice) {
    const error = userFacingSpeechError();
    publish({ speaking: false, status: 'error', supported: true, hasSpanishVoice: false, text: queue.join(' '), owner: null, error });
    onComplete?.({ supported: true, status: 'error', error });
    return false;
  }

  const runId = ++nextRunId;
  activeRunId = runId;
  let cursor = 0;
  const finish = (status, error = '') => {
    if (activeRunId !== runId) return;
    activeRunId = 0;
    pauseTimer = null;
    publish({ speaking: false, status, owner: snapshot.owner, error });
    onComplete?.({ supported: true, status, error });
  };
  const speakNext = () => {
    if (activeRunId !== runId) return;
    let utterance;
    try {
      utterance = new window.SpeechSynthesisUtterance(queue[cursor]);
      utterance.lang = 'es-CO';
      utterance.rate = 1;
      utterance.voice = voice;
      utterance.onend = () => {
        if (activeRunId !== runId) return;
        cursor += 1;
        if (cursor >= queue.length) return finish('completed');
        pauseTimer = window.setTimeout(() => {
          pauseTimer = null;
          speakNext();
        }, pauseMs);
      };
      utterance.onerror = (event) => {
        if (activeRunId !== runId) return;
        if (event.error === 'canceled' || event.error === 'interrupted') return finish('cancelled');
        finish('error', userFacingSpeechError());
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      finish('error', userFacingSpeechError());
    }
  };

  publish({ speaking: true, status: 'speaking', supported: true, hasSpanishVoice: true, text: queue.join(' '), owner: owner ?? null, error: '' });
  speakNext();
  return true;
}

export function announceGuided(message, options) {
  return announceGuidedSequence([message], options);
}
