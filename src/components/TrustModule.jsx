import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import GuidedVoiceControls from './GuidedVoiceControls';
import { announceGuidedSequence } from '../services/guidedSpeech';

function normalizeColombianNumber(input) {
  const digits = input.replace(/\D/g, '');
  if (/^3\d{9}$/.test(digits)) return `57${digits}`;
  if (/^573\d{9}$/.test(digits)) return digits;
  return null;
}

export default function TrustModule({ active = true, guided = false, resetVersion = 0, onEnableGuided, onCancelGuided, onGuidedHome }) {
  const [alias, setAlias] = useState('');
  const [phone, setPhone] = useState('');
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [guidedStep, setGuidedStep] = useState(0);
  const [speechRevision, setSpeechRevision] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const guidedWasActiveRef = useRef(false);
  const lastResetVersionRef = useRef(resetVersion);

  useEffect(() => {
    if (!guided || !active) { guidedWasActiveRef.current = false; return; }
    const enteringGuidedTask = !guidedWasActiveRef.current;
    guidedWasActiveRef.current = true;
    const taskIntro = enteringGuidedTask ? ['Elegiste contactar a alguien de confianza. Vamos a preparar un mensaje de apoyo.'] : [];
    if (confirmOpen) announceGuidedSequence([...taskIntro, 'WhatsApp abrirá el chat con el mensaje. Tú decides si lo envías. Pulsa Abrir WhatsApp o Cancelar.'], { pauseMs: 40 });
    else if (preview) announceGuidedSequence([...taskIntro, 'Revisa el nombre y el mensaje en pantalla. No leeré el número. Pulsa Abrir WhatsApp o Volver y editar.'], { pauseMs: 40 });
    else announceGuidedSequence([...taskIntro, `Paso ${guidedStep + 1}.`, ...(guidedStep === 0 ? ['¿A quién quieres pedir ayuda? Di un nombre o alias, o escríbelo.'] : ['¿Cuál es su número de WhatsApp? Puedes dictarlo o escribirlo. Revisa los dígitos.'])], { pauseMs: 40 });
  }, [active, guided, guidedStep, preview, confirmOpen, speechRevision]);

  useEffect(() => {
    if (lastResetVersionRef.current === resetVersion) return;
    lastResetVersionRef.current = resetVersion;
    setAlias('');
    setPhone('');
    setPreview(null);
    setErrors({});
    setGuidedStep(0);
    setConfirmOpen(false);
  }, [resetVersion]);

  const buildPreview = () => {
    const nextErrors = {};
    const contactAlias = alias.trim();
    const destination = normalizeColombianNumber(phone);
    if (!contactAlias) nextErrors.alias = 'Escribe el nombre o alias de tu persona de confianza.';
    if (!destination) nextErrors.phone = 'Escribe un celular colombiano de 10 dígitos, con o sin +57.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setPreview(null); return false; }

    const text = `Hola ${contactAlias}. Recibí un mensaje que me genera dudas. ¿Puedes ayudarme a revisarlo antes de responder o abrir algún enlace?`;
    const url = `https://wa.me/${destination}?text=${encodeURIComponent(text)}`;
    setPreview({ text, url, destination });
    return true;
  };

  const prepareMessage = (event) => {
    event.preventDefault();
    buildPreview();
  };

  const advanceGuided = () => {
    setErrors({});
    if (guidedStep === 0) {
      if (!alias.trim()) { setErrors({ alias: 'Escribe un nombre o alias para continuar.' }); announceGuidedSequence(['Escribe un nombre o alias.']); return; }
      setGuidedStep(1);
      return;
    }
    if (buildPreview()) setGuidedStep(2);
    else announceGuidedSequence(['Corrige el número antes de continuar.']);
  };

  const edit = () => {
    setPreview(null);
    if (guided) setGuidedStep(1);
  };

  const closeConfirmation = () => {
    setSpeechRevision((v) => v + 1);
    setConfirmOpen(false);
    announceGuidedSequence(['No se abrió WhatsApp.']);
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 800, mb: 0.75 }}>Pedir apoyo</Typography>
        <Typography color="text.secondary">Prepara un mensaje para alguien de confianza.</Typography>
        {!guided && !preview && <Button type="button" onClick={onEnableGuided} startIcon={<HelpOutlineOutlinedIcon />} sx={{ mt: 0.5, minHeight: 48 }}>Ayúdame paso a paso</Button>}
      </Box>
      <Alert severity="info">No guardamos el contacto. WhatsApp solo se abrirá si pulsas el botón.</Alert>

      {guided && !preview && (
        <Paper component="section" aria-labelledby="trust-question" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Pregunta {guidedStep + 1} de 2</Typography>
          <LinearProgress aria-label={`Progreso, pregunta ${guidedStep + 1} de 2`} variant="determinate" value={((guidedStep + 1) / 2) * 100} sx={{ mb: 2, height: 8, borderRadius: 8 }} />
          <Typography id="trust-question" component="h2" variant="h5" sx={{ fontWeight: 750 }}>
            {guidedStep === 0 ? '¿A quién quieres pedir ayuda?' : '¿Cuál es su número de WhatsApp?'}
          </Typography>
          <GuidedVoiceControls
            active={active}
            speakText={guidedStep === 0 ? 'Di el nombre o alias de tu persona de confianza. También puedes escribirlo.' : 'Di el número de celular de diez dígitos. Revisa y corrige los números antes de continuar.'}
            onTranscript={guidedStep === 0 ? setAlias : setPhone}
            onTranscriptFinal={(text) => announceGuidedSequence(guidedStep === 0 ? [`Esto es lo que entendí como nombre o alias: ${text}. Comprueba que esté correcto antes de continuar.`] : ['Se reconoció el número. Revisa los dígitos en pantalla antes de continuar. No lo leeré en voz alta.'])}
            listenLabel={guidedStep === 0 ? 'Decir el nombre' : 'Decir el número'}
            fullWidth
          />
          {guidedStep === 0 ? (
            <TextField label="Nombre o alias" value={alias} onChange={(event) => { setAlias(event.target.value); setErrors((current) => ({ ...current, alias: '' })); }} error={Boolean(errors.alias)} helperText={errors.alias || 'No hace falta escribir el nombre completo.'} inputProps={{ maxLength: 50 }} fullWidth sx={{ mt: 2 }} />
          ) : (
            <TextField label="Celular de WhatsApp" value={phone} onChange={(event) => { setPhone(event.target.value); setErrors((current) => ({ ...current, phone: '' })); }} error={Boolean(errors.phone)} helperText={errors.phone || 'Revisa que sean 10 dígitos; también puedes incluir +57.'} inputProps={{ inputMode: 'tel' }} autoComplete="tel" fullWidth sx={{ mt: 2 }} />
          )}
          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
            <Button type="button" variant="outlined" onClick={() => guidedStep ? (setSpeechRevision((v) => v + 1), setGuidedStep(0)) : onGuidedHome?.()} sx={{ minHeight: 48 }}>{guidedStep ? 'Volver' : 'Inicio guiado'}</Button>
            <Button type="button" variant="contained" onClick={advanceGuided} sx={{ minHeight: 56, flex: 1 }}>{guidedStep === 0 ? 'Continuar' : 'Revisar mensaje'}</Button>
          </Stack>
          {guidedStep > 0 && <Button type="button" onClick={onCancelGuided} sx={{ mt: 1 }}>Usar formulario convencional</Button>}
        </Paper>
      )}

      {!preview && !guided && (
        <Paper component="form" onSubmit={prepareMessage} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Stack spacing={2}>
            <TextField label="Nombre o alias de tu persona de confianza" value={alias} onChange={(event) => { setAlias(event.target.value); setErrors((current) => ({ ...current, alias: '' })); }} error={Boolean(errors.alias)} helperText={errors.alias || 'No hace falta escribir el nombre completo.'} inputProps={{ maxLength: 50 }} />
            <TextField label="Celular de WhatsApp" value={phone} onChange={(event) => { setPhone(event.target.value); setErrors((current) => ({ ...current, phone: '' })); }} error={Boolean(errors.phone)} helperText={errors.phone || 'Celular colombiano de 10 dígitos; también puedes incluir +57.'} inputProps={{ inputMode: 'tel' }} autoComplete="tel" />
            <Button type="submit" variant="contained" startIcon={<WhatsAppIcon />} sx={{ minHeight: 56 }}>Preparar mensaje</Button>
          </Stack>
        </Paper>
      )}

      {preview && (
        <Paper component="section" aria-labelledby="trust-preview-title" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Typography id="trust-preview-title" component="h2" variant="h6" sx={{ fontWeight: 750, mb: 1 }}>Revisa antes de continuar</Typography>
          <Stack spacing={0.5} sx={{ mb: 2 }}><Typography><strong>Nombre:</strong> {alias.trim()}</Typography><Typography><strong>Celular:</strong> +{preview.destination}</Typography></Stack>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}><Typography>{preview.text}</Typography></Paper>
          <Alert severity="warning" sx={{ mt: 2 }}>WhatsApp abrirá una conversación con este número y el texto preparado. Tú decides si lo envías; no sabremos si llegó.</Alert>
          {guided && <GuidedVoiceControls active={active} speakText={`Revisa en pantalla el nombre ${alias} y el mensaje: ${preview.text}. El número no se leerá automáticamente para proteger su privacidad.`} showDictation={false} />}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
            {guided ? <Button variant="contained" startIcon={<OpenInNewOutlinedIcon />} onClick={() => setConfirmOpen(true)} sx={{ minHeight: 56 }}>Abrir WhatsApp para revisar</Button> : <Button component="a" href={preview.url} target="_blank" rel="noopener noreferrer" variant="contained" startIcon={<OpenInNewOutlinedIcon />} sx={{ minHeight: 56 }}>Abrir WhatsApp para revisar</Button>}
            <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => { setSpeechRevision((v) => v + 1); edit(); }} sx={{ minHeight: 48 }}>Volver y editar</Button>
          </Stack>
          {guided && <Button onClick={onGuidedHome} sx={{ mt: 1 }}>Volver al inicio guiado</Button>}
        </Paper>
      )}
      <Dialog open={confirmOpen} onClose={closeConfirmation} aria-labelledby="trust-open-confirm-title" aria-describedby="trust-open-confirm-description">
        <DialogTitle id="trust-open-confirm-title">¿Abrir WhatsApp?</DialogTitle>
        <DialogContent id="trust-open-confirm-description">Se abrirá una conversación con el número que revisaste y el texto preparado. Tú decides si lo envías; el mensaje aún no se ha enviado.</DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmation}>Cancelar</Button>
          <Button component="a" href={preview?.url} target="_blank" rel="noopener noreferrer" onClick={() => { setConfirmOpen(false); announceGuidedSequence(['Se abrirá WhatsApp con el mensaje preparado. El mensaje no se ha enviado; tú decides si lo envías.']); }}>Abrir WhatsApp</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
