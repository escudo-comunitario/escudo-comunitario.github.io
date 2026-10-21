import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import GuidedVoiceControls from './GuidedVoiceControls';

export const guidedOptionsSequence = [
  'Uno. Revisar un mensaje sospechoso.',
  'Dos. Contar algo que me pasó.',
  'Tres. Contactar a alguien de confianza.',
  'Cuatro. Ver información comunitaria.',
];

export const guidedHomeSequence = [
  'Hola, estoy aquí para acompañarte. Selecciona una opción.',
  ...guidedOptionsSequence,
];

const tasks = [
  { id: 'analysis', title: 'Revisar un mensaje sospechoso', detail: 'Mira un mensaje antes de responder.', icon: <SearchOutlinedIcon /> },
  { id: 'incident', title: 'Contar algo que me pasó', detail: 'Cuéntalo paso a paso.', icon: <ReportProblemOutlinedIcon /> },
  { id: 'trust', title: 'Contactar a alguien de confianza', detail: 'Prepara un mensaje para pedir ayuda.', icon: <PeopleAltOutlinedIcon /> },
];

export default function GuidedHome({ onSelectTask, onSwitchToNormal, onOpenStats }) {
  return (
    <Box sx={{ display: 'grid', gap: 2, maxWidth: 680, mx: 'auto' }}>
      <Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 800 }}>Hola. Estoy aquí para acompañarte.</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
          Elige una sola tarea para comenzar. Puedes escuchar las instrucciones y responder hablando o tocando opciones.
        </Typography>
        <GuidedVoiceControls
          speakSequence={guidedOptionsSequence}
          speakLabel="Escuchar las opciones otra vez"
          showDictation={false}
        />
      </Box>
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {tasks.map((task) => (
          <Paper key={task.id} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Button type="button" fullWidth onClick={() => onSelectTask(task.id)} startIcon={task.icon} sx={{ justifyContent: 'flex-start', textAlign: 'left', minHeight: 84, px: 2, py: 1.5 }}>
              <Box>
                <Typography component="span" sx={{ display: 'block', fontWeight: 800 }}>{task.title}</Typography>
                <Typography component="span" variant="body2" color="text.secondary">{task.detail}</Typography>
              </Box>
            </Button>
          </Paper>
        ))}
      </Box>
      <Button type="button" variant="outlined" onClick={onOpenStats} startIcon={<BarChartOutlinedIcon />} sx={{ minHeight: 56 }}>
        Ver información comunitaria
      </Button>
      <Button type="button" onClick={onSwitchToNormal} sx={{ minHeight: 52 }}>
        Cambiar al modo normal
      </Button>
    </Box>
  );
}
