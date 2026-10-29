import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';

import { currentUserId } from '../lib/jwt';
import { useAuth } from '../state/auth';
import { useLists } from '../state/lists';

/** Пускает в экран только авторизованного пользователя. */
export function useRequireAuth(): void {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'signedOut') {
      router.replace('/sign-in');
    }
  }, [router, state.status]);
}

/** Уводит с экранов входа, если пользователь уже авторизован. */
export function useRedirectIfSignedIn(): void {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'signedIn') {
      router.replace('/lists');
    }
  }, [router, state.status]);
}

/** Текущий id пользователя из токена — нужен, чтобы отличать свои списки от общих. */
export function useCurrentUser(): { userId: string | null; email: string | null } {
  const { state } = useAuth();
  return {
    userId: state.session ? currentUserId(state.session.token) : null,
    email: state.session?.email ?? null,
  };
}

/** Обновление данных при фокусе экрана, но не чаще указанного интервала. */
export function useRefreshOnFocus(maxAgeMs?: number): void {
  const { refreshIfStale } = useLists();

  useFocusEffect(
    useCallback(() => {
      refreshIfStale(maxAgeMs);
    }, [maxAgeMs, refreshIfStale]),
  );
}
