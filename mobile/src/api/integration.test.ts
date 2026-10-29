/**
 * Интеграционный тест клиента против живого бэкенда.
 *
 * По умолчанию пропускается. Запуск:
 *   $env:SHOPPING_E2E_URL = "http://127.0.0.1:8000"
 *   npx jest src/api/integration.test.ts
 *
 * Тест создаёт собственных пользователей с уникальными e-mail и удаляет созданные
 * списки в конце, поэтому безопасен для тестового стенда. Против продакшна
 * запускайте осознанно: остаются зарегистрированные пользователи.
 */
import http from 'node:http';

import { ApiError, UnauthorizedError } from './client';
import { ShoppingApi } from './shopping';
import { currentUserId } from '../lib/jwt';

const baseUrl = process.env.SHOPPING_E2E_URL;
const describeE2E = baseUrl ? describe : describe.skip;

/**
 * jest-окружение Expo подменяет global.fetch полифилом react-native,
 * который не умеет реальные запросы. Для интеграционного теста возвращаем
 * минимальную реализацию fetch поверх node:http.
 */
function nodeFetch(url: string, init: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
} = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: init.method ?? 'GET',
        headers: init.headers,
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => {
          body += chunk;
        });
        response.on('end', () => {
          const status = response.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            text: async () => body,
          } as unknown as Response);
        });
      },
    );

    request.on('error', (error) => reject(error));
    init.signal?.addEventListener('abort', () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      request.destroy(abortError);
    });
    if (init.body !== undefined) {
      request.write(init.body);
    }
    request.end();
  });
}

describeE2E('ShoppingApi + живой бэкенд', () => {
  const api = new ShoppingApi({ baseUrl: baseUrl ?? 'http://127.0.0.1:8000', timeoutMs: 20_000 });
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const emailA = `e2e-parent-${stamp}@example.com`;
  const emailB = `e2e-child-${stamp}@example.com`;
  const password = 'password123';

  const originalFetch = global.fetch;
  let tokenA = '';
  let tokenB = '';
  let listId = '';
  let itemId = '';

  beforeAll(() => {
    global.fetch = nodeFetch as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('отвечает на /health', async () => {
    await expect(api.health()).resolves.toMatchObject({ status: 'ok' });
  });

  it('регистрирует двух пользователей', async () => {
    const a = await api.register(emailA, password);
    const b = await api.register(emailB, password);
    expect(a.token_type).toBe('bearer');
    expect(a.access_token.length).toBeGreaterThan(20);
    tokenA = a.access_token;
    tokenB = b.access_token;
  });

  it('не даёт зарегистрироваться повторно', async () => {
    const error = await api.register(emailA, password).catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
  });

  it('логинит и отклоняет неверный пароль', async () => {
    const login = await api.login(emailA, password);
    expect(login.access_token).toBeTruthy();
    await expect(api.login(emailA, 'wrong-password-1')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('создаёт список и товары', async () => {
    const list = await api.createList(tokenA, 'E2E test list');
    expect(list.items).toHaveLength(0);
    listId = list.id;

    const item = await api.addItem(tokenA, listId, { name: 'Milk', quantity: 2, unit: 'шт', price: 89.9 });
    expect(item).toMatchObject({ name: 'Milk', quantity: 2, price: 89.9, checked: false });
    itemId = item.id;

    await api.addItem(tokenA, listId, { name: 'Bread', quantity: 1.5, unit: 'кг', price: 60 });

    const lists = await api.getLists(tokenA);
    const stored = lists.find((entry) => entry.id === listId);
    expect(stored?.items).toHaveLength(2);
    // sub из JWT совпадает с owner_id — на этом строится разделение «мои / общие».
    expect(stored?.owner_id).toBe(currentUserId(tokenA));
  });

  it('обновляет товар и переключает отметку', async () => {
    const patched = await api.updateItem(tokenA, listId, itemId, { name: 'Milk 2.5%', quantity: 3 });
    expect(patched).toMatchObject({ name: 'Milk 2.5%', quantity: 3 });

    const on = await api.toggleItem(tokenA, listId, itemId);
    expect(on.checked).toBe(true);
    const off = await api.toggleItem(tokenA, listId, itemId);
    expect(off.checked).toBe(false);

    const total = await api.getTotal(tokenA, listId);
    expect(total.total).toBeCloseTo(3 * 89.9 + 1.5 * 60, 2);
  });

  it('делится списком с другим пользователем', async () => {
    await expect(api.shareList(tokenA, listId, emailB)).resolves.toMatchObject({ shared: true });

    const listsB = await api.getLists(tokenB);
    const shared = listsB.find((entry) => entry.id === listId);
    expect(shared).toBeDefined();
    expect(shared?.owner_id).toBe(currentUserId(tokenA));
    expect(shared?.owner_id).not.toBe(currentUserId(tokenB));

    const patched = await api.updateItem(tokenB, listId, itemId, { checked: true });
    expect(patched.checked).toBe(true);
  });

  it('запрещает участнику удалять список и делиться им', async () => {
    await expect(api.shareList(tokenB, listId, emailA)).rejects.toMatchObject({ status: 403 });
    await expect(api.deleteList(tokenB, listId)).rejects.toMatchObject({ status: 403 });
  });

  it('удаляет товар и список владельцем', async () => {
    await api.deleteItem(tokenA, listId, itemId);
    const lists = await api.getLists(tokenA);
    expect(lists.find((entry) => entry.id === listId)?.items).toHaveLength(1);

    await api.deleteList(tokenA, listId);
    const after = await api.getLists(tokenA);
    expect(after.find((entry) => entry.id === listId)).toBeUndefined();
  });

  it('отклоняет запросы с недействительным токеном', async () => {
    await expect(api.getLists('invalid.token.value')).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
