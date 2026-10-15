import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  Divider,
} from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

export default function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Barra superior institucional */}
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar sx={{ minHeight: 64, gap: 1.5 }}>
          <ShieldOutlinedIcon sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Escudo Comunitario
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Bosa Protegida e Informada
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Contenido principal de inicio */}
      <Container
        component="main"
        sx={{
          flex: 1,
          py: 3,
          px: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 4,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
            Base de Inicio Lista
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Plataforma comunitaria de protección ciudadana lista para integrar componentes de dictado, diagnóstico seguro/peligro y red de confianza.
          </Typography>
        </Paper>

        {/* Cláusula Preventiva Obligatoria (Circular Externa 002 de 2024 - SIC) */}
        <Box sx={{ mt: 'auto', pt: 2 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: 'text.secondary',
              fontSize: '0.75rem',
              lineHeight: 1.4,
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            «El análisis emitido por la Inteligencia Artificial es preventivo y orientativo; no reemplaza una denuncia penal ni un dictamen pericial oficial emitido por las autoridades judiciales competentes.»
          </Typography>
        </Box>
      </Container>

      {/* Pie institucional */}
      <Divider />
      <Box component="footer" sx={{ py: 2, px: 2, textAlign: 'center', backgroundColor: '#F0F4F1' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          Escudo Comunitario — Diseñado por Bacata Tech Group para Bosa
        </Typography>
      </Box>
    </Box>
  );
}
