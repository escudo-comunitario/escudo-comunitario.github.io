export function registerServiceWorker() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch((error) => {
        console.warn('No se pudo activar el almacenamiento sin conexión de la interfaz.', error);
      });
  }, { once: true });
}
