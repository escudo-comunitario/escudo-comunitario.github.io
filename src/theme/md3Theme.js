import { createTheme } from '@mui/material/styles';

export const md3Theme = createTheme({
  palette: {
    primary: {
      main: '#006A60',       // Verde institucional comunitario accesible
      contrastText: '#FFFFFF',
    },
    // Contenedores tonales para el Semáforo de Veredicto
    success: {
      main: '#137333',       // Texto e icono veredicto seguro
      light: '#E6F4EA',      // Fondo tonal superficie segura
    },
    error: {
      main: '#C5221F',       // Texto e icono veredicto peligro
      light: '#FCE8E6',      // Fondo tonal superficie de alerta
    },
    background: {
      default: '#F8FAF8',    // Superficie neutra cálida
      paper: '#FFFFFF',
    },
    text: {
      primary: '#191C1B',
      secondary: '#404944',
    },
  },
  shape: {
    borderRadius: 16,        // Curvatura base MD3
  },
  typography: {
    fontFamily: '"Roboto", "Segoe UI", sans-serif',
    button: {
      textTransform: 'none', // Sin mayúsculas agresivas
      fontWeight: 600,
      fontSize: '1rem',
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true, // Estilo plano con contenedor tonal
      },
      styleOverrides: {
        root: {
          borderRadius: 28,     // Botones tipo píldora
          minHeight: 48,        // Target táctil accesible
          padding: '12px 24px',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        variant: 'outlined',   // Tarjetas planas con contorno sutil
      },
      styleOverrides: {
        root: {
          borderRadius: 20,
          borderColor: '#E0E3E0',
        },
      },
    },
  },
});
