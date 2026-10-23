import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, FormControl, FormControlLabel, FormLabel, LinearProgress,
  MenuItem, Paper, Radio, RadioGroup, Stack, TextField, Typography,
} from '@mui/material';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import GuidedVoiceControls from './GuidedVoiceControls';
import { announceGuidedSequence } from '../services/guidedSpeech';
import { reportIncident, verifyIncidentIntegrity } from '../services/api';

const upzOptions = ['Bosa Central', 'Bosa Occidental', 'Tintal Sur', 'El Porvenir'];

const initialForm = { type: '', description: '', date: '', channel: '', impact: '' };
const typeLabels = {
  mensaje: 'Mensaje o enlace sospechoso',
  suplantacion: 'Suplantación de una entidad o persona',
  llamada: 'Llamada sospechosa',
  otro: 'Otra situación',
};
const incidentTypes = [
  { value: 'mensaje', label: 'Mensaje o enlace sospechoso', icon: <SmsOutlinedIcon /> },
  { value: 'suplantacion', label: 'Suplantación de alguien', icon: <PersonOutlineOutlinedIcon /> },
  { value: 'llamada', label: 'Llamada sospechosa', icon: <CallOutlinedIcon /> },
  { value: 'otro', label: 'Otra situación', icon: <HelpOutlineOutlinedIcon /> },
];
const channelOptions = [
  { value: 'WhatsApp', label: 'WhatsApp', icon: <WhatsAppIcon /> },
  { value: 'Llamada', label: 'Llamada', icon: <CallOutlinedIcon /> },
  { value: 'Mensaje de texto', label: 'Mensaje de texto', icon: <SmsOutlinedIcon /> },
  { value: 'Otro canal', label: 'Otro canal', icon: <HelpOutlineOutlinedIcon /> },
  { value: 'No recuerdo', label: 'No recuerdo', icon: <PersonOutlineOutlinedIcon /> },
];
const stepQuestions = [
  '¿Qué tipo de situación te ocurrió? Selecciona la opción que más se acerque a lo que pasó.',
  'Ahora cuéntame con tus propias palabras qué ocurrió. Puedes escribirlo o usar el micrófono.',
  '¿Cuándo pasó?',
  '¿Cómo te contactaron?',
  '¿Perdiste dinero o te pareció sospechoso?',
];

function localDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(value) {
  if (!value) return 'No especificada';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date(`${value}T12:00:00`));
}

