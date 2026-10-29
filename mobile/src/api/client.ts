export type ApiErrorKind = 'api' | 'network' | 'unauthorized';

/** Ошибка ответа сервера (4xx/5xx). */
export class ApiError extends Error {
  readonly kind: ApiErrorKind = 'api';
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** 401 — токен отсутствует, истёк или недействителен. */
export class UnauthorizedError extends ApiError {
  readonly kind: ApiErrorKind = 'unauthorized';

  constructor(message = 'Нужно войти в аккаунт') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

/** Нет связи с сервером или превышен таймаут. */
export class NetworkError extends Error {
  readonly kind: ApiErrorKind = 'network';

  constructor(message = 'Нет соединения с сервером') {
    super(message);
    this.name = 'NetworkError';
  }
}

const DETAIL_MESSAGES: Record<string, string> = {
  'Invalid credentials': 'Неверный e-mail или пароль',
  'Invalid or registered email': 'Такой e-mail уже занят или указан неверно',
  'Authentication required': 'Нужно войти в аккаунт',
  'Invalid token': 'Сессия истекла, войдите снова',
  'Access denied': 'Нет доступа к этому списку',
  'List not found': 'Список не найден',
  'Item not found': 'Товар не найден',
  'User must register first': 'Пользователь не найден — сначала зарегистрируйтесь',
};

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Проверьте введённые данные',
  401: 'Нужно войти в аккаунт',
  403: 'Нет доступа к этому списку',
  404: 'Не найдено',
  409: 'Конфликт данных, обновите список',
  422: 'Проверьте введённые данные',
  429: 'Слишком много запросов, попробуйте позже',
  500: 'Сервер временно недоступен',
  502: 'Сервер временно недоступен',
  503: 'Сервер временно недоступен',
};

type FastApiDetail = string | { msg?: string }[] | undefined;

function extractDetail(payload: unknown): FastApiDetail {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    return (payload as { detail: FastApiDetail }).detail;
  }
  return undefined;
}

export function describeError(payload: unknown, status: number): string {
  const detail = extractDetail(payload);
  if (typeof detail === 'string') {
    return DETAIL_MESSAGES[detail] ?? detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]?.msg;
    if (typeof first === 'string' && first.length > 0) {
      return `Проверьте данные: ${first}`;
    }
  }
  return STATUS_MESSAGES[status] ?? `Ошибка сервера (${status})`;
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Тонкая обёртка над fetch: таймауты, JSON, заголовки, типизированные ошибки.
 * Не хранит состояние — токен передаётся в каждом запросе.
 */
export class ApiClient {
  readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: { baseUrl: string; timeoutMs?: number }) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, token, signal, timeoutMs } = options;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs ?? this.timeoutMs);
    const forwardAbort = () => controller.abort();
    signal?.addEventListener('abort', forwardAbort);

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      const aborted = (error as { name?: string } | null)?.name === 'AbortError';
      throw new NetworkError(
        aborted ? 'Сервер не ответил вовремя. Проверьте соединение.' : 'Нет соединения с сервером',
      );
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', forwardAbort);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const raw = await response.text();
    let payload: unknown = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = raw;
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new UnauthorizedError(describeError(payload, 401));
      }
      throw new ApiError(response.status, describeError(payload, response.status));
    }

    return payload as T;
  }
}

export function isUnauthorized(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}
