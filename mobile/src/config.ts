import Constants from 'expo-constants';

import { createApi, type ShoppingApi } from './api/shopping';

const DEFAULT_API_URL = 'https://shopping.karpiev.ru';

function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const fromConfig = (Constants.expoConfig?.extra as { apiUrl?: unknown } | undefined)?.apiUrl;
  if (typeof fromConfig === 'string' && fromConfig.trim()) {
    return fromConfig.trim();
  }
  return DEFAULT_API_URL;
}

export const API_URL = resolveApiUrl();
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
export const APP_BUILD = String(Constants.expoConfig?.android?.versionCode ?? 1);
export const APP_NAME = Constants.expoConfig?.name ?? 'Shopping';

/** Единственный экземпляр API-клиента на всё приложение. */
export const api: ShoppingApi = createApi(API_URL);
