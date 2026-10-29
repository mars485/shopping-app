import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { isNetworkError, isUnauthorized } from '../api/client';
import type { ShoppingApi } from '../api/shopping';
import type { Item, ItemInput, ItemPatchInput, ShoppingList } from '../api/types';
import { loadListsCache, saveListsCache } from '../lib/storage';
import { useAuth } from './auth';

export type ListsState = {
  lists: ShoppingList[];
  status: 'idle' | 'loading' | 'ready';
  refreshing: boolean;
  error: string | null;
  offline: boolean;
  lastSync: number | null;
};

export const initialListsState: ListsState = {
  lists: [],
  status: 'idle',
  refreshing: false,
  error: null,
  offline: false,
  lastSync: null,
};

export type ListsAction =
  | { type: 'reset' }
  | { type: 'hydrated'; lists: ShoppingList[]; lastSync: number | null }
  | { type: 'loadStarted'; refreshing: boolean }
  | { type: 'loadSucceeded'; lists: ShoppingList[]; lastSync: number }
  | { type: 'errorSet'; error: string; offline: boolean }
  | { type: 'errorCleared' }
  | { type: 'listAdded'; list: ShoppingList }
  | { type: 'listRemoved'; listId: string }
  | { type: 'itemAdded'; listId: string; item: Item }
  | { type: 'itemUpdated'; listId: string; item: Item }
  | { type: 'itemPatched'; listId: string; itemId: string; patch: Partial<Item> }
  | { type: 'itemRemoved'; listId: string; itemId: string }
  | { type: 'listsReplaced'; lists: ShoppingList[] };

function mapList(lists: ShoppingList[], listId: string, updater: (list: ShoppingList) => ShoppingList): ShoppingList[] {
  return lists.map((list) => (list.id === listId ? updater(list) : list));
}

/** Чистый редьюсер — используется и в UI, и в тестах. */
export function listsReducer(state: ListsState, action: ListsAction): ListsState {
  switch (action.type) {
    case 'reset':
      return initialListsState;
    case 'hydrated':
      return {
        ...state,
        lists: action.lists,
        lastSync: action.lastSync,
        status: 'ready',
      };
    case 'loadStarted':
      return {
        ...state,
        status: state.status === 'idle' ? 'loading' : state.status,
        refreshing: action.refreshing,
        error: action.refreshing ? state.error : null,
      };
    case 'loadSucceeded':
      return {
        ...state,
        lists: action.lists,
        status: 'ready',
        refreshing: false,
        offline: false,
        error: null,
        lastSync: action.lastSync,
      };
    case 'errorSet':
      return {
        ...state,
        refreshing: false,
        error: action.error,
        offline: action.offline,
        status: state.status === 'idle' || state.status === 'loading' ? 'ready' : state.status,
      };
    case 'errorCleared':
      return { ...state, error: null };
    case 'listAdded':
      return {
        ...state,
        lists: [action.list, ...state.lists.filter((list) => list.id !== action.list.id)],
        lastSync: Date.now(),
      };
    case 'listRemoved':
      return {
        ...state,
        lists: state.lists.filter((list) => list.id !== action.listId),
        lastSync: Date.now(),
      };
    case 'itemAdded':
      return {
        ...state,
        lists: mapList(state.lists, action.listId, (list) => ({
          ...list,
          items: [...list.items.filter((item) => item.id !== action.item.id), action.item],
        })),
        lastSync: Date.now(),
      };
    case 'itemUpdated':
      return {
        ...state,
        lists: mapList(state.lists, action.listId, (list) => ({
          ...list,
          items: list.items.map((item) => (item.id === action.item.id ? action.item : item)),
        })),
        lastSync: Date.now(),
      };
    case 'itemPatched':
      return {
        ...state,
        lists: mapList(state.lists, action.listId, (list) => ({
          ...list,
          items: list.items.map((item) =>
            item.id === action.itemId ? { ...item, ...action.patch } : item,
          ),
        })),
      };
    case 'itemRemoved':
      return {
        ...state,
        lists: mapList(state.lists, action.listId, (list) => ({
          ...list,
          items: list.items.filter((item) => item.id !== action.itemId),
        })),
        lastSync: Date.now(),
      };
    case 'listsReplaced':
      return { ...state, lists: action.lists };
    default:
      return state;
  }
}

