import React, { useSyncExternalStore, useState } from 'react';
import { Box, Button, Card, Chip, Container, FormControlLabel, Radio, RadioGroup, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HearingOutlinedIcon from '@mui/icons-material/HearingOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PhoneAndroidOutlinedIcon from '@mui/icons-material/PhoneAndroidOutlined';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';
import { announceGuided, getGuidedSpeechSnapshot, stopGuidedSpeech, subscribeGuidedSpeech } from '../services/guidedSpeech';
import InstallAppButton from './InstallAppButton';
import BackendStatusIndicator from './BackendStatusIndicator';

const modes = {
  guided: {
    title: 'Modo guiado',
    description: 'Te acompañamos paso a paso. Puedes escuchar, hablar o tocar botones.',
    explanation: 'Modo guiado. Te acompañamos paso a paso. Puedes escuchar, hablar o tocar botones.',
    icon: <GroupsOutlinedIcon sx={{ fontSize: 38 }} />,
  },
  normal: {
    title: 'Modo normal',
    description: 'Usa los menús y formularios habituales de la aplicación.',
    explanation: 'Modo normal. Usa los menús y formularios habituales.',
    icon: <PhoneAndroidOutlinedIcon sx={{ fontSize: 38 }} />,
  },
};

export default function ModeSelectionScreen({ onContinue, backendStatus = 'connecting' }) {
  const [selectedMode, setSelectedMode] = useState('');
  const speech = useSyncExternalStore(subscribeGuidedSpeech, getGuidedSpeechSnapshot, getGuidedSpeechSnapshot);
  const canSpeak = speech.supported;

  const speak = (mode) => {
    announceGuided(modes[mode].explanation);
  };

  const selectMode = (mode) => {
    setSelectedMode(mode);
    speak(mode);
  };

  const continueToMode = () => {
    if (!selectedMode) return;
    stopGuidedSpeech();
    onContinue(selectedMode);
  };

  return (
    <Box className="mode-selection-screen">
      <Container maxWidth="sm" className="mode-selection-content">
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <BackendStatusIndicator status={backendStatus} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Box className="mode-brand-mark" aria-hidden="true"><HearingOutlinedIcon /></Box>
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1 }}>Escudo Comunitario</Typography>
            <Typography variant="body2" color="text.secondary">Prevención comunitaria</Typography>
          </Box>
        </Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
          ¿Cómo prefieres usar la aplicación?
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 2.5, lineHeight: 1.6 }}>
          Elige una forma de comenzar. Puedes cambiar de modo después.
        </Typography>

        <RadioGroup
          aria-label="Elige cómo usar la aplicación"
          value={selectedMode}
          onChange={(event) => selectMode(event.target.value)}
          sx={{ display: 'grid', gap: 1.5 }}
        >
          {Object.entries(modes).map(([mode, item]) => {
            const selected = selectedMode === mode;
            return (
              <Card key={mode} variant="outlined" sx={{ borderWidth: selected ? 3 : 1, borderColor: selected ? 'primary.main' : 'divider', bgcolor: selected ? 'primary.50' : 'background.paper', overflow: 'hidden' }}>
                <FormControlLabel
                  value={mode}
                  control={<Radio sx={{ ml: 1 }} />}
                  label={(
                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', textAlign: 'left', minHeight: 126, py: 1, pr: 1, gap: 2 }}>
                      <Box className="mode-option-icon" aria-hidden="true">{item.icon}</Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>{item.title}</Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.5 }}>{item.description}</Typography>
                      </Box>
                      {selected && <CheckCircleRoundedIcon color="primary" aria-hidden="true" />}
                    </Box>
                  )}
                  sx={{ m: 0, width: '100%', minHeight: 132, '& .MuiFormControlLabel-label': { flex: 1 } }}
                />
              </Card>
            );
          })}
        </RadioGroup>

        <Box aria-live="polite" role="status" sx={{ minHeight: 32, mt: 1.5 }}>
          {speech.speaking && <Typography variant="body2" color="text.secondary">Reproduciendo la explicación seleccionada.</Typography>}
          {speech.error && <Typography variant="body2" color="error.main">{speech.error}</Typography>}
          {!canSpeak && <Typography variant="body2" color="text.secondary">La lectura por voz no está disponible en este navegador. Puedes continuar leyendo las instrucciones.</Typography>}
        </Box>
        {selectedMode && canSpeak && (
          <Button type="button" variant="text" startIcon={<VolumeUpOutlinedIcon />} onClick={() => speak(selectedMode)} sx={{ minHeight: 48, mt: 0.25 }}>
            Repetir explicación del {modes[selectedMode].title.toLowerCase()}
          </Button>
        )}
        {!selectedMode && <Chip label="Selecciona una tarjeta para continuar" variant="outlined" sx={{ mt: 1 }} />}
        <InstallAppButton />
        <Button type="button" variant="contained" fullWidth disabled={!selectedMode} onClick={continueToMode} sx={{ minHeight: 60, mt: 2, fontSize: '1.1rem' }}>
          Continuar
        </Button>
      </Container>
    </Box>
  );
}
