import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Small storage abstraction. Tokens are kept in the OS secure store on native
 * (falling back to AsyncStorage on web); the cached user object uses plain
 * AsyncStorage. Mirrors the cookie/localStorage split of the Angular app.
 */
const isWeb = Platform.OS === 'web';

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (isWeb) return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (isWeb) return AsyncStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (isWeb) return AsyncStorage.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};

export const appStorage = {
  get: (key: string) => AsyncStorage.getItem(key),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value),
  remove: (key: string) => AsyncStorage.removeItem(key),
};

export const STORAGE_KEYS = {
  token: 'auth_token',
  refresh: 'refresh_token',
  user: 'account_pro_user',
  theme: 'account_pro_theme',
} as const;