type ListsContextValue = {
  state: ListsState;
  getList: (listId: string) => ShoppingList | undefined;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  refreshIfStale: (maxAgeMs?: number) => void;
  createList: (name: string) => Promise<ShoppingList>;
  deleteList: (listId: string) => Promise<void>;
  shareList: (listId: string, email: string) => Promise<void>;
  addItem: (listId: string, input: ItemInput) => Promise<Item>;
  updateItem: (listId: string, itemId: string, patch: ItemPatchInput) => Promise<Item>;
  toggleItem: (listId: string, itemId: string) => Promise<void>;
  deleteItem: (listId: string, itemId: string) => Promise<void>;
  clearError: () => void;
};

const ListsContext = createContext<ListsContextValue | null>(null);

const STALE_AFTER_MS = 15_000;

function messageOf(error: unknown, fallback = 'Не удалось выполнить действие'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function ListsProvider({ children }: { children: ReactNode }) {
  const { state: auth, api, expireSession } = useAuth();
  const token = auth.status === 'signedIn' ? auth.session?.token ?? null : null;
  const email = auth.status === 'signedIn' ? auth.session?.email ?? null : null;

  const [state, dispatch] = useReducer(listsReducer, initialListsState);
  const stateRef = useRef(state);
  const syncingRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handleError = useCallback(
    (error: unknown, fallback?: string) => {
      if (isUnauthorized(error)) {
        expireSession();
        return;
      }
      dispatch({ type: 'errorSet', error: messageOf(error, fallback), offline: isNetworkError(error) });
    },
    [expireSession],
  );

  const refresh = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!token || !email || syncingRef.current) {
        return;
      }
      syncingRef.current = true;
      dispatch({ type: 'loadStarted', refreshing: !silent });
      try {
        const lists = await api.getLists(token);
        const lastSync = Date.now();
        dispatch({ type: 'loadSucceeded', lists, lastSync });
        void saveListsCache(email, { lists, lastSync });
      } catch (error) {
        handleError(error, 'Не удалось загрузить списки');
      } finally {
        syncingRef.current = false;
      }
    },
    [api, email, handleError, token],
  );

  // Гидратация из кэша + первичная синхронизация при входе.
  useEffect(() => {
    if (!token || !email) {
      dispatch({ type: 'reset' });
      return;
    }
    let alive = true;
    dispatch({ type: 'loadStarted', refreshing: true });
    (async () => {
      const cache = await loadListsCache(email);
      if (alive && cache) {
        dispatch({ type: 'hydrated', lists: cache.lists, lastSync: cache.lastSync });
      }
      if (alive) {
        await refresh({ silent: true });
      }
    })();
    return () => {
      alive = false;
    };
  }, [email, refresh, token]);

  // Кэш всех изменений — офлайн-режим и мгновенный старт.
  useEffect(() => {
    if (!email || state.status === 'idle') {
      return;
    }
    void saveListsCache(email, { lists: state.lists, lastSync: state.lastSync ?? Date.now() });
  }, [email, state.lists, state.lastSync, state.status]);

  const refreshIfStale = useCallback(
    (maxAgeMs: number = STALE_AFTER_MS) => {
      const last = stateRef.current.lastSync ?? 0;
      if (Date.now() - last > maxAgeMs) {
        void refresh({ silent: true });
      }
    },
    [refresh],
  );

  // Синхронизация при возврате приложения на передний план.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshIfStale();
      }
    });
    return () => subscription.remove();
  }, [refreshIfStale]);

  const createList = useCallback(
    async (name: string) => {
      if (!token) {
        throw new Error('Нужно войти в аккаунт');
      }
      try {
        const list = await api.createList(token, name.trim());
        dispatch({ type: 'listAdded', list });
        return list;
      } catch (error) {
        handleError(error, 'Не удалось создать список');
        throw error;
      }
    },
    [api, handleError, token],
  );

  const deleteList = useCallback(
    async (listId: string) => {
      if (!token) {
        return;
      }
      const previous = stateRef.current.lists;
      dispatch({ type: 'listRemoved', listId });
      try {
        await api.deleteList(token, listId);
      } catch (error) {
        dispatch({ type: 'listsReplaced', lists: previous });
        handleError(error, 'Не удалось удалить список');
        throw error;
      }
    },
    [api, handleError, token],
  );

  const shareList = useCallback(
    async (listId: string, contactEmail: string) => {
      if (!token) {
        return;
      }
      try {
        await api.shareList(token, listId, contactEmail);
      } catch (error) {
        handleError(error, 'Не удалось поделиться списком');
        throw error;
      }
    },
    [api, handleError, token],
  );

  const addItem = useCallback(
    async (listId: string, input: ItemInput) => {
      if (!token) {
        throw new Error('Нужно войти в аккаунт');
      }
      try {
        const item = await api.addItem(token, listId, input);
        dispatch({ type: 'itemAdded', listId, item });
        return item;
      } catch (error) {
        handleError(error, 'Не удалось добавить товар');
        throw error;
      }
    },
    [api, handleError, token],
  );

  const updateItem = useCallback(
    async (listId: string, itemId: string, patch: ItemPatchInput) => {
      if (!token) {
        throw new Error('Нужно войти в аккаунт');
      }
      const previous = stateRef.current.lists;
      dispatch({ type: 'itemPatched', listId, itemId, patch });
      try {
        const item = await api.updateItem(token, listId, itemId, patch);
        dispatch({ type: 'itemUpdated', listId, item });
        return item;
      } catch (error) {
        dispatch({ type: 'listsReplaced', lists: previous });
        handleError(error, 'Не удалось сохранить товар');
        throw error;
      }
    },
    [api, handleError, token],
  );

  const toggleItem = useCallback(
    async (listId: string, itemId: string) => {
      if (!token) {
        return;
      }
      const list = stateRef.current.lists.find((entry) => entry.id === listId);
      const item = list?.items.find((entry) => entry.id === itemId);
      if (!item) {
        return;
      }
      dispatch({ type: 'itemPatched', listId, itemId, patch: { checked: !item.checked } });
      try {
        const updated = await api.toggleItem(token, listId, itemId);
        dispatch({ type: 'itemUpdated', listId, item: updated });
      } catch (error) {
        dispatch({ type: 'itemPatched', listId, itemId, patch: { checked: item.checked } });
        handleError(error, 'Не удалось отметить товар');
      }
    },
    [api, handleError, token],
  );

  const deleteItem = useCallback(
    async (listId: string, itemId: string) => {
      if (!token) {
        return;
      }
      const previous = stateRef.current.lists;
      dispatch({ type: 'itemRemoved', listId, itemId });
      try {
        await api.deleteItem(token, listId, itemId);
      } catch (error) {
        dispatch({ type: 'listsReplaced', lists: previous });
        handleError(error, 'Не удалось удалить товар');
        throw error;
      }
    },
    [api, handleError, token],
  );

  const getList = useCallback(
    (listId: string) => stateRef.current.lists.find((list) => list.id === listId),
    [],
  );

  const clearError = useCallback(() => dispatch({ type: 'errorCleared' }), []);

  const value = useMemo<ListsContextValue>(
    () => ({
      state,
      getList,
      refresh,
      refreshIfStale,
      createList,
      deleteList,
      shareList,
      addItem,
      updateItem,
      toggleItem,
      deleteItem,
      clearError,
    }),
    [
      state,
      getList,
      refresh,
      refreshIfStale,
      createList,
      deleteList,
      shareList,
      addItem,
      updateItem,
      toggleItem,
      deleteItem,
      clearError,
    ],
  );

  return <ListsContext.Provider value={value}>{children}</ListsContext.Provider>;
}

export function useLists(): ListsContextValue {
  const value = useContext(ListsContext);
  if (!value) {
    throw new Error('useLists должен вызываться внутри ListsProvider');
  }
  return value;
}

export type { ShoppingApi };
