import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { md3Theme } from './theme/md3Theme.js'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={md3Theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
