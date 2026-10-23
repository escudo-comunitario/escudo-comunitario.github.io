import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Paper, TextField, Typography,
} from '@mui/material';
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import { analyzeMessage, validateAnalysisResult } from '../services/api';
import AnalysisResult, { getMessageSpeechText } from './AnalysisResult';
import GuidedVoiceControls from './GuidedVoiceControls';
import { announceGuidedSequence, stopGuidedSpeech } from '../services/guidedSpeech';

function cancelRecognition(recognition) {
  if (typeof recognition?.abort === 'function') recognition.abort();
  else recognition?.stop?.();
}

export default function AnalysisModule({ active = true, guided = false, resetVersion = 0, onEnableGuided, onCancelGuided, onGuidedHome, entryMode = 'text', entryVersion = 0, onRequestHelp, onOpenReceipt }) {
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState(entryMode);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [resultMessage, setResultMessage] = useState('');
  const [autoSpeakKey, setAutoSpeakKey] = useState(0);
  const [analysisConfirmed, setAnalysisConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [interaction, setInteraction] = useState({ message: '', version: 0 });
  const [voiceState, setVoiceState] = useState('idle');
  const requestRef = useRef(null);
  const timeoutRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceHasResultRef = useRef(false);
  const voiceFailedRef = useRef(false);
  const voiceErrorRef = useRef('');
  const inputRef = useRef(null);
  const statusRef = useRef(status);
  const narratedStateRef = useRef('');
  const narratedInteractionRef = useRef(0);
  const guidedWasActiveRef = useRef(false);
  const modeChangeLeadRef = useRef('');
  const lastResetVersionRef = useRef(resetVersion);
  statusRef.current = status;
  const isBusy = status === 'loading';
  const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const showMessageField = mode === 'text' || Boolean(message) || voiceState === 'listening' || !SpeechRecognition;

  useEffect(() => {
    setMode(entryMode);
    setAnalysisConfirmed(false);
    if (statusRef.current === 'validation') {
      setStatus('idle');
      setError('');
    }
    if (entryMode === 'text') inputRef.current?.focus();
  }, [entryMode, entryVersion]);

  useEffect(() => {
    if (lastResetVersionRef.current === resetVersion) return;
    lastResetVersionRef.current = resetVersion;
    narratedStateRef.current = '';
    requestRef.current?.abort();
    requestRef.current = null;
    globalThis.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    cancelRecognition(recognition);
    setMessage('');
    setResult(null);
    setResultMessage('');
    setError('');
    setStatus('idle');
    setVoiceState('idle');
    setAnalysisConfirmed(false);
    setMode('text');
  }, [resetVersion]);

  useEffect(() => () => {
    requestRef.current?.abort();
    globalThis.clearTimeout(timeoutRef.current);
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    cancelRecognition(recognition);
  }, []);

  useEffect(() => {
    if (!active && voiceState === 'listening') {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      cancelRecognition(recognition);
      setVoiceState('idle');
    }
  }, [active, voiceState]);

  useEffect(() => {
    if (!guided || !active) { guidedWasActiveRef.current = false; return; }
    if (mode !== entryMode) return;
    // Result speech is triggered only by the successful submission that created it.
    // Editing the input or changing modes must not replay a previous result.
    if (status === 'result') return;
    const enteringGuidedTask = !guidedWasActiveRef.current;
    guidedWasActiveRef.current = true;
    if (enteringGuidedTask) narratedStateRef.current = '';
    if (voiceState === 'listening') return;
    const stateKey = `${entryVersion}|${status}|${analysisConfirmed}|${analysisConfirmed ? message : ''}|${mode}|${error}|${interaction.version}`;
    if (narratedStateRef.current === stateKey) return;
    narratedStateRef.current = stateKey;
    const modeChangeLead = modeChangeLeadRef.current;
    modeChangeLeadRef.current = '';
    const taskIntro = [
      ...(enteringGuidedTask ? ['Elegiste revisar un mensaje sospechoso. Vamos a revisarlo con calma.'] : []),
      ...(modeChangeLead ? [modeChangeLead] : []),
    ];
    if (interaction.version > narratedInteractionRef.current) {
      narratedInteractionRef.current = interaction.version;
      announceGuidedSequence([...taskIntro, interaction.message]);
    } else if (status === 'loading') announceGuidedSequence([...taskIntro, 'Análisis en curso. Puedes cancelarlo; el texto se conservará.']);
    else if (status === 'error' || status === 'invalid' || status === 'validation') announceGuidedSequence([...taskIntro, error || 'La respuesta recibida no tiene el formato esperado. Puedes conservar el texto e intentarlo de nuevo.']);
    else if (status === 'idle' && error) announceGuidedSequence([...taskIntro, error]);
    else if (analysisConfirmed) announceGuidedSequence([...taskIntro, 'Revisa este texto. Corrígelo si hace falta. Pulsa Analizar ahora para continuar.', message]);
    else if (mode === 'voice') announceGuidedSequence([...taskIntro, 'Pulsa Empezar a hablar. También puedes escribir o pegar el mensaje. Revísalo antes de analizarlo.']);
    else announceGuidedSequence([...taskIntro, 'Pega o escribe el mensaje. También puedes dictarlo. Revísalo antes de analizarlo.']);
  }, [active, guided, status, analysisConfirmed, mode, entryMode, error, interaction, message, voiceState]);

  const submit = async (event) => {
    event.preventDefault();
    if (requestRef.current) return;
    if (!message.trim()) {
      setError('Escribe o dicta el mensaje que quieres revisar.');
      setStatus('validation');
      return;
    }

    if (guided && !analysisConfirmed) {
      setAnalysisConfirmed(true);
      setError('');
      setStatus('idle');
      return;
    }

    const controller = new AbortController();
    stopGuidedSpeech();
    requestRef.current = controller;
    setError('');
    setResult(null);
    setStatus('loading');
    const requestTimeout = window.setTimeout(() => {
      controller.abort();
      if (requestRef.current === controller) requestRef.current = null;
      setError('La revisión está tardando más de lo esperado. Puedes esperar o cancelar.');
      setStatus('error');
    }, 30000);
    timeoutRef.current = requestTimeout;

    try {
      const response = await analyzeMessage(message, undefined, {
        signal: controller.signal,
        modo: mode === 'voice' ? 'voz' : 'texto',
      });
      if (requestRef.current !== controller) return;
      const validation = validateAnalysisResult(response);
      if (!validation.valid) throw Object.assign(new Error(validation.reason), { kind: 'invalid-response' });
      setResult(response);
      setResultMessage(message.trim());
      setStatus('result');
      setAutoSpeakKey((key) => key + 1);
    } catch (requestError) {
      if (requestRef.current !== controller || requestError?.name === 'AbortError') return;
      console.error('No se pudo revisar el mensaje.', requestError);
      setError(requestError?.kind === 'invalid-response'
        ? 'No pudimos obtener el resultado. Inténtalo de nuevo.'
        : 'No pudimos revisar el mensaje. Comprueba tu conexión e inténtalo de nuevo.');
      setStatus(requestError?.kind === 'invalid-response' ? 'invalid' : 'error');
    } finally {
      window.clearTimeout(requestTimeout);
      if (timeoutRef.current === requestTimeout) timeoutRef.current = null;
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const cancelAnalysis = () => {
    const request = requestRef.current;
    request?.abort();
    if (requestRef.current === request) requestRef.current = null;
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setStatus('error');
    setError('Revisión cancelada. El texto sigue aquí y puedes intentarlo de nuevo.');
    setInteraction((current) => ({ message: 'Cancelaste la revisión. El texto sigue aquí y puedes intentarlo de nuevo.', version: current.version + 1 }));
  };

  const toggleVoice = () => {
    if (voiceState === 'listening') {
      recognitionRef.current?.stop();
      return;
    }
    if (!SpeechRecognition) return;
    stopGuidedSpeech();
    const recognition = new SpeechRecognition();
    const textBeforeDictation = message.trim();
    recognition.lang = 'es-CO';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    voiceHasResultRef.current = false;
    voiceFailedRef.current = false;
    voiceErrorRef.current = '';
    setVoiceState('listening');
    setError('');
    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return;
      voiceHasResultRef.current = true;
      const transcript = Array.from(event.results).map((item) => item[0]?.transcript || '').join('');
      setMessage(`${textBeforeDictation}${textBeforeDictation && transcript ? ' ' : ''}${transcript}`);
      setAnalysisConfirmed(false);
    };
    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;
      voiceFailedRef.current = true;
      setVoiceState('idle');
      voiceErrorRef.current = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'No se autorizó el micrófono. Puedes escribir o pegar el mensaje.'
        : event.error === 'no-speech'
          ? 'No alcancé a escuchar. Inténtalo de nuevo o escribe el mensaje.'
          : 'No se pudo usar el micrófono. Puedes escribir o pegar el mensaje.';
      setError(voiceErrorRef.current);
    };
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      setVoiceState('idle');
      recognitionRef.current = null;
      if (!voiceHasResultRef.current && !voiceFailedRef.current) {
        const noSpeech = 'No alcancé a escuchar. Inténtalo de nuevo o escribe el mensaje.';
        setError(noSpeech);
      }
      if (voiceHasResultRef.current) {
        const recognizedText = Array.from(recognition.results || []).map((item) => item[0]?.transcript || '').join('').trim();
        if (recognizedText) announceGuidedSequence(['Esto es lo que he entendido. Escúchalo y comprueba que esté correcto antes de continuar.', recognizedText]);
      }
    };
    try { recognition.start(); } catch {
      recognitionRef.current = null;
      voiceFailedRef.current = true;
      setVoiceState('idle');
      setError('No se pudo iniciar el micrófono. Puedes escribir o pegar el mensaje.');
    }
  };

  const clearForm = () => {
    stopGuidedSpeech();
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    cancelRecognition(recognition);
    setMessage(''); setResult(null); setResultMessage(''); setError(''); setStatus('idle'); setVoiceState('idle'); setAnalysisConfirmed(false);
  };

  const resultNarration = result ? getMessageSpeechText(result) : '';

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Button type="button" variant="outlined" onClick={onOpenReceipt} sx={{ justifySelf: 'start', minHeight: 48 }}>
        Verificar comprobante de pago
      </Button>
      <Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 800, mb: 0.75 }}>
          {mode === 'voice' ? 'Cuéntalo con tu voz' : 'Revisar mensaje'}
        </Typography>
        <Typography color="text.secondary">
          {mode === 'voice' ? 'Habla, revisa el texto y corrígelo si hace falta.' : 'Pega aquí el mensaje que recibiste.'}
        </Typography>
        {!guided && <Button type="button" onClick={onEnableGuided} startIcon={<MicNoneOutlinedIcon />} sx={{ mt: 0.5, alignSelf: 'flex-start', minHeight: 48 }}>Ayúdame paso a paso</Button>}
      </Box>

      <Alert severity="info">No escribas tus contraseñas ni los códigos que te llegan al celular.</Alert>
      <GuidedVoiceControls active={active} speakText={mode === 'voice' ? 'Puedes contar el mensaje con tu voz. Revísalo antes de analizarlo.' : 'Pega o escribe el mensaje. Puedes escucharlo antes de analizarlo.'} autoPlayKey={guided || mode !== entryMode ? undefined : entryVersion} speakLabel="Escuchar instrucciones" showDictation={false} />

      <Paper component="form" onSubmit={submit} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }} aria-busy={isBusy}>
        {showMessageField && <TextField
          inputRef={inputRef}
          id="suspicious-message"
          label={mode === 'voice' ? 'Texto reconocido (puedes corregirlo)' : 'Mensaje que quieres revisar'}
          placeholder={mode === 'voice' ? 'El texto aparecerá aquí…' : 'Pega aquí el mensaje…'}
          value={message}
          onChange={(event) => { if (result && status === 'result') stopGuidedSpeech(); setMessage(event.target.value); setAnalysisConfirmed(false); if (status === 'validation') { setStatus('idle'); setError(''); } }}
          multiline minRows={4} maxRows={12} fullWidth
          disabled={isBusy || voiceState === 'listening'}
          inputProps={{ 'aria-describedby': 'message-help', maxLength: 2000 }}
        />}
        {showMessageField && <Typography id="message-help" variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {mode === 'voice' ? 'El micrófono se inicia al pulsar “Empezar a hablar”.' : 'No abras los enlaces. Aún no puedes analizar capturas.'} Máximo 2000 caracteres ({message.length}/2000).
        </Typography>}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mt: 2 }}>
          {mode === 'text' && <Button type="button" variant="outlined" startIcon={<MicNoneOutlinedIcon />} onClick={() => { modeChangeLeadRef.current = 'Elegiste dictar el mensaje.'; setMode('voice'); }} disabled={isBusy} sx={{ minHeight: 56 }}>Contarlo con mi voz</Button>}
          {mode === 'voice' && SpeechRecognition && (
            <Button type="button" fullWidth={mode === 'voice' && !message} variant={voiceState === 'listening' ? 'outlined' : 'contained'} className={voiceState === 'listening' ? 'voice-listening' : undefined} startIcon={voiceState === 'listening' ? <StopCircleOutlinedIcon /> : <MicNoneOutlinedIcon />} onClick={toggleVoice} disabled={isBusy} sx={{ minHeight: 64 }}>
              {voiceState === 'listening' ? 'Terminar' : 'Empezar a hablar'}
            </Button>
          )}
          {(mode === 'text' || Boolean(message.trim()) || !SpeechRecognition) && <Button type="submit" variant="contained" startIcon={isBusy ? <CircularProgress size={20} color="inherit" /> : <SendOutlinedIcon />} disabled={isBusy || voiceState === 'listening'} sx={{ flex: 1, minWidth: 180, minHeight: 56 }}>
            {isBusy ? 'Revisando…' : status === 'error' ? 'Volver a intentar' : guided && analysisConfirmed ? 'Analizar ahora' : guided ? 'Revisar antes de analizar' : 'Analizar mensaje'}
          </Button>}
          {isBusy ? (
            <Button type="button" variant="text" onClick={cancelAnalysis}>Cancelar</Button>
          ) : (message || result || error) ? (
            <Button type="button" variant="text" onClick={() => { setInteraction((current) => ({ message: 'Se limpió el texto y el resultado de esta vista. Puedes escribir, pegar o dictar otro mensaje.', version: current.version + 1 })); clearForm(); }}>Limpiar</Button>
          ) : null}
        </Box>
        {guided && analysisConfirmed && <Alert severity="info" role="status" sx={{ mt: 2 }}>
          Revisa el texto que aparece arriba. Puedes corregirlo. Para enviarlo al servicio de análisis, vuelve a pulsar “Analizar ahora”.
        </Alert>}
        {mode === 'voice' && !SpeechRecognition && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Este navegador no permite dictar aquí. Puedes escribir o pegar el mensaje.
            <Button size="small" onClick={() => { setMode('text'); inputRef.current?.focus(); }}>Escribir mensaje</Button>
          </Alert>
        )}
        {mode === 'voice' && SpeechRecognition && (
          <Button type="button" startIcon={<EditNoteOutlinedIcon />} onClick={() => { modeChangeLeadRef.current = 'Elegiste escribir el mensaje.'; setMode('text'); }} disabled={isBusy || voiceState === 'listening'} sx={{ mt: 1 }}>
            Prefiero escribir
          </Button>
        )}
        {guided && <Button type="button" onClick={onGuidedHome} sx={{ mt: 1, alignSelf: 'flex-start', minHeight: 48 }}>Volver al inicio guiado</Button>}
        {voiceState === 'listening' && <Typography role="status" aria-live="polite" sx={{ mt: 1 }}>Estoy escuchando. Pulsa “Terminar” para revisar el texto.</Typography>}
      </Paper>

      {error && <Alert severity={status === 'validation' ? 'warning' : 'error'} role="alert">{error}</Alert>}
      {isBusy && <Alert severity="info" role="status" aria-live="polite">Estamos revisando el mensaje. Puedes cancelar; el texto se conservará.</Alert>}
      {result && <>
        {resultMessage !== message.trim() && <Alert severity="info" role="status" sx={{ mt: 1 }}>
          Este resultado corresponde al texto anterior. Pulsa «Analizar mensaje» para revisar el texto actualizado.
        </Alert>}
        <AnalysisResult result={result} />
        <GuidedVoiceControls active={active} speakText={resultNarration} speakLabel="Escuchar resultado" autoPlayKey={autoSpeakKey} showDictation={false} />
        <Button variant="outlined" onClick={onRequestHelp}>¿Quieres revisarlo con alguien de confianza?</Button>
      </>}
    </Box>
  );
}
