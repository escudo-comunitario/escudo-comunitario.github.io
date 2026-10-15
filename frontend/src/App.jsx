import { Box, Stack, Typography } from '@mui/material'

function App() {
  return (
    <Stack sx={{ minHeight: '100vh', p: 3 }}>
      <Box component="main" sx={{ flex: 1 }}>
        <Typography component="h1" variant="h4" color="primary" gutterBottom>
          Escudo Comunitario
        </Typography>
        <Typography color="text.secondary">
          Estamos preparando un espacio para cuidarnos del engaño digital en Bosa.
        </Typography>
      </Box>
      <Box component="footer" sx={{ pt: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Escudo Comunitario — Diseñado por Bacata Tech Group para Bosa
        </Typography>
      </Box>
    </Stack>
  )
}

export default App
