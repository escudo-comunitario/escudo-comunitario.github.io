import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import ImageSearchOutlinedIcon from '@mui/icons-material/ImageSearchOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { analyzeReceiptImage, AnalysisServiceError, MAX_RECEIPT_IMAGE_BYTES } from '../services/api';
import { announceGuided, stopGuidedSpeech } from '../services/guidedSpeech';
import GuidedVoiceControls from './GuidedVoiceControls';
import ReceiptAnalysisResult, { getReceiptSpeechText } from './ReceiptAnalysisResult';

const MAX_IMAGE_MB = Math.floor(MAX_RECEIPT_IMAGE_BYTES / (1024 * 1024));

export default function ReceiptAnalysisModule({ active = true, guided = false, entryVersion = 0, onHome, onOpenAnalysis }) {
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [autoSpeakKey, setAutoSpeakKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState(false);
  const requestRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastEntryVersionRef = useRef(entryVersion);
  const isBusy = status === 'loading';

  useEffect(() => {
    if (!image) {
      setPreviewUrl('');
      setPreviewError(false);
      return undefined;
    }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    setPreviewError(false);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  useEffect(() => () => {
    requestRef.current?.abort();
    requestRef.current = null;
  }, []);

  useEffect(() => {
    if (lastEntryVersionRef.current === entryVersion) return;
    lastEntryVersionRef.current = entryVersion;
    requestRef.current?.abort();
    requestRef.current = null;
    setImage(null);
    setResult(null);
    setError('');
    setStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [entryVersion]);

  useEffect(() => {
    if (!active && requestRef.current) {
      requestRef.current.abort();
      requestRef.current = null;
      setStatus('error');
      setError('La revisión se detuvo al salir de esta pantalla. Puedes intentarlo de nuevo.');
    }
  }, [active]);

  const updateImage = (nextImage) => {
    stopGuidedSpeech();
    setImage(nextImage);
    setResult(null);
    setError('');
    setStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (event) => {
    const nextImage = event.target.files?.[0] || null;
    if (!nextImage) return;
    if (!['image/jpeg', 'image/png'].includes(nextImage.type)) {
      updateImage(null);
      setError('Elige una imagen JPG o PNG.');
      setStatus('error');
      event.target.value = '';
      return;
    }
    if (!nextImage.size || nextImage.size > MAX_RECEIPT_IMAGE_BYTES) {
      updateImage(null);
      setError(nextImage.size ? `La imagen debe pesar máximo ${MAX_IMAGE_MB} MB.` : 'La imagen está vacía. Elige otra imagen.');
      setStatus('error');
      event.target.value = '';
      return;
    }
    updateImage(nextImage);
    announceGuided('Imagen seleccionada. Ya puedes verificar el comprobante.');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (requestRef.current) return;
    if (!image) {
      setError('Selecciona una imagen JPG o PNG para continuar.');
      setStatus('error');
      announceGuided('Primero selecciona una imagen del comprobante.');
      return;
    }

    stopGuidedSpeech();
    announceGuided('Verificando comprobante. Espera un momento.');
    const controller = new AbortController();
    requestRef.current = controller;
    setError('');
    setResult(null);
    setStatus('loading');
    try {
      const response = await analyzeReceiptImage(image, undefined, 'Bosa Central', { signal: controller.signal });
      if (requestRef.current !== controller) return;
      setResult(response);
      setStatus('result');
      setAutoSpeakKey((key) => key + 1);
    } catch (requestError) {
      if (requestRef.current !== controller || requestError?.name === 'AbortError') return;
      const isServiceError = requestError instanceof AnalysisServiceError;
      const kind = isServiceError ? requestError.kind : 'unexpected';
      const diagnostic = { kind };
      if (isServiceError && Number.isInteger(requestError.status)) diagnostic.status = requestError.status;
      if (isServiceError && ['validation', 'invalid-response', 'invalid-json'].includes(kind)) {
        diagnostic.reason = requestError.message;
      }
      console.error('No se pudo revisar el comprobante.', diagnostic);
      setError('No se pudo revisar el comprobante. Comprueba tu conexión e inténtalo de nuevo.');
      setStatus('error');
      announceGuided('No se pudo revisar el comprobante. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const cancel = () => {
    const request = requestRef.current;
    if (!request) return;
    requestRef.current = null;
    request.abort();
    stopGuidedSpeech();
    setStatus('error');
    setError('Revisión cancelada. La imagen sigue aquí y puedes intentarlo de nuevo.');
  };

  const clearForm = () => {
    stopGuidedSpeech();
    requestRef.current?.abort();
    requestRef.current = null;
    updateImage(null);
    setResult(null);
    setError('');
    setStatus('idle');
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box>
        <Typography component="h2" variant="h5" sx={{ fontWeight: 800 }}>Verificar comprobante</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Revisa señales de alerta en un comprobante. El resultado es orientativo y no confirma que el pago haya llegado.
        </Typography>
      </Box>
      <Box component="nav" aria-label="Opciones de navegación" sx={{ display: 'grid', gap: 1 }}>
        <GuidedVoiceControls
          active={active}
          speakText="Aquí puedes revisar un comprobante de pago. Selecciona su imagen y pulsa verificar. Recuerda que el resultado es orientativo."
          speakLabel="Escuchar de nuevo"
          autoPlayKey={entryVersion}
          showDictation={false}
        />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button type="button" variant="outlined" onClick={onOpenAnalysis} sx={{ minHeight: 48 }}>Revisar un mensaje sospechoso</Button>
          <Button type="button" onClick={onHome} sx={{ minHeight: 48 }}>{guided ? 'Volver al inicio guiado' : 'Volver al inicio'}</Button>
        </Box>
      </Box>

      <Paper component="form" onSubmit={submit} variant="outlined" aria-busy={isBusy} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button type="button" variant="contained" startIcon={<ImageSearchOutlinedIcon />} disabled={isBusy} onClick={() => fileInputRef.current?.click()} sx={{ minHeight: 56 }}>
            {image ? 'Reemplazar imagen' : 'Seleccionar imagen'}
          </Button>
          <input ref={fileInputRef} hidden type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={handleFileChange} aria-label="Seleccionar comprobante JPG o PNG" />
          {image && <Button type="button" variant="outlined" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => updateImage(null)} disabled={isBusy} sx={{ minHeight: 56 }}>Quitar imagen</Button>}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Formatos JPG o PNG. Tamaño máximo: {MAX_IMAGE_MB} MB.
        </Typography>

        {image && <Box sx={{ mt: 2, display: 'grid', gap: 1 }}>
          <Typography><strong>Imagen seleccionada:</strong> {image.name} ({(image.size / (1024 * 1024)).toFixed(2)} MB)</Typography>
          {previewError
            ? <Alert severity="warning" role="status">No pudimos mostrar la vista previa. La imagen sigue seleccionada.</Alert>
            : previewUrl && <Box component="img" src={previewUrl} alt="Vista previa de la imagen del comprobante" onError={() => setPreviewError(true)} sx={{ display: 'block', maxWidth: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 2, bgcolor: 'grey.100' }} />}
        </Box>}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mt: 2 }}>
          <Button type="submit" variant="contained" disabled={isBusy} startIcon={isBusy ? <CircularProgress size={20} color="inherit" /> : <ImageSearchOutlinedIcon />} sx={{ flex: 1, minWidth: 210, minHeight: 56 }}>
            {isBusy ? 'Revisando comprobante…' : status === 'error' ? 'Volver a intentar' : 'Verificar comprobante'}
          </Button>
          {isBusy
            ? <Button type="button" variant="outlined" onClick={cancel} sx={{ minHeight: 56 }}>Cancelar</Button>
            : (image || result || error) && <Button type="button" onClick={clearForm} sx={{ minHeight: 56 }}>Limpiar</Button>}
        </Box>
        {isBusy && <Alert severity="info" role="status" aria-live="polite" sx={{ mt: 2 }}>La imagen se está revisando. Puedes cancelar y conservarla.</Alert>}
        {error && <Alert severity="error" role="alert" sx={{ mt: 2 }}>{error}</Alert>}
      </Paper>

      {result && <>
        <ReceiptAnalysisResult result={result} />
        <GuidedVoiceControls active={active} speakText={getReceiptSpeechText(result)} speakLabel="Escuchar resultado" autoPlayKey={autoSpeakKey} showDictation={false} />
      </>}
    </Box>
  );
}