function ChoiceButtons({ choices, value, onChange, label }) {
  return (
    <FormControl component="fieldset" fullWidth>
      <FormLabel>{label}</FormLabel>
      <RadioGroup aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, mt: 1 }}>
        {choices.map((choice) => (
          <FormControlLabel
            key={choice.value}
            value={choice.value}
            control={<Radio />}
            label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{choice.icon}<Typography>{choice.label}</Typography></Box>}
            sx={{ m: 0, minHeight: 56, px: 1, border: '1px solid', borderColor: value === choice.value ? 'primary.main' : 'divider', borderRadius: 2, bgcolor: value === choice.value ? 'action.selected' : 'background.paper' }}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}

export default function IncidentModule({ active = true, guided = false, resetVersion = 0, onEnableGuided, onCancelGuided, onGuidedHome, onNormalHome }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState('edit');
  const [guidedStep, setGuidedStep] = useState(0);
  const [dateChoice, setDateChoice] = useState('');
  const [speechRevision, setSpeechRevision] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportReceipt, setReportReceipt] = useState(null);
  const [integrityStatus, setIntegrityStatus] = useState(null);
  const [integrityError, setIntegrityError] = useState('');
  const guidedWasActiveRef = useRef(false);
  const lastResetVersionRef = useRef(resetVersion);
  const integrityMessage = integrityStatus
    ? integrityStatus.integro ? 'Los registros revisados no muestran cambios detectables.' : 'La revisión encontró una diferencia entre algunos registros.'
    : integrityError ? 'No pudimos revisar los registros.' : '';

  const questionSpeech = [
    [stepQuestions[0], ...incidentTypes.map((choice, index) => `Opción ${index + 1}: ${choice.label}.`)],
    [stepQuestions[1]],
    ['¿Cuándo pasó?', 'Uno: Hoy.', 'Dos: Ayer.', 'Tres: Otro día.', 'Cuatro: No recuerdo.', 'Selecciona una opción.'],
    ['¿Cómo te contactaron?', ...channelOptions.map((choice, index) => `Opción ${index + 1}: ${choice.label}.`), 'Selecciona una opción.'],
    ['¿Perdiste dinero o te pareció sospechoso?', 'Uno: Me pareció sospechoso.', 'Dos: Creo que perdí dinero o fui afectado.', 'Selecciona una opción.'],
  ];
  useEffect(() => {
    if (!guided || !active) { guidedWasActiveRef.current = false; return; }
    const enteringGuidedTask = !guidedWasActiveRef.current;
    guidedWasActiveRef.current = true;
    if (step === 'edit') announceGuidedSequence([
      ...(enteringGuidedTask && guidedStep === 0 ? ['Elegiste contar algo que te pasó. Vamos a registrar lo ocurrido.'] : []),
      `Paso ${guidedStep + 1}.`,
      ...questionSpeech[guidedStep],
    ], { pauseMs: 40 });
    if (step === 'review') announceGuidedSequence(['Revisa el resumen y la zona antes de guardar el reporte.', summary], { pauseMs: 40 });
    if (step === 'demo' && reportReceipt) announceGuidedSequence(['Tu reporte se guardó correctamente.', integrityMessage].filter(Boolean));
    else if (step === 'demo') announceGuidedSequence(['Esta demostración no guardó el reporte.']);
  }, [active, guided, guidedStep, step, speechRevision, reportReceipt, integrityMessage]);

  useEffect(() => {
    if (lastResetVersionRef.current === resetVersion) return;
    lastResetVersionRef.current = resetVersion;
    setForm(initialForm);
    setErrors({});
    setStep('edit');
    setGuidedStep(0);
    setDateChoice('');
    setReportError('');
    setReportReceipt(null);
    setIntegrityStatus(null);
    setIntegrityError('');
  }, [resetVersion]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const review = (event) => {
    event.preventDefault();
    const next = {};
    if (!form.type) next.type = 'Elige la opción más cercana.';
    if (form.description.trim().length < 12) next.description = 'Cuéntalo con un poco más de detalle.';
    if (!form.impact) next.impact = 'Elige la opción que más se acerca.';
    setErrors(next);
    if (Object.keys(next).length === 0) setStep('review');
  };

  const saveReport = async () => {
    if (!form.upz) {
      setErrors({ upz: 'Selecciona una zona aproximada para guardar el reporte.' });
      return;
    }
    setIsSubmitting(true);
    setReportError('');
    try {
      const receipt = await reportIncident({
        modalidad_detectada: typeLabels[form.type],
        descripcion: form.description.trim(),
        fecha_aproximada: form.date || null,
        canal: form.channel || null,
        resultado: form.impact === 'afectado' ? 'posible afectación' : 'intento sospechoso',
      }, form.upz);
      setReportReceipt(receipt);
      try {
        setIntegrityStatus(await verifyIncidentIntegrity());
        setIntegrityError('');
      } catch (verificationError) {
        setIntegrityStatus(null);
        console.error('No se pudo revisar la integridad de los registros.', verificationError);
        setIntegrityError('No pudimos revisar los registros.');
      }
      setStep('demo');
    } catch (requestError) {
      console.error('No se pudo guardar el reporte.', requestError);
      setReportError('No pudimos guardar tu reporte. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const chooseDate = (choice) => {
    setDateChoice(choice);
    const values = { today: localDate(), yesterday: localDate(-1), other: '', unknown: '' };
    setForm((current) => ({ ...current, date: values[choice] }));
    const labels = { today: 'hoy', yesterday: 'ayer', other: 'otro día', unknown: 'que no recuerdas la fecha' };
    if (guided) announceGuidedSequence([`Seleccionaste ${labels[choice]}.`, ...(choice === 'other' ? ['Indica la fecha aproximada o continúa si no la recuerdas.'] : [])]);
  };

  const chooseIncidentType = (value) => {
    setForm((current) => ({ ...current, type: value }));
    setErrors((current) => ({ ...current, type: '' }));
    if (guided) {
      announceGuidedSequence([`Seleccionaste ${typeLabels[value]}.`]);
    }
  };

  const chooseChannel = (value) => {
    setForm((current) => ({ ...current, channel: value }));
    if (guided) announceGuidedSequence([`Seleccionaste ${value}.`]);
  };

  const chooseImpact = (event) => {
    const value = event.target.value;
    update('impact')(event);
    if (guided) announceGuidedSequence([`Seleccionaste ${value === 'afectado' ? 'Creo que perdí dinero o fui afectado' : 'Me pareció sospechoso'}.`]);
  };

  const advanceGuided = () => {
    setErrors({});
    if (guidedStep === 0 && !form.type) { setErrors({ type: 'Elige una opción para continuar.' }); announceGuidedSequence(['Elige una opción para continuar.']); return; }
    if (guidedStep === 1 && form.description.trim().length < 12) { setErrors({ description: 'Cuéntalo con un poco más de detalle.' }); announceGuidedSequence(['Cuéntalo con un poco más de detalle.']); return; }
    if (guidedStep === 4 && !form.impact) { setErrors({ impact: 'Elige la opción que más se acerca.' }); announceGuidedSequence(['Elige la opción que más se acerca.']); return; }
    if (guidedStep < stepQuestions.length - 1) setGuidedStep((current) => current + 1);
    else setStep('review');
  };

  const restart = () => {
    setForm(initialForm); setErrors({}); setStep('edit'); setGuidedStep(0); setDateChoice('');
    setReportError(''); setReportReceipt(null); setIntegrityStatus(null); setIntegrityError('');
  };

  const summary = `Resumen. Situación: ${typeLabels[form.type] || 'sin seleccionar'}. ${form.description}. Fecha: ${formatDate(form.date)}. Contacto por: ${form.channel || 'no especificado'}. ${form.impact === 'afectado' ? 'Crees que perdiste dinero o resultaste afectado.' : 'Te pareció sospechoso.'}`;

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 800, mb: 0.75 }}>Registrar una situación</Typography>
        <Typography color="text.secondary">Ordena lo ocurrido para pedir orientación.</Typography>
        {step === 'edit' && !guided && <Button type="button" onClick={onEnableGuided} startIcon={<HelpOutlineOutlinedIcon />} sx={{ mt: 1, minHeight: 48 }}>Ayúdame paso a paso</Button>}
      </Box>
          <Alert severity="warning">Por tu seguridad, no incluyas nombres completos, claves, códigos ni datos bancarios. Comparte solo lo necesario para contar lo ocurrido.</Alert>

      {step === 'edit' && guided && (
        <Paper component="section" aria-labelledby="incident-question" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Pregunta {guidedStep + 1} de {stepQuestions.length}</Typography>
          <LinearProgress aria-label={`Progreso, pregunta ${guidedStep + 1} de ${stepQuestions.length}`} variant="determinate" value={((guidedStep + 1) / stepQuestions.length) * 100} sx={{ mb: 2, height: 8, borderRadius: 8 }} />
          <Typography id="incident-question" component="h2" variant="h5" sx={{ fontWeight: 750 }}>{stepQuestions[guidedStep]}</Typography>
          <GuidedVoiceControls
            active={active}
            speakSequence={questionSpeech[guidedStep]}
            showDictation={guidedStep === 1}
            onTranscript={guidedStep === 1 ? (text) => setForm((current) => ({ ...current, description: text })) : undefined}
            onTranscriptFinal={guidedStep === 1 ? (text) => announceGuidedSequence(['Esto es lo que entendí. Escúchalo y comprueba que esté correcto antes de continuar.', text]) : undefined}
            fullWidth={guidedStep === 1}
          />

          {guidedStep === 0 && <Box sx={{ mt: 2 }}><ChoiceButtons label="Tipo de situación" choices={incidentTypes} value={form.type} onChange={chooseIncidentType} />{errors.type && <Typography role="alert" color="error" sx={{ mt: 1 }}>{errors.type}</Typography>}</Box>}
          {guidedStep === 1 && <TextField label="Lo que pasó" value={form.description} onChange={update('description')} multiline minRows={3} fullWidth error={Boolean(errors.description)} helperText={errors.description || 'Puedes dictarlo o escribirlo. No incluyas datos personales.'} sx={{ mt: 2 }} />}
          {guidedStep === 2 && <Box sx={{ mt: 2 }}>
            <ChoiceButtons label="Fecha aproximada" choices={[{ value: 'today', label: 'Hoy', icon: <EventOutlinedIcon /> }, { value: 'yesterday', label: 'Ayer', icon: <EventOutlinedIcon /> }, { value: 'other', label: 'Otro día', icon: <EventOutlinedIcon /> }, { value: 'unknown', label: 'No recuerdo', icon: <HelpOutlineOutlinedIcon /> }]} value={dateChoice} onChange={chooseDate} />
            {dateChoice === 'other' && <TextField label="Elige la fecha" type="date" value={form.date} onChange={update('date')} onBlur={() => { if (form.date) announceGuidedSequence([`La fecha quedó como ${formatDate(form.date)}.`]); }} InputLabelProps={{ shrink: true }} sx={{ gridColumn: '1 / -1' }} />}
          </Box>}
          {guidedStep === 3 && <Box sx={{ mt: 2 }}><ChoiceButtons label="Canal de contacto" choices={channelOptions} value={form.channel} onChange={chooseChannel} /></Box>}
          {guidedStep === 4 && <FormControl error={Boolean(errors.impact)} sx={{ mt: 2, width: '100%' }}>
            <FormLabel id="guided-impact-label">Elige una opción</FormLabel>
            <RadioGroup aria-labelledby="guided-impact-label" value={form.impact} onChange={chooseImpact}>
              <FormControlLabel value="intento" control={<Radio />} label="Me pareció sospechoso" />
              <FormControlLabel value="afectado" control={<Radio />} label="Creo que perdí dinero o fui afectado" />
            </RadioGroup>
            {errors.impact && <Typography role="alert" color="error">{errors.impact}</Typography>}
          </FormControl>}

          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
            <Button type="button" variant="outlined" onClick={() => guidedStep > 0 ? (setSpeechRevision((v) => v + 1), setGuidedStep((current) => current - 1)) : onGuidedHome?.()} sx={{ minHeight: 48 }}>
              {guidedStep > 0 ? 'Volver' : 'Inicio guiado'}
            </Button>
            <Button type="button" variant="contained" onClick={advanceGuided} sx={{ minHeight: 56, flex: 1 }}>
              {guidedStep === stepQuestions.length - 1 ? 'Revisar resumen' : 'Continuar'}
            </Button>
          </Stack>
          {guidedStep > 0 && <Button type="button" onClick={onCancelGuided} sx={{ alignSelf: 'flex-start' }}>Usar formulario convencional</Button>}
        </Paper>
      )}

      {step === 'edit' && !guided && (
        <Paper component="form" onSubmit={review} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Stack spacing={2}>
            <TextField select label="Tipo de situación" value={form.type} onChange={update('type')} error={Boolean(errors.type)} helperText={errors.type || 'Elige la opción más cercana.'}>
              <MenuItem value="mensaje">Mensaje o enlace sospechoso</MenuItem>
              <MenuItem value="suplantacion">Suplantación de una entidad o persona</MenuItem>
              <MenuItem value="llamada">Llamada sospechosa</MenuItem>
              <MenuItem value="otro">Otra situación</MenuItem>
            </TextField>
            <Box>
              <TextField id="incident-description" label="¿Qué pasó?" value={form.description} onChange={update('description')} multiline minRows={4} fullWidth error={Boolean(errors.description)} helperText={errors.description || 'Cuéntalo brevemente, sin datos sensibles.'} />
              <GuidedVoiceControls
                active={active}
                showSpeechControls={false}
                speakText="Dicta una descripción breve."
                onTranscript={(text) => { setForm((current) => ({ ...current, description: text })); setErrors((current) => ({ ...current, description: '' })); }}
                transcriptValue={form.description}
                appendTranscript
                listenLabel="Dictar descripción"
              />
            </Box>
            <TextField label="Fecha aproximada (opcional)" type="date" value={form.date} onChange={update('date')} InputLabelProps={{ shrink: true }} />
            <TextField label="Canal de contacto (opcional)" value={form.channel} onChange={update('channel')} placeholder="Por ejemplo: llamada o mensaje" />
            <FormControl error={Boolean(errors.impact)}>
              <FormLabel id="impact-label">¿Qué ocurrió?</FormLabel>
              <RadioGroup aria-labelledby="impact-label" value={form.impact} onChange={update('impact')}>
                <FormControlLabel value="intento" control={<Radio />} label="Me pareció sospechoso" />
                <FormControlLabel value="afectado" control={<Radio />} label="Creo que fui afectado" />
              </RadioGroup>
              {errors.impact && <Typography variant="caption" color="error">{errors.impact}</Typography>}
            </FormControl>
            <Button type="submit" variant="contained" startIcon={<VisibilityOutlinedIcon />} sx={{ minHeight: 56 }}>Revisar información</Button>
          </Stack>
        </Paper>
      )}

      {step === 'review' && (
        <Paper component="section" aria-labelledby="incident-review-title" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Typography id="incident-review-title" component="h2" variant="h6" sx={{ fontWeight: 750, mb: 2 }}>{guided ? 'Escucha y revisa el resumen' : 'Revisa antes de continuar'}</Typography>
          <Stack spacing={1.5}>
            <Typography><strong>Situación:</strong> {typeLabels[form.type]}</Typography>
            <Typography><strong>Descripción:</strong> {form.description}</Typography>
            <Typography><strong>Fecha:</strong> {formatDate(form.date)}</Typography>
            <Typography><strong>Contacto:</strong> {form.channel || 'No especificado'}</Typography>
            <Typography><strong>Resultado:</strong> {form.impact === 'afectado' ? 'Crees que resultaste afectado' : 'Te pareció sospechoso'}</Typography>
          </Stack>
          <TextField
            select
            required
            label="Zona aproximada"
            value={form.upz || ''}
            onChange={(event) => { setForm((current) => ({ ...current, upz: event.target.value })); setErrors((current) => ({ ...current, upz: '' })); }}
            error={Boolean(errors.upz)}
            helperText={errors.upz || 'Elige una zona cercana; no compartas una dirección.'}
            fullWidth
            sx={{ mt: 2 }}
          >
            {upzOptions.map((upz) => <MenuItem key={upz} value={upz}>{upz}</MenuItem>)}
          </TextField>
          {guided && <GuidedVoiceControls active={active} speakText={summary} showDictation={false} />}
          {reportError && <Alert severity="error" role="alert" sx={{ my: 2 }}>{reportError}</Alert>}
          <Alert severity="info" sx={{ my: 2 }}>Al guardar, te confirmaremos si recibimos el reporte. Evita incluir nombres u otros datos personales.</Alert>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="outlined" disabled={isSubmitting} startIcon={<EditNoteOutlinedIcon />} onClick={() => { setSpeechRevision((v) => v + 1); setStep('edit'); setGuidedStep(stepQuestions.length - 1); }}>Volver y corregir</Button>
            <Button variant="contained" disabled={isSubmitting} startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <FactCheckOutlinedIcon />} onClick={saveReport}>{isSubmitting ? 'Guardando el reporte…' : 'Confirmar y guardar reporte'}</Button>
          </Stack>
          {guided && <Button onClick={onCancelGuided} sx={{ mt: 1 }}>Cambiar al modo normal</Button>}
        </Paper>
      )}

      {step === 'demo' && (
        <Paper component="section" role="status" aria-labelledby="incident-demo-title" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          {reportReceipt ? (
            <>
              <Alert severity="success" sx={{ mb: 2 }}>Tu reporte se guardó correctamente.</Alert>
              <Typography id="incident-demo-title" component="h2" variant="h6" sx={{ fontWeight: 750 }}>Gracias por contar lo ocurrido.</Typography>
              {integrityStatus && <Alert severity={integrityStatus.integro ? 'success' : 'warning'} sx={{ mt: 2 }}>
                {integrityStatus.integro
                  ? 'Los registros revisados no muestran cambios detectables.'
                  : 'La revisión encontró una diferencia entre algunos registros.'}
              </Alert>}
              {integrityError && <Alert severity="warning" sx={{ mt: 2 }}>El reporte se guardó, pero no pudimos revisar los registros.</Alert>}
            </>
          ) : (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>Esta demostración no guardó el reporte. La información no se envió.</Alert>
              <Typography id="incident-demo-title" component="h2" variant="h6" sx={{ fontWeight: 750 }}>La información solo aparece en esta pantalla.</Typography>
            </>
          )}
          <Button type="button" sx={{ mt: 2 }} variant="outlined" startIcon={<EditNoteOutlinedIcon />} onClick={() => { setSpeechRevision((v) => v + 1); setStep('edit'); }}>Volver a editar</Button>
          <Button type="button" sx={{ mt: 2, ml: { sm: 1 } }} onClick={() => guided ? onGuidedHome?.() : onNormalHome?.()}>
            {guided ? 'Volver al inicio guiado' : 'Volver al inicio'}
          </Button>
        </Paper>
      ) }
    </Box>
  );
}
