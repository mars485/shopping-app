import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Session, ShoppingList } from '../api/types';

const SESSION_KEY = 'shopping.session.v1';
const CACHE_PREFIX = 'shopping.lists.v1.';

/**
 * Токен хранится в SecureStore (Android Keystore / iOS Keychain).
 * На web SecureStore недоступен — используется AsyncStorage.
 */
async function secureAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = (await secureAvailable())
      ? await SecureStore.getItemAsync(SESSION_KEY)
      : await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (typeof parsed.token === 'string' && typeof parsed.email === 'string' && parsed.token) {
      return { token: parsed.token, email: parsed.email };
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  const raw = JSON.stringify(session);
  if (await secureAvailable()) {
    await SecureStore.setItemAsync(SESSION_KEY, raw);
    return;
  }
  await AsyncStorage.setItem(SESSION_KEY, raw);
}

export async function clearSession(): Promise<void> {
  try {
    if (await secureAvailable()) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    // намеренно игнорируем: выход из аккаунта не должен падать из-за хранилища
  }
}

export type ListsCache = {
  lists: ShoppingList[];
  lastSync: number;
};

function cacheKey(email: string): string {
  return `${CACHE_PREFIX}${email.trim().toLowerCase()}`;
}

export async function loadListsCache(email: string): Promise<ListsCache | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(email));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<ListsCache>;
    if (!Array.isArray(parsed.lists)) {
      return null;
    }
    return { lists: parsed.lists, lastSync: typeof parsed.lastSync === 'number' ? parsed.lastSync : 0 };
  } catch {
    return null;
  }
}

export async function saveListsCache(email: string, cache: ListsCache): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(email), JSON.stringify(cache));
  } catch {
    // кэш не критичен
  }
}

export async function clearListsCache(email: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(cacheKey(email));
  } catch {
    // намеренно игнорируем
  }
}
