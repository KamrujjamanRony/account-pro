import Constants from 'expo-constants';

/**
 * Runtime configuration, mirroring the Angular app's `environment.ts`.
 * Values come from `app.json` → `expo.extra` so they can be overridden per
 * build without touching code.
 *
 * NOTE: On an Android emulator, `localhost` refers to the emulator itself, so
 * the host machine's API is reached at `http://10.0.2.2:<port>`. On a physical
 * device use your machine's LAN IP (e.g. `http://192.168.0.10:1000/p`).
 */
type Extra = {
  companyName: string;
  companyAddress: string;
  companyCode: number;
  apiUrl: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

export const environment = {
  companyName: extra.companyName ?? 'Account Pro',
  companyAddress: extra.companyAddress ?? 'Dhaka, Bangladesh',
  companyCode: extra.companyCode ?? 1,
  apiUrl: extra.apiUrl ?? 'http://10.0.2.2:1000/p',
};
