import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adejorooluwatobi.posportal',
  appName: 'POS Portal',
  webDir: 'dist/pos-admin/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;
