import React from 'react';
import { Typography } from '@mui/material';
import CitizenResultSummary from './CitizenResultSummary';

export function getReceiptPresentation(result) {
  const verdict = typeof result?.es_autentico === 'string' ? result.es_autentico.trim().toUpperCase() : '';
  const signals = Array.isArray(result?.senales_detectadas)
    ? result.senales_detectadas.filter((signal) => typeof signal === 'string' && signal.trim())
    : [];
  const fallbackDescription = [result?.explicacion_ciudadana, ...signals]
    .filter((part) => typeof part === 'string')
    .join(' ')
    .toLocaleLowerCase('es');
  const couldNotAnalyze = /no fue posible analizar|no pudimos verificar|no se pudo analizar/.test(fallbackDescription);

  if (couldNotAnalyze) {
    return {
      title: 'No pudimos comprobar este comprobante',
      explanation: result.explicacion_ciudadana,
      action: 'Revisa el pago directamente en tu cuenta bancaria o inténtalo de nuevo.',
      risk: '',
      neutral: true,
      signals: [],
    };
  }

  if (verdict === 'AUTENTICO') {
    return {
      title: 'El aspecto del comprobante parece compatible',
      explanation: 'La revisión visual encontró elementos compatibles. Esto no confirma que el dinero haya llegado.',
      action: 'Confirma el pago en tu cuenta bancaria antes de entregar el producto.',
      risk: 'MEDIO',
      neutral: false,
      signals,
    };
  }

  if ((verdict === 'SOSPECHOSO' || verdict === 'FALSO') && signals.length > 0) {
    const risk = typeof result.nivel_riesgo === 'string' ? result.nivel_riesgo.trim().toUpperCase() : '';
    return {
      title: 'El análisis encontró señales que requieren cuidado',
      explanation: result.explicacion_ciudadana,
      action: 'Revisa el pago en tu banco antes de entregar el producto.',
      risk: risk === 'ALTO' ? 'ALTO' : 'MEDIO',
      neutral: false,
      signals,
    };
  }

  return {
    title: 'No pudimos comprobar este comprobante',
    explanation: result?.explicacion_ciudadana,
    action: 'Inténtalo de nuevo o revisa el pago directamente en tu cuenta bancaria.',
    risk: '',
    neutral: true,
    signals: [],
  };
}

export function getReceiptSpeechText(result) {
  const presentation = getReceiptPresentation(result);
  const recommendations = Array.isArray(result?.recomendaciones) ? result.recomendaciones : [];
  return [presentation.title, presentation.explanation, ...presentation.signals, ...recommendations, ...(recommendations.length ? [] : [presentation.action])]
    .filter((part) => typeof part === 'string' && part.trim())
    .join('. ');
}

export default function ReceiptAnalysisResult({ result }) {
  const presentation = getReceiptPresentation(result);
  const recommendations = Array.isArray(result.recomendaciones) ? result.recomendaciones : [];
  return <CitizenResultSummary
    title={presentation.title}
    explanation={presentation.explanation}
    action={recommendations.length ? '' : presentation.action}
    risk={presentation.risk}
    neutral={presentation.neutral}
    cautionMessage="La imagen no confirma que el pago se haya recibido. Comprueba la transacción en tu cuenta bancaria."
    signals={presentation.signals}
    recommendations={recommendations}
  >
    {result.entidad_detectada && result.entidad_detectada.toLowerCase() !== 'no identificada' && (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Entidad que aparece en la imagen: {result.entidad_detectada}</Typography>
    )}
  </CitizenResultSummary>;
}
