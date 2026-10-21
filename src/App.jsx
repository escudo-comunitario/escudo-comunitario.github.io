import React, { useEffect, useRef, useState } from 'react';
import {
  AppBar, Box, BottomNavigation, BottomNavigationAction, Button, Container,
  Divider, Paper, Toolbar, Typography,
} from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import HomeModule from './components/HomeModule';
import AnalysisModule from './components/AnalysisModule';
import IncidentModule from './components/IncidentModule';
import TrustModule from './components/TrustModule';
import CommunityStatsModule from './components/CommunityStatsModule';
import ModeSelectionScreen from './components/ModeSelectionScreen';
import GuidedHome, { guidedHomeSequence } from './components/GuidedHome';
import { announceGuided, announceGuidedSequence, stopGuidedSpeech } from './services/guidedSpeech';

const pages = [
  { id: 'home', label: 'Inicio', shortLabel: 'Inicio', icon: <HomeOutlinedIcon /> },
  { id: 'analysis', label: 'Analizar mensaje', shortLabel: 'Analizar', icon: <SearchOutlinedIcon /> },
  { id: 'incident', label: 'Registro de situación', shortLabel: 'Incidente', icon: <ReportProblemOutlinedIcon /> },
  { id: 'trust', label: 'Red de confianza', shortLabel: 'Confianza', icon: <PeopleAltOutlinedIcon /> },
  { id: 'stats', label: 'Estadísticas comunitarias', shortLabel: 'Datos', icon: <BarChartOutlinedIcon /> },
];

function PageNavigation({ page, onNavigate }) {
  return (
    <Paper component="nav" aria-label="Secciones principales" variant="outlined" className="desktop-navigation" sx={{ width: 244, flexShrink: 0, p: 1.5, borderRadius: 0, borderTop: 0, borderBottom: 0 }}>
      <Typography variant="overline" color="text.secondary" sx={{ pl: 1.5, fontWeight: 700 }}>Menú</Typography>
      <Box sx={{ display: 'grid', gap: 0.5, mt: 1 }}>
        {pages.map((item) => (
          <Button
            key={item.id} onClick={() => onNavigate(item.id)}
            variant={page === item.id ? 'contained' : 'text'}
            color={page === item.id ? 'primary' : 'inherit'}
            aria-current={page === item.id ? 'page' : undefined}
            startIcon={item.icon} sx={{ justifyContent: 'flex-start', minHeight: 48, px: 1.5 }}
          >
            {item.label}
          </Button>
        ))}
      </Box>
      <Divider sx={{ my: 2 }} />
      <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, lineHeight: 1.6 }}>
        Una herramienta comunitaria para revisar con calma y buscar orientación.
      </Typography>
    </Paper>
  );
}

