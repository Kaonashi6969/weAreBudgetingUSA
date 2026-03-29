import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wearebudgeting.app',
  appName: 'weAreBudgetingUSA',
  webDir: 'dist/frontend/browser/',
  server: {
    url: 'http://192.168.50.38:4200',
    cleartext: true,
    androidScheme: 'http'
  }
};

export default config;
