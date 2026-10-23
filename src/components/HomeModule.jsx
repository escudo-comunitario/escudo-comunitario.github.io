import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';

export default function HomeModule({ onNavigate, onOpenGuided }) {
  return (
    <Box sx={{ display: 'grid', gap: 2, maxWidth: 760, mx: 'auto', pt: { xs: 1, sm: 3 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1 }}>Escudo Comunitario · Ciudad Bolívar</Typography>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 800, mt: 1 }}>¿Te llegó algo raro?</Typography>
        <Typography sx={{ mt: 1, maxWidth: 560, opacity: 0.95 }}>
          Revísalo con calma antes de responder o abrir un enlace.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mt: 3 }}>
          <Button onClick={() => onNavigate('analysis', 'text')} variant="contained" color="inherit" startIcon={<EditNoteOutlinedIcon />} sx={{ minHeight: 60, bgcolor: 'background.paper', color: 'primary.main', fontWeight: 750, '&:hover': { bgcolor: 'grey.100' } }}>
            Revisar un mensaje sospechoso
          </Button>
          <Button onClick={() => onNavigate('receipt')} variant="outlined" startIcon={<ReceiptLongOutlinedIcon />} sx={{ minHeight: 60, borderColor: 'primary.contrastText', color: 'primary.contrastText', fontWeight: 750, '&:hover': { borderColor: 'primary.contrastText', bgcolor: 'rgba(255,255,255,0.1)' } }}>
            Verificar comprobante de pago
          </Button>
          <Button onClick={() => onNavigate('incident')} variant="outlined" startIcon={<ReportProblemOutlinedIcon />} sx={{ minHeight: 60, borderColor: 'primary.contrastText', color: 'primary.contrastText', fontWeight: 750, '&:hover': { borderColor: 'primary.contrastText', bgcolor: 'rgba(255,255,255,0.1)' } }}>
            Contar algo que me pasó
          </Button>
          <Button onClick={() => onNavigate('trust')} variant="outlined" startIcon={<PeopleAltOutlinedIcon />} sx={{ minHeight: 60, borderColor: 'primary.contrastText', color: 'primary.contrastText', fontWeight: 750, '&:hover': { borderColor: 'primary.contrastText', bgcolor: 'rgba(255,255,255,0.1)' } }}>
            Contactar a alguien de confianza
          </Button>
        </Box>
      </Paper>
      <Button type="button" variant="text" startIcon={<MicNoneOutlinedIcon />} onClick={() => onNavigate('analysis', 'voice')} sx={{ minHeight: 48, justifySelf: 'start' }}>
        Prefiero dictar un mensaje sospechoso
      </Button>
      <Button type="button" variant="outlined" startIcon={<HelpOutlineOutlinedIcon />} onClick={onOpenGuided} sx={{ minHeight: 56, borderRadius: 3 }}>
        Necesito ayuda para usar la aplicación
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, lineHeight: 1.6 }}>
        La orientación es preventiva. No compartas claves ni códigos y confirma cualquier solicitud por un canal oficial.
      </Typography>
    </Box>
  );
}