export default function App() {
  const [experienceMode, setExperienceMode] = useState(null);
  const [page, setPage] = useState('home');
  const [analysisEntry, setAnalysisEntry] = useState({ mode: 'text', version: 0 });
  const [guided, setGuided] = useState(false);
  const [guidedHomeVisit, setGuidedHomeVisit] = useState(0);
  const [taskResetVersions, setTaskResetVersions] = useState({ analysis: 0, incident: 0, trust: 0 });
  const guidedHomeLeadRef = useRef('');
  const guidedHomeGreetingRef = useRef(true);

  useEffect(() => {
    if (!guided || experienceMode !== 'guided' || page !== 'home' || guidedHomeVisit === 0) return;
    const lead = guidedHomeLeadRef.current;
    guidedHomeLeadRef.current = '';
    announceGuidedSequence([...(lead ? [lead] : []), ...(guidedHomeGreetingRef.current ? [guidedHomeSequence[0]] : []), ...guidedHomeSequence.slice(1)], { pauseMs: 80 });
    guidedHomeGreetingRef.current = false;
  }, [experienceMode, guided, page, guidedHomeVisit]);

  useEffect(() => () => stopGuidedSpeech(), []);

  const startGuidedHome = (lead = '', includeGreeting = true) => {
    stopGuidedSpeech();
    if (experienceMode === 'normal' && page !== 'home') resetAbandonedTask(page);
    guidedHomeLeadRef.current = lead;
    guidedHomeGreetingRef.current = includeGreeting;
    setExperienceMode('guided');
    setPage('home');
    setGuided(true);
    setGuidedHomeVisit((visit) => visit + 1);
  };

  const resetAbandonedTask = (task = page) => {
    if (!['analysis', 'incident', 'trust'].includes(task)) return;
    setTaskResetVersions((current) => ({ ...current, [task]: current[task] + 1 }));
  };

  const returnToGuidedHome = () => {
    resetAbandonedTask();
    startGuidedHome('Volviste al inicio. Elige una tarea.', false);
  };

  const returnToModeMenu = () => {
    stopGuidedSpeech();
    resetAbandonedTask();
    setGuided(false);
    setPage('home');
    setExperienceMode(null);
  };

  const switchToNormal = (message = 'Modo normal. Usa los menús y formularios habituales.', { returnHome = true, discardTask = true } = {}) => {
    stopGuidedSpeech();
    if (discardTask) resetAbandonedTask();
    setGuided(false);
    setExperienceMode('normal');
    if (returnHome) setPage('home');
    announceGuided(message);
  };

  const navigate = (nextPage, mode = 'text', startGuided = false) => {
    stopGuidedSpeech();
    setGuided(startGuided || experienceMode === 'guided');
    if (nextPage === 'analysis') {
      setAnalysisEntry((current) => ({ mode, version: current.version + 1 }));
    }
    setPage(nextPage);
  };

  const enterMode = (mode) => {
    stopGuidedSpeech();
    if (mode === 'guided') {
      startGuidedHome();
      return;
    }
    setExperienceMode('normal');
    setPage('home');
    setGuided(false);
  };

  const selectGuidedTask = (task) => {
    stopGuidedSpeech();
    setGuided(true);
    if (task === 'analysis') setAnalysisEntry((current) => ({ mode: 'text', version: current.version + 1 }));
    setPage(task);
  };

  if (!experienceMode) return <ModeSelectionScreen onContinue={enterMode} />;

  return (
    <Box className="app-shell">
      <AppBar position="static" elevation={0}>
        <Toolbar className="app-toolbar">
          <ShieldOutlinedIcon sx={{ fontSize: 34 }} aria-hidden="true" />
          <Box>
            <Typography component="div" variant="h6" sx={{ fontWeight: 750, lineHeight: 1.2 }}>Escudo Comunitario</Typography>
            <Typography variant="caption" sx={{ opacity: 0.94 }}>Prevención comunitaria</Typography>
          </Box>
          <Box className="app-mode-actions" sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            {guided ? (
              <>
                {page !== 'home' && <Button color="inherit" onClick={returnToGuidedHome} sx={{ minHeight: 48 }}>Inicio guiado</Button>}
                <Button color="inherit" onClick={() => switchToNormal()} sx={{ minHeight: 48 }}>Modo normal</Button>
              </>
            ) : (
              <Button color="inherit" onClick={() => startGuidedHome()} sx={{ minHeight: 48 }}>Modo guiado</Button>
            )}
            <Button color="inherit" onClick={returnToModeMenu} sx={{ minHeight: 48 }}>Volver al menú</Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box className="app-content">
        {!guided && <PageNavigation page={page} onNavigate={navigate} />}
        <Container component="main" maxWidth="md" className="main-content">
          {page === 'home' && (guided
            ? <GuidedHome onSelectTask={selectGuidedTask} onSwitchToNormal={() => switchToNormal()} onOpenStats={() => navigate('stats')} />
            : <HomeModule onNavigate={navigate} onOpenGuided={() => startGuidedHome()} />)}
          <Box sx={{ display: page === 'analysis' ? 'block' : 'none' }}><AnalysisModule active={page === 'analysis'} guided={guided} resetVersion={taskResetVersions.analysis} onEnableGuided={() => setGuided(true)} onCancelGuided={() => switchToNormal('Modo normal. Puedes revisar el mensaje en el formulario habitual.', { returnHome: false, discardTask: false })} onGuidedHome={returnToGuidedHome} entryMode={analysisEntry.mode} entryVersion={analysisEntry.version} onRequestHelp={() => navigate('trust', 'text', guided)} /></Box>
          <Box sx={{ display: page === 'incident' ? 'block' : 'none' }}><IncidentModule active={page === 'incident'} guided={guided} resetVersion={taskResetVersions.incident} onEnableGuided={() => setGuided(true)} onCancelGuided={() => switchToNormal('Modo normal. Puedes continuar en el formulario habitual.', { returnHome: false, discardTask: false })} onGuidedHome={returnToGuidedHome} /></Box>
          <Box sx={{ display: page === 'trust' ? 'block' : 'none' }}><TrustModule active={page === 'trust'} guided={guided} resetVersion={taskResetVersions.trust} onEnableGuided={() => setGuided(true)} onCancelGuided={() => switchToNormal('Modo normal. Puedes continuar en el formulario habitual.', { returnHome: false, discardTask: false })} onGuidedHome={returnToGuidedHome} /></Box>
          <Box sx={{ display: page === 'stats' ? 'block' : 'none' }}><CommunityStatsModule active={page === 'stats'} guided={guided} onEnableGuided={() => setGuided(true)} onCancelGuided={() => switchToNormal()} onGuidedHome={returnToGuidedHome} onAnalyze={() => navigate('analysis')} /></Box>
        </Container>
      </Box>

      {!guided && <BottomNavigation
        className="mobile-navigation" showLabels value={page} onChange={(_event, nextPage) => navigate(nextPage)}
        aria-label="Secciones principales"
      >
        {pages.map((item) => <BottomNavigationAction key={item.id} value={item.id} label={item.shortLabel} icon={item.icon} />)}
      </BottomNavigation>}
    </Box>
  );
}
