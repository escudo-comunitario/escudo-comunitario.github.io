import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import HearingOutlinedIcon from '@mui/icons-material/HearingOutlined';
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import { announceGuided, announceGuidedSequence, getGuidedSpeechSnapshot, stopGuidedSpeech, subscribeGuidedSpeech } from '../services/guidedSpeech';

function voiceErrorMessage(error) {
  if (error === 'not-allowed' || error === 'service-not-allowed') return 'No se autorizó el micrófono. Puedes escribir la respuesta.';
  if (error === 'no-speech') return 'No alcancé a escuchar. Inténtalo de nuevo o escribe la respuesta.';
  if (error === 'audio-capture') return 'No se encontró un micrófono disponible. Puedes escribir la respuesta.';
  if (error === 'network') return 'Falló el reconocimiento de voz. Comprueba tu conexión o escribe la respuesta.';
  if (error === 'aborted') return '';
  return 'No se pudo usar el micrófono. Puedes intentarlo de nuevo o escribir la respuesta.';
}

export default function GuidedVoiceControls({
  speakText,
  onTranscript,
  onTranscriptFinal,
  speakSequence,
  speakLabel = 'Escuchar de nuevo',
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
  const [error, setError] = useState('');
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
  const speaking = speech.speaking;
  const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const canSpeak = speech.supported;

  useEffect(() => {
    if (active) return;
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    setListening(false);
  }, [active]);

  useEffect(() => () => {
    activeRef.current = false;
    recognitionRef.current?.abort?.();
  }, []);

  const repeat = () => {
    if (speaking) return stopGuidedSpeech();
    if (!canSpeak || (!speakText && !speakSequence)) return;
    setError('');
    setCompleted(false);
    if (speakSequence) announceGuidedSequence(speakSequence);
    else announceGuided(speakText);
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
      const transcript = results.map((item) => item[0]?.transcript || '').join('').trim();
      const finalTranscript = results.filter((item) => item.isFinal).map((item) => item[0]?.transcript || '').join('').trim();
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
            {speaking ? 'Detener lectura' : speakLabel}
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
      {showDictation && onTranscript && !SpeechRecognition && <Typography color="text.secondary">Este navegador no permite dictar aquí. Puedes escribir la respuesta.</Typography>}
      {showSpeechControls && !canSpeak && <Typography color="text.secondary">La lectura por voz no está disponible; la instrucción sigue visible.</Typography>}
      {(error || speech.error) && <Alert severity="warning" role="alert">{error || speech.error}</Alert>}
    </Box>
  );
}
