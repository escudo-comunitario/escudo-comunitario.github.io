import React, { useEffect } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GuidedVoiceControls from './GuidedVoiceControls';
import { announceGuidedSequence } from '../services/guidedSpeech';

export default function CommunityStatsModule({ active = true, guided = false, onEnableGuided, onCancelGuided, onGuidedHome, onAnalyze }) {
  const explanation = 'Aún no hay datos disponibles. Los datos aparecerán aquí cuando exista una fuente confiable. Esta pantalla no registra incidentes.';
  useEffect(() => {
    if (guided && active) announceGuidedSequence(['Elegiste ver información comunitaria.', 'Aún no hay datos disponibles. Puedes volver al inicio.'], { pauseMs: 80 });
  }, [active, guided]);

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Estadísticas comunitarias</Typography>
        <Typography color="text.secondary">Información agregada para orientar acciones de prevención comunitaria.</Typography>
        {!guided && <Button type="button" onClick={onEnableGuided} startIcon={<HelpOutlineOutlinedIcon />} sx={{ mt: 0.5, minHeight: 48 }}>Ayúdame paso a paso</Button>}
      </Box>
      {guided && <GuidedVoiceControls speakText={explanation} speakLabel="Escuchar explicación" showDictation={false} />}
      <Paper component="section" aria-labelledby="stats-empty-title" role="status" variant="outlined" sx={{ p: { xs: 3, sm: 5 }, borderRadius: 3, textAlign: 'center' }}>
        <BarChartOutlinedIcon color="primary" sx={{ fontSize: 44 }} aria-hidden="true" />
        <Typography id="stats-empty-title" component="h2" variant="h6" sx={{ fontWeight: 750, mt: 1 }}>Aún no hay datos disponibles</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', mt: 1 }}>{explanation}</Typography>
        <Button sx={{ mt: 2 }} variant="outlined" startIcon={<InfoOutlinedIcon />} onClick={onAnalyze}>Volver a prevención</Button>
        {guided && <Button sx={{ mt: 1, minHeight: 48 }} onClick={onGuidedHome}>Volver al inicio guiado</Button>}
      </Paper>
    </Box>
  );
}
