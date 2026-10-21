import React, { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import GetAppOutlinedIcon from '@mui/icons-material/GetAppOutlined';

function isStandalone() {
  return (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches)
    || (typeof navigator !== 'undefined' && navigator.standalone === true);
}

function getInstallInstructions() {
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const platform = typeof navigator === 'undefined' ? '' : navigator.platform;
  const touchPoints = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints;
  if (/iPad|iPhone|iPod/i.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1)) {
    return 'En Safari, pulsa Compartir y luego “Añadir a pantalla de inicio”. Si esa opción no aparece, comprueba que abriste Escudo desde una dirección HTTPS.';
  }
  if (/Android/i.test(userAgent)) {
    return 'Abre el menú del navegador y elige “Instalar aplicación” o “Añadir a pantalla de inicio”. Si la opción no aparece, vuelve a intentarlo desde una dirección HTTPS.';
  }
  return 'Abre el menú del navegador y busca “Instalar aplicación” o “Instalar Escudo Comunitario”. Si la opción no aparece, el navegador o el sitio quizá aún no cumpla sus requisitos de instalación.';
}

export default function InstallAppButton({ color = 'primary', variant = 'outlined', compact = false }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      if (isStandalone()) return;
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstalled(true);
    };
    const media = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      if (isStandalone()) setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    if (media?.addEventListener) media.addEventListener('change', handleDisplayModeChange);
    else media?.addListener?.(handleDisplayModeChange);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      if (media?.removeEventListener) media.removeEventListener('change', handleDisplayModeChange);
      else media?.removeListener?.(handleDisplayModeChange);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) {
      setInstructionsOpen(true);
      return;
    }
    const promptEvent = installPrompt;
    setInstallPrompt(null);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch {
      setInstructionsOpen(true);
    }
  };

  if (installed) return null;

  return (
    <>
      <Button type="button" color={color} variant={variant} onClick={install} startIcon={<GetAppOutlinedIcon />} aria-label={installPrompt ? 'Instalar aplicación' : 'Cómo instalar'} sx={{ minHeight: 48, px: compact ? 1 : undefined }}>
        {installPrompt ? (compact ? 'Instalar' : 'Instalar aplicación') : 'Cómo instalar'}
      </Button>
      <Dialog open={instructionsOpen} onClose={() => setInstructionsOpen(false)} aria-labelledby="install-app-title" aria-describedby="install-app-description">
        <DialogTitle id="install-app-title">Instalar Escudo Comunitario</DialogTitle>
        <DialogContent id="install-app-description">{getInstallInstructions()}</DialogContent>
        <DialogActions>
          <Button onClick={() => setInstructionsOpen(false)}>Entendido</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
