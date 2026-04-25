import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ataolaitech.actledger',
  appName: 'ActLedger',
  webDir: 'dist',
  server: {
    url: 'https://www.actledger.com/m/giris',
    cleartext: false,
    allowNavigation: ['*.actledger.com', 'actledger.com'],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a',
    },
  },
  ios: {
    scheme: 'ActLedger',
    contentInset: 'automatic',
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
