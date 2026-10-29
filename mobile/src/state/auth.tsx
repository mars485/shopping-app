import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { isUnauthorized } from '../api/client';
import type { ShoppingApi } from '../api/shopping';
import type { Session } from '../api/types';
import { api as defaultApi } from '../config';
import { normalizeEmail } from '../lib/validate';
import { clearSession, loadSession, saveSession } from '../lib/storage';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export type AuthState = {
  status: AuthStatus;
  session: Session | null;
  /** Сообщение для экрана входа (например, истёкшая сессия). */
  notice: string | null;
};

type AuthContextValue = {
  state: AuthState;
  api: ShoppingApi;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: (notice?: string | null) => Promise<void>;
  expireSession: () => void;
  clearNotice: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  api = defaultApi,
}: {
  children: ReactNode;
  api?: ShoppingApi;
}) {
  const [state, setState] = useState<AuthState>({ status: 'loading', session: null, notice: null });

  useEffect(() => {
    let alive = true;
    loadSession()
      .then((session) => {
        if (!alive) {
          return;
        }
        setState({ status: session ? 'signedIn' : 'signedOut', session, notice: null });
      })
      .catch(() => {
        if (alive) {
          setState({ status: 'signedOut', session: null, notice: null });
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback(async (session: Session) => {
    try {
      await saveSession(session);
    } catch {
      // приложение продолжит работать в памяти, даже если хранилище недоступно
    }
    setState({ status: 'signedIn', session, notice: null });
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const normalized = normalizeEmail(email);
      const response = await api.login(normalized, password);
      await persist({ token: response.access_token, email: normalized });
    },
    [api, persist],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const normalized = normalizeEmail(email);
      const response = await api.register(normalized, password);
      await persist({ token: response.access_token, email: normalized });
    },
    [api, persist],
  );

  const signOut = useCallback(async (notice: string | null = null) => {
    await clearSession();
    setState({ status: 'signedOut', session: null, notice });
  }, []);

  const expireSession = useCallback(() => {
    void signOut('Сессия истекла — войдите снова');
  }, [signOut]);

  const clearNotice = useCallback(() => {
    setState((current) => (current.notice ? { ...current, notice: null } : current));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ state, api, signIn, signUp, signOut, expireSession, clearNotice }),
    [state, api, signIn, signUp, signOut, expireSession, clearNotice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth должен вызываться внутри AuthProvider');
  }
  return value;
}

/** Удобный хелпер: обрабатывает 401 и возвращает токен либо null. */
export function useSessionToken(): string | null {
  const { state } = useAuth();
  return state.status === 'signedIn' ? state.session?.token ?? null : null;
}

export function isAuthError(error: unknown): boolean {
  return isUnauthorized(error);
}
