import React from 'react';
import { Box, Typography } from '@mui/material';

const statusLabels = {
  connecting: 'Conectando…',
  connected: 'Conectado',
  offline: 'Sin conexión',
};

const statusColors = {
  connecting: { light: '#8A5A00', dark: '#FFE08A' },
  connected: { light: '#176B37', dark: '#A6E7BB' },
  offline: { light: '#B3261E', dark: '#FFB4AB' },
};

export default function BackendStatusIndicator({ status = 'connecting', darkBackground = false }) {
  const label = statusLabels[status] || statusLabels.offline;
  const colors = statusColors[status] || statusColors.offline;
  const dotColor = darkBackground ? colors.dark : colors.light;
  const textColor = darkBackground ? '#FFFFFF' : '#26332D';

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Estado de disponibilidad de la API: ${label}`}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minWidth: 0, color: textColor, whiteSpace: 'nowrap' }}
    >
      <Box aria-hidden="true" sx={{ width: 8, height: 8, flex: '0 0 auto', borderRadius: '50%', bgcolor: dotColor }} />
      <Typography component="span" variant="caption" sx={{ color: textColor, fontWeight: 700, lineHeight: 1.3 }}>
        {label}
      </Typography>
    </Box>
  );
}
