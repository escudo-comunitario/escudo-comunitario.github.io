import React from 'react';
import { Alert, Box, Paper, Typography } from '@mui/material';

const RISK_STYLE = {
  ALTO: { severity: 'error', color: '#8e0000', background: '#fdecea', border: '#b3261e', label: 'Riesgo alto', icon: '!' },
  MEDIO: { severity: 'warning', color: '#5f4300', background: '#fff4cc', border: '#8a6100', label: 'Precaución', icon: '⚠' },
  BAJO: { severity: 'success', color: '#075b40', background: '#e4f3e9', border: '#137333', label: 'Riesgo bajo', icon: '✓' },
};

export default function CitizenResultSummary({
  title,
  explanation,
  action,
  risk,
  cautionMessage = 'Este análisis orienta, pero no confirma el resultado.',
  signals = [],
  recommendations = [],
  neutral = false,
  children,
}) {
  const style = neutral
    ? { color: '#3c4043', background: '#f1f3f4', border: '#5f6368', label: 'No concluyente', icon: 'i' }
    : RISK_STYLE[risk];

  return (
    <Paper component="section" aria-labelledby="citizen-result-title" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, borderColor: style?.border || 'divider' }}>
      <Box
        role="status"
        aria-live="polite"
        sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: style?.background || 'grey.100', color: style?.color || 'text.primary', borderLeft: 5, borderColor: style?.border || '#5f6368' }}
      >
        <Typography id="citizen-result-title" component="h2" variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800 }}>
          {style?.icon && <Box component="span" aria-hidden="true" sx={{ display: 'inline-grid', placeItems: 'center', width: 32, height: 32, border: '2px solid currentColor', borderRadius: '50%', fontSize: '1.15rem', lineHeight: 1, flexShrink: 0 }}>{style.icon}</Box>}
          {title}
        </Typography>
        {style && <Typography sx={{ mt: 0.5, fontWeight: 700 }}>{style.label}</Typography>}
      </Box>

      {(
        <Alert severity={neutral ? 'info' : 'warning'} sx={{ mb: 2 }}>
          {neutral
            ? 'No fue posible comprobar el resultado con la información recibida. Inténtalo de nuevo o verifica directamente con la entidad.'
            : cautionMessage}
        </Alert>
      )}

      {explanation && <>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>¿Por qué te mostramos este resultado?</Typography>
        <Typography sx={{ mt: 0.5 }}>{explanation}</Typography>
      </>}

      {signals.length > 0 && <>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>¿Por qué te mostramos este resultado?</Typography>
        <Box component="ul" sx={{ pl: 3, mt: 0.5 }}>
          {signals.map((signal, index) => <li key={`${index}-${signal}`}>{signal}</li>)}
        </Box>
      </>}

      {recommendations.length > 0 && <>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700, mt: 2 }}>¿Qué puedes hacer?</Typography>
        <Box component="ul" sx={{ pl: 3, mt: 0.5 }}>
          {recommendations.map((recommendation, index) => <li key={`${index}-${recommendation}`}>{recommendation}</li>)}
        </Box>
      </>}

      {action && <Alert severity={style?.severity || 'info'} sx={{ mt: 2 }}><strong>Recomendación principal:</strong> {action}</Alert>}
      {children}
    </Paper>
  );
}
