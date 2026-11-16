import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dahatoo.expenses',
  appName: 'داهاتوو',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
