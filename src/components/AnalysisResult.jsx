import React from 'react';
import { Alert, Typography } from '@mui/material';
import CitizenResultSummary from './CitizenResultSummary';

const COPY_BY_RISK = {
  ALTO: { title: 'Cuidado: este mensaje tiene señales de posible engaño', action: 'No abras enlaces ni compartas claves o códigos.' },
  MEDIO: { title: 'Ten cuidado: no pudimos confirmar este mensaje', action: 'Consulta directamente con la entidad por un canal oficial.' },
  BAJO: { title: 'No encontramos señales claras de engaño', action: 'Si tienes dudas, confirma por un canal oficial.' },
};

export function getMessageSpeechText(result) {
  const risk = typeof result?.nivel_riesgo === 'string' ? result.nivel_riesgo.trim().toUpperCase() : '';
  const copy = COPY_BY_RISK[risk] || { title: 'No pudimos interpretar el resultado', action: '' };
  const recommendations = Array.isArray(result?.recomendaciones) ? result.recomendaciones : [];
  return [copy.title, result?.explicacion_ciudadana, ...recommendations, ...(recommendations.length ? [] : [copy.action])]
    .filter((part) => typeof part === 'string' && part.trim())
    .join('. ');
}

export default function AnalysisResult({ result }) {
  const risk = typeof result.nivel_riesgo === 'string' ? result.nivel_riesgo.trim().toUpperCase() : '';
  const light = typeof result.color_semaforo === 'string' ? result.color_semaforo.trim().toUpperCase() : '';
  const expectedLight = { ALTO: 'ROJO', MEDIO: 'AMARILLO', BAJO: 'VERDE' };
  const coherent = expectedLight[risk] === light;
  const copy = COPY_BY_RISK[risk] || { title: 'No pudimos interpretar el resultado', action: 'Inténtalo de nuevo o busca orientación por un canal oficial.' };
  const recommendations = Array.isArray(result.recomendaciones) ? result.recomendaciones : [];
  return <CitizenResultSummary
    title={copy.title}
    explanation={result.explicacion_ciudadana}
    action={recommendations.length ? '' : copy.action}
    risk={coherent ? risk : ''}
    neutral={!coherent}
    cautionMessage="Que no aparezcan señales claras no demuestra que el mensaje sea auténtico. Si tienes dudas, consulta por un canal oficial."
    recommendations={recommendations}
  >
    {!coherent && <Alert severity="info" sx={{ mt: 2 }}>No pudimos interpretar este resultado con claridad. Inténtalo de nuevo.</Alert>}
    {typeof result.modalidad_detectada === 'string' && result.modalidad_detectada.trim() && (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>El mensaje parece corresponder a: {result.modalidad_detectada}</Typography>
    )}
  </CitizenResultSummary>;
}
