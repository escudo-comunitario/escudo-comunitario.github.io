import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GuidedVoiceControls from './GuidedVoiceControls';
import { announceGuidedSequence } from '../services/guidedSpeech';
import { getCommunityStats } from '../services/api';

function CountList({ title, values }) {
  const entries = Object.entries(values || {});
  return (
    <Box component="section" aria-label={title}>
      <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
      {entries.length ? (
        <Stack component="ul" spacing={0.5} sx={{ mt: 0.5, mb: 0, pl: 3 }}>
          {entries.map(([label, count]) => <li key={label}><Typography component="span">{label}: {count}</Typography></li>)}
        </Stack>
      ) : <Typography color="text.secondary">Aún no hay registros.</Typography>}
    </Box>
  );
}

export default function CommunityStatsModule({ active = true, guided = false, onEnableGuided, onCancelGuided, onGuidedHome, onAnalyze }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const explanation = error || (loading
    ? 'Cargando los registros comunitarios.'
    : stats
      ? 'Conteos recibidos del backend para esta instancia.'
      : 'Aún no hay datos disponibles.');

  useEffect(() => {
    if (!active) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getCommunityStats({ signal: controller.signal })
      .then(setStats)
      .catch((requestError) => {
        if (requestError?.name !== 'AbortError') setError(requestError?.message || 'No se pudieron cargar las estadísticas.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [active, refreshVersion]);

  useEffect(() => {
    if (guided && active) announceGuidedSequence(['Elegiste ver información comunitaria.', explanation], { pauseMs: 80 });
  }, [active, guided, explanation]);

  const historicalEntries = Object.entries(stats?.historico_bosa || {});

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Estadísticas comunitarias</Typography>
        <Typography color="text.secondary">Información agregada para orientar acciones de prevención comunitaria.</Typography>
        {!guided && <Button type="button" onClick={onEnableGuided} startIcon={<HelpOutlineOutlinedIcon />} sx={{ mt: 0.5, minHeight: 48 }}>Ayúdame paso a paso</Button>}
      </Box>
      {guided && <GuidedVoiceControls speakText={explanation} speakLabel="Escuchar explicación" showDictation={false} />}
      <Paper component="section" aria-labelledby="stats-title" aria-busy={loading} variant="outlined" sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
        <BarChartOutlinedIcon color="primary" sx={{ fontSize: 44 }} aria-hidden="true" />
        <Typography id="stats-title" component="h2" variant="h6" sx={{ fontWeight: 750, mt: 1 }}>Registros del backend</Typography>
        {loading && <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2 }}><CircularProgress size={22} /><Typography>Cargando estadísticas…</Typography></Box>}
        {error && <Alert severity="error" role="alert" sx={{ my: 2 }}>{error}</Alert>}
        {stats && !error && (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <CountList title="Por modalidad" values={stats.por_modalidad} />
            <CountList title="Por UPZ" values={stats.por_upz} />
            <Alert severity="warning">
              Referencia histórica local (datos de ejemplo, no consulta en vivo): {historicalEntries.length
                ? historicalEntries.map(([upz, count]) => `${upz}: ${count}`).join(' · ')
                : 'sin datos'}.
            </Alert>
          </Stack>
        )}
        {!loading && !error && !stats && <Typography role="status" color="text.secondary" sx={{ mt: 1 }}>Aún no hay registros disponibles.</Typography>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
          <Button type="button" variant="outlined" startIcon={<InfoOutlinedIcon />} onClick={() => setRefreshVersion((version) => version + 1)} disabled={loading}>Actualizar</Button>
          <Button type="button" variant="outlined" onClick={onAnalyze}>Volver a prevención</Button>
          {guided && <Button type="button" onClick={onGuidedHome}>Volver al inicio guiado</Button>}
        </Stack>
      </Paper>
    </Box>
  );
}
