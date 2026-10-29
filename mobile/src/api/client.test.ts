import { ApiClient, ApiError, NetworkError, UnauthorizedError, describeError, isNetworkError, isUnauthorized } from './client';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}

describe('ApiClient', () => {
  const originalFetch = global.fetch;
  const mockFetch = jest.fn();
  const client = new ApiClient({ baseUrl: 'https://shopping.example.com/' });

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('собирает URL без двойных слэшей и прокидывает токен', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, [{ id: 'list-1' }]));

    await expect(client.request('/lists', { token: 'secret-token' })).resolves.toEqual([{ id: 'list-1' }]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://shopping.example.com/lists');
    expect(init).toMatchObject({
      method: 'GET',
      headers: expect.objectContaining({
        Accept: 'application/json',
        Authorization: 'Bearer secret-token',
      }),
    });
  });

  it('сериализует тело POST и ставит Content-Type', async () => {
    mockFetch.mockResolvedValue(jsonResponse(201, { id: 'item-1' }));

    await client.request('/lists/1/items', { method: 'POST', body: { name: 'Хлеб', quantity: 1 } });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ name: 'Хлеб', quantity: 1 }));
  });

  it('возвращает undefined для 204', async () => {
    mockFetch.mockResolvedValue(jsonResponse(204, undefined));
    await expect(client.request('/lists/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('превращает 401 в UnauthorizedError', async () => {
    mockFetch.mockResolvedValue(jsonResponse(401, { detail: 'Invalid token' }));

    await expect(client.request('/lists')).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(client.request('/lists')).rejects.toThrow('Сессия истекла, войдите снова');
  });

  it('переводит известные сообщения бэкенда', async () => {
    mockFetch.mockResolvedValue(jsonResponse(400, { detail: 'Invalid or registered email' }));

    const error = await client.request('/auth/register', { method: 'POST', body: {} }).catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as Error).message).toBe('Такой e-mail уже занят или указан неверно');
  });

  it('разбирает массив ошибок валидации FastAPI', async () => {
    mockFetch.mockResolvedValue(jsonResponse(422, { detail: [{ msg: 'field required' }] }));

    await expect(client.request('/lists', { method: 'POST', body: {} })).rejects.toThrow(
      'Проверьте данные: field required',
    );
  });

  it('даёт понятный текст для 500 без тела', async () => {
    mockFetch.mockResolvedValue(jsonResponse(500, undefined));
    await expect(client.request('/lists')).rejects.toThrow('Сервер временно недоступен');
  });

  it('оборачивает сетевые ошибки в NetworkError', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    const error = await client.request('/lists').catch((caught) => caught);
    expect(error).toBeInstanceOf(NetworkError);
    expect(isNetworkError(error)).toBe(true);
    expect(isUnauthorized(error)).toBe(false);
    expect((error as Error).message).toBe('Нет соединения с сервером');
  });

  it('прерывает запрос по таймауту', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    });

    const pending = client.request('/lists', { timeoutMs: 1_000 });
    const assertion = expect(pending).rejects.toThrow('Сервер не ответил вовремя. Проверьте соединение.');
    jest.advanceTimersByTime(1_000);
    await assertion;
    jest.useRealTimers();
  });

  it('не добавляет Authorization без токена', async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { status: 'ok' }));
    await client.request('/health');
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });
});

describe('describeError', () => {
  it('показывает неизвестный detail как есть', () => {
    expect(describeError({ detail: 'Something custom' }, 400)).toBe('Something custom');
  });

  it('использует статус, если тела нет', () => {
    expect(describeError(null, 403)).toBe('Нет доступа к этому списку');
    expect(describeError(null, 418)).toBe('Ошибка сервера (418)');
  });
});
