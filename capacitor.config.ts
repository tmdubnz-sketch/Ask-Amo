import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.askamo.mobile',
  appName: 'Ask Amo',
  webDir: 'dist',
  bundledWebRuntime: false,
  loggingBehavior: 'none',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
