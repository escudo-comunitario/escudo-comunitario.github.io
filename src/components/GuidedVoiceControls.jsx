import React, { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import HearingOutlinedIcon from '@mui/icons-material/HearingOutlined';
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import { announceGuided, announceGuidedSequence, getGuidedSpeechSnapshot, stopGuidedSpeech, subscribeGuidedSpeech } from '../services/guidedSpeech';
import { transcriptFromResults } from '../services/speechTranscript';

function voiceErrorMessage(error) {
  if (error === 'not-allowed' || error === 'service-not-allowed') return 'No diste permiso para usar el micrófono. Puedes escribir la respuesta.';
  if (error === 'no-speech') return 'No alcancé a escuchar. Inténtalo de nuevo o escribe la respuesta.';
  if (error === 'audio-capture') return 'No pudimos usar el micrófono. Puedes escribir la respuesta.';
  if (error === 'network') return 'No pudimos convertir tu voz en texto. Comprueba tu conexión o escribe la respuesta.';
  if (error === 'aborted') return '';
  return 'No pudimos usar el micrófono. Puedes intentarlo de nuevo o escribir la respuesta.';
}

export default function GuidedVoiceControls({
  speakText,
  onTranscript,
  onTranscriptFinal,
  speakSequence,
  speakLabel = 'Escuchar resultado',
  autoPlayKey,
  listenLabel = 'Responder hablando',
  showDictation = true,
  showSpeechControls = true,
  fullWidth = false,
  transcriptValue = '',
  appendTranscript = false,
  active = true,
}) {
  const [listening, setListening] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [error, setError] = useState('');
  const ownerId = useId();
  const lastAutoPlayKeyRef = useRef(null);
  const recognitionRef = useRef(null);
  const hasResultRef = useRef(false);
  const failedRef = useRef(false);
  const latestTranscriptRef = useRef('');
  const finalTranscriptRef = useRef('');
  const transcriptValueRef = useRef(transcriptValue);
  transcriptValueRef.current = transcriptValue;
  const activeRef = useRef(active);
  activeRef.current = active;
  const speech = useSyncExternalStore(subscribeGuidedSpeech, getGuidedSpeechSnapshot, getGuidedSpeechSnapshot);
  const speaking = speech.speaking && speech.owner === ownerId;
  const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const canSpeak = speech.supported && speech.hasSpanishVoice;

  useEffect(() => {
    if (autoPlayKey === undefined || autoPlayKey === null || lastAutoPlayKeyRef.current === autoPlayKey) return;
    lastAutoPlayKeyRef.current = autoPlayKey;
    if (!active) return;
    if (!canSpeak) {
      setError(speech.supported
        ? 'No hay una voz en español disponible. Puedes leer el resultado en pantalla.'
        : 'La lectura por voz no está disponible en este navegador. Puedes leer el resultado en pantalla.');
      return;
    }
    setHasPlayed(true);
    const started = speakSequence
      ? announceGuidedSequence(speakSequence, { owner: ownerId })
      : announceGuided(speakText, { owner: ownerId });
    if (!started) setError(getGuidedSpeechSnapshot().error || 'No se pudo reproducir la voz. Puedes leer el resultado en pantalla.');
    else setError('');
  }, [active, autoPlayKey, canSpeak, ownerId, speakSequence, speakText, speech.supported]);

  useEffect(() => {
    if (active) return;
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    setListening(false);
    stopGuidedSpeech(ownerId);
  }, [active, ownerId]);

  useEffect(() => () => {
    activeRef.current = false;
    recognitionRef.current?.abort?.();
  }, []);

  const repeat = () => {
    if (speaking) return stopGuidedSpeech(ownerId);
    if (!canSpeak || (!speakText && !speakSequence)) {
      setError(speech.supported
        ? 'No hay una voz en español disponible. Puedes leer el texto en pantalla.'
        : 'La lectura por voz no está disponible en este navegador. Puedes leer el texto en pantalla.');
      return;
    }
    setError('');
    setCompleted(false);
    setHasPlayed(true);
    const started = speakSequence
      ? announceGuidedSequence(speakSequence, { owner: ownerId })
      : announceGuided(speakText, { owner: ownerId });
    if (!started) setError(getGuidedSpeechSnapshot().error || 'No se pudo reproducir la voz. Puedes leer el texto en pantalla.');
  };

  const startListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    if (!SpeechRecognition || !onTranscript) return;
    stopGuidedSpeech();

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CO';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    hasResultRef.current = false;
    failedRef.current = false;
    latestTranscriptRef.current = '';
    finalTranscriptRef.current = '';
    setError('');
    setCompleted(false);
    setListening(true);
    recognition.onresult = (event) => {
      hasResultRef.current = true;
      const results = Array.from(event.results);
      const transcript = transcriptFromResults(results).trim();
      const finalTranscript = transcriptFromResults(results.filter((item) => item.isFinal)).trim();
      latestTranscriptRef.current = transcript;
      if (finalTranscript) finalTranscriptRef.current = finalTranscript;
      if (transcript && !appendTranscript) onTranscript(transcript);
    };
    recognition.onerror = (event) => {
      if (!activeRef.current) return;
      failedRef.current = true;
      setError(voiceErrorMessage(event.error));
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (!activeRef.current) return;
      if (!hasResultRef.current && !failedRef.current) setError(voiceErrorMessage('no-speech'));
      if (hasResultRef.current) {
        const transcript = finalTranscriptRef.current || latestTranscriptRef.current;
        if (transcript) {
          if (appendTranscript) {
            const previous = transcriptValueRef.current.trimEnd();
            onTranscript(`${previous}${previous ? ' ' : ''}${transcript}`);
          }
          setCompleted(true);
          onTranscriptFinal?.(transcript);
        }
      }
    };
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      failedRef.current = true;
      setListening(false);
      setError('No se pudo iniciar el micrófono. Puedes escribir la respuesta.');
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 1, mt: 1.5 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {showSpeechControls && canSpeak && (
          <Button type="button" variant={speaking ? 'contained' : 'outlined'} fullWidth={fullWidth} onClick={repeat} disabled={listening} startIcon={speaking ? <StopCircleOutlinedIcon /> : <HearingOutlinedIcon />} sx={{ minHeight: 48 }}>
            {speaking ? 'Detener lectura' : hasPlayed ? 'Escuchar de nuevo' : speakLabel}
          </Button>
        )}
        {showDictation && onTranscript && SpeechRecognition && (
          <Button type="button" variant={listening ? 'contained' : 'outlined'} fullWidth={fullWidth} className={listening ? 'voice-listening' : undefined} onClick={startListening} startIcon={listening ? <StopCircleOutlinedIcon /> : <MicNoneOutlinedIcon />} sx={{ minHeight: 56 }}>
            {listening ? 'Terminar' : listenLabel}
          </Button>
        )}
      </Box>
      {listening && <Typography role="status" aria-live="polite">Estoy escuchando. Pulsa “Terminar” cuando acabes.</Typography>}
      {completed && <Typography role="status" aria-live="polite">Dictado terminado. Revisa y edita el texto.</Typography>}
      {showDictation && onTranscript && !SpeechRecognition && <Typography color="text.secondary">En este navegador no puedes dictar. Puedes escribir la respuesta.</Typography>}
      {showSpeechControls && !canSpeak && <Typography color="text.secondary">{speech.supported ? 'No hay una voz en español disponible; puedes leer el texto en pantalla.' : 'La lectura por voz no está disponible; puedes leer el texto en pantalla.'}</Typography>}
      {(error || (speech.owner === ownerId && speech.error)) && <Alert severity="warning" role="alert">{error || speech.error}</Alert>}
    </Box>
  );
}
