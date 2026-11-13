import type { CapacitorConfig } from '@capacitor/cli';

/**
 * App móvil de AUREN (Capacitor). La carpeta www/ (el build de Ionic/Angular) se empaqueta
 * como app Android. El servidor del profesor usa http (sin https), por eso se permite el
 * contenido mixto en Android.
 */
const config: CapacitorConfig = {
  appId: 'co.auren.app',
  appName: 'AUREN',
  webDir: 'www',
  android: {
    allowMixedContent: true,
  },
};

export default config;
