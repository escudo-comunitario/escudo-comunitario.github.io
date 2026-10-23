import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import GuidedVoiceControls from './GuidedVoiceControls';
import { announceGuidedSequence } from '../services/guidedSpeech';
import { getCommunityStats } from '../services/api';

function IncidentBars({ values }) {
  const entries = Object.entries(values || {}).filter(([, count]) => Number.isFinite(count) && count >= 0);
  const maximum = Math.max(0, ...entries.map(([, count]) => count));
  if (!entries.length || maximum === 0) {
    return <Typography color="text.secondary">Todavía hay pocos reportes para mostrar una gráfica significativa. Si viviste o conoces una situación sospechosa, puedes compartirla.</Typography>;
  }

  return (
    <Stack component="ul" aria-label="Cantidad de reportes por tipo de situación" spacing={1.5} sx={{ p: 0, m: 0, listStyle: 'none' }}>
      {entries.map(([label, count]) => (
        <Box component="li" key={label} sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', sm: 'minmax(150px, 0.8fr) minmax(100px, 1fr) auto' }, alignItems: 'center', gap: 1 }}>
          <Typography sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' }, overflowWrap: 'anywhere' }}>{label}</Typography>
          <Box role="img" aria-label={`${count} reportes`} sx={{ height: 18, borderRadius: 9, bgcolor: 'action.hover', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${Math.max(4, (count / maximum) * 100)}%`, bgcolor: 'primary.main', borderRadius: 9 }} />
          </Box>
          <Typography component="strong" aria-label={`${count} reportes`} sx={{ minWidth: 30, textAlign: 'right', fontWeight: 800 }}>{count}</Typography>
        </Box>
      ))}
    </Stack>
  );
}

export default function CommunityStatsModule({ active = true, guided = false, onEnableGuided, onGuidedHome, onAnalyze, onReport }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const entries = useMemo(() => Object.entries(stats?.por_modalidad || {}).filter(([, count]) => Number.isFinite(count) && count >= 0), [stats]);
  const explanation = error || (loading
    ? 'Estamos cargando la información de la comunidad.'
    : entries.length
      ? 'Estas cifras reúnen registros de la aplicación, incluidos análisis y reportes. No representan todos los casos de Bosa.'
      : 'Todavía hay pocos reportes para mostrar una gráfica significativa.');

  useEffect(() => {
    if (!active) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getCommunityStats({ signal: controller.signal })
      .then(setStats)
      .catch((requestError) => {
        if (requestError?.name !== 'AbortError') console.error('No se pudo cargar la información comunitaria.', requestError);
        setError('No pudimos cargar la información de la comunidad. Inténtalo de nuevo.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [active, refreshVersion]);

  useEffect(() => {
    if (guided && active) announceGuidedSequence(['Elegiste ver Bosa se protege.', explanation], { pauseMs: 80 });
  }, [active, guided, explanation]);

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Bosa se protege</Typography>
        <Typography color="text.secondary">Conocer los engaños nos ayuda a prevenirlos. Aprende a reconocerlos y ayuda a cuidar a nuestra comunidad.</Typography>
        {!guided && <Button type="button" onClick={onEnableGuided} startIcon={<HelpOutlineOutlinedIcon />} sx={{ mt: 0.5, minHeight: 48 }}>Ayúdame paso a paso</Button>}
      </Box>
      {guided && <GuidedVoiceControls speakText={explanation} speakLabel="Escuchar explicación" showDictation={false} />}
      <Paper component="section" aria-labelledby="stats-title" aria-busy={loading} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <BarChartOutlinedIcon color="primary" aria-hidden="true" />
          <Typography id="stats-title" component="h2" variant="h6" sx={{ fontWeight: 750 }}>Situaciones registradas</Typography>
        </Stack>
        {loading && <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2 }}><CircularProgress size={22} /><Typography>Cargando información…</Typography></Box>}
        {error && <Alert severity="error" role="alert" sx={{ my: 2 }}>{error}</Alert>}
        {stats && !error && !loading && (
          <Box sx={{ mt: 2 }}>
            <IncidentBars values={stats.por_modalidad} />
            {entries.length > 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>El servicio agrega análisis y reportes registrados en la aplicación. No es una medición de todos los casos de Bosa.</Typography>}
          </Box>
        )}
        {!loading && !error && !stats && <Typography role="status" color="text.secondary" sx={{ mt: 1 }}>Aún no hay datos disponibles.</Typography>}
      </Paper>
      <Paper component="aside" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: 'action.hover' }}>
        <Typography component="h2" variant="h6" sx={{ fontWeight: 750 }}>Consejo para cuidar tu dinero</Typography>
        <Typography sx={{ mt: 1 }}>Antes de entregar un producto, revisa en tu propia aplicación bancaria que el dinero haya llegado. Una captura de pantalla no confirma el pago.</Typography>
      </Paper>
      <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
        <Typography component="h2" variant="h6" sx={{ fontWeight: 750 }}>Ayudemos a prevenir otros engaños</Typography>
        <Typography sx={{ mt: 1 }}>Compartir una experiencia puede ayudar a otras personas a estar atentas.</Typography>
        <Button type="button" variant="contained" startIcon={<ReportProblemOutlinedIcon />} onClick={onReport} sx={{ mt: 2, minHeight: 48 }}>Contar algo que me pasó</Button>
      </Paper>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button type="button" variant="outlined" onClick={() => setRefreshVersion((version) => version + 1)} disabled={loading}>Actualizar información</Button>
        <Button type="button" variant="outlined" onClick={onAnalyze}>Volver a prevención</Button>
        {guided && <Button type="button" onClick={onGuidedHome}>Volver al inicio guiado</Button>}
      </Stack>
    </Box>
  );
}
