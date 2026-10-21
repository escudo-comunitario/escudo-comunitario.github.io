const listeners = new Set();
let activeId = 0;
let pauseTimer = null;
let loadedVoices = [];
let snapshot = {
  speaking: false,
  supported: typeof window !== 'undefined' && Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance),
  error: '',
};

function refreshVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  loadedVoices = window.speechSynthesis.getVoices?.() || [];
}

if (snapshot.supported) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
}

function preferredSpanishVoice() {
  refreshVoices();
  return loadedVoices.find((voice) => /^es[-_]CO$/i.test(voice.lang))
    || loadedVoices.find((voice) => /^es[-_]419$/i.test(voice.lang))
    || loadedVoices.find((voice) => /^es(?:[-_]|$)/i.test(voice.lang))
    || null;
}

function publish(speaking, error = '') {
  snapshot = { ...snapshot, speaking, error };
  listeners.forEach((listener) => listener());
}

export function subscribeGuidedSpeech(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGuidedSpeechSnapshot() {
  return snapshot;
}

export function stopGuidedSpeech() {
  activeId += 1;
  if (pauseTimer !== null && typeof window !== 'undefined') window.clearTimeout(pauseTimer);
  pauseTimer = null;
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  publish(false);
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

export function announceGuidedSequence(messages, { pauseMs = 100, onComplete } = {}) {
  stopGuidedSpeech();
  const queue = (Array.isArray(messages) ? messages : [messages]).flatMap((message) => splitLongText(message));
  if (!queue.length) {
    onComplete?.({ supported: snapshot.supported });
    return false;
  }
  if (!snapshot.supported) {
    onComplete?.({ supported: false });
    return false;
  }

  const runId = activeId;
  let cursor = 0;
  const finish = (error = false) => {
    if (runId !== activeId) return;
    pauseTimer = null;
    publish(false, error ? 'No se pudo reproducir la voz. Puedes leer el texto en pantalla.' : '');
    onComplete?.({ supported: true, error });
  };
  const speakNext = () => {
    if (runId !== activeId) return;
    const utterance = new window.SpeechSynthesisUtterance(queue[cursor]);
    utterance.lang = 'es-CO';
    utterance.rate = 1;
    utterance.voice = preferredSpanishVoice();
    utterance.onend = () => {
      if (runId !== activeId) return;
      cursor += 1;
      if (cursor >= queue.length) return finish();
      pauseTimer = window.setTimeout(speakNext, pauseMs);
    };
    utterance.onerror = (event) => {
      if (runId !== activeId) return;
      finish(event.error !== 'canceled' && event.error !== 'interrupted');
    };
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      finish(true);
    }
  };

  publish(true, '');
  speakNext();
  return true;
}

export function announceGuided(message, options) {
  return announceGuidedSequence([message], options);
}
