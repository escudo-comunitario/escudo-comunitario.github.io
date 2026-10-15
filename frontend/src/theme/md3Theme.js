import { createTheme } from '@mui/material/styles'

export const md3Theme = createTheme({
  palette: {
    primary: { main: '#006A60', contrastText: '#FFFFFF' },
    success: { main: '#137333', light: '#E6F4EA' },
    error: { main: '#C5221F', light: '#FCE8E6' },
    background: { default: '#F8FAF8', paper: '#FFFFFF' },
    text: { primary: '#191C1B', secondary: '#404944' },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Roboto", "Segoe UI", sans-serif',
    button: { textTransform: 'none', fontWeight: 600, fontSize: '1rem' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 28, minHeight: 48, minWidth: 48, padding: '12px 24px' },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: { borderRadius: 20, borderColor: '#E0E3E0' },
      },
    },
  },
})
