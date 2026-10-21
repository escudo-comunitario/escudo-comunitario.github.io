import React from 'react';
import { Alert, Box, Paper, Typography } from '@mui/material';

export default function AnalysisResult({ result }) {
  const risk = result.nivel_riesgo.trim().toUpperCase();
  const light = result.color_semaforo.trim().toUpperCase();
  const documentedHighRisk = risk === 'ALTO' && light === 'ROJO';
  const statusStyle = documentedHighRisk
    ? { bg: 'error.light', fg: 'error.main', label: 'El servicio informa ALTO · ROJO' }
    : { bg: 'grey.100', fg: 'text.primary', label: `Nivel y semáforo informados: ${result.nivel_riesgo} · ${result.color_semaforo}` };
  const recommendations = Array.isArray(result.recomendaciones) ? result.recomendaciones : [];

  return (
    <Paper component="section" aria-labelledby="analysis-result-title" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
      <Box sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: statusStyle.bg, color: statusStyle.fg }}>
        <Typography id="analysis-result-title" component="h2" variant="h5" sx={{ fontWeight: 750 }}>
          Resultado recibido del servicio
        </Typography>
        <Typography sx={{ mt: 0.5, fontWeight: 700 }}>{statusStyle.label}</Typography>
        <Typography>Nivel de riesgo informado: {result.nivel_riesgo}</Typography>
      </Box>
      {!documentedHighRisk && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          La combinación de riesgo y semáforo no está confirmada en el contrato disponible. Revise con cautela; la aplicación no la clasificará como segura.
        </Alert>
      )}
      <Alert severity="info" sx={{ mb: 2 }}>
        La confianza no se muestra: el campo y su formato aún deben confirmarse con el equipo.
      </Alert>
      <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>Explicación</Typography>
      <Typography sx={{ mb: 2 }}>{result.explicacion_ciudadana}</Typography>
      {typeof result.modalidad_detectada === 'string' && result.modalidad_detectada.trim() && (
        <Typography sx={{ mb: 2 }}><strong>Modalidad informada:</strong> {result.modalidad_detectada}</Typography>
      )}
      {recommendations.length > 0 ? (
        <>
          <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>Recomendaciones</Typography>
          <Box component="ul" sx={{ pl: 3, mt: 0.5 }}>
            {recommendations.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
          </Box>
        </>
      ) : (
        <Typography color="text.secondary">El servicio no entregó recomendaciones para esta respuesta.</Typography>
      )}
      <Typography component="p" variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, lineHeight: 1.6 }}>
        El análisis emitido por la Inteligencia Artificial es preventivo y orientativo; no reemplaza una denuncia penal formal ni un dictamen pericial oficial emitido por las autoridades judiciales competentes.
      </Typography>
    </Paper>
  );
}
