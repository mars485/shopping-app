import { ApiClient } from './client';
import type {
  AuthResponse,
  HealthResponse,
  Item,
  ItemInput,
  ItemPatchInput,
  ShareResponse,
  ShoppingList,
  TotalResponse,
} from './types';

/** Все эндпоинты соответствуют backend/app/main.py и продовому /openapi.json. */
export class ShoppingApi {
  readonly client: ApiClient;

  constructor(config: { baseUrl: string; timeoutMs?: number }) {
    this.client = new ApiClient(config);
  }

  get baseUrl(): string {
    return this.client.baseUrl;
  }

  health(): Promise<HealthResponse> {
    return this.client.request<HealthResponse>('/health');
  }

  register(email: string, password: string): Promise<AuthResponse> {
    return this.client.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { email, password },
    });
  }

  login(email: string, password: string): Promise<AuthResponse> {
    return this.client.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  getLists(token: string): Promise<ShoppingList[]> {
    return this.client.request<ShoppingList[]>('/lists', { token });
  }

  createList(token: string, name: string): Promise<ShoppingList> {
    return this.client.request<ShoppingList>('/lists', { method: 'POST', token, body: { name } });
  }

  deleteList(token: string, listId: string): Promise<void> {
    return this.client.request<void>(`/lists/${listId}`, { method: 'DELETE', token });
  }

  shareList(token: string, listId: string, email: string): Promise<ShareResponse> {
    return this.client.request<ShareResponse>(`/lists/${listId}/share`, {
      method: 'POST',
      token,
      body: { email },
    });
  }

  addItem(token: string, listId: string, input: ItemInput): Promise<Item> {
    return this.client.request<Item>(`/lists/${listId}/items`, { method: 'POST', token, body: input });
  }

  updateItem(token: string, listId: string, itemId: string, patch: ItemPatchInput): Promise<Item> {
    return this.client.request<Item>(`/lists/${listId}/items/${itemId}`, {
      method: 'PATCH',
      token,
      body: patch,
    });
  }

  toggleItem(token: string, listId: string, itemId: string): Promise<Item> {
    return this.client.request<Item>(`/lists/${listId}/items/${itemId}/toggle`, {
      method: 'PATCH',
      token,
    });
  }

  deleteItem(token: string, listId: string, itemId: string): Promise<void> {
    return this.client.request<void>(`/lists/${listId}/items/${itemId}`, { method: 'DELETE', token });
  }

  getTotal(token: string, listId: string): Promise<TotalResponse> {
    return this.client.request<TotalResponse>(`/lists/${listId}/total`, { token });
  }
}

export function createApi(baseUrl: string): ShoppingApi {
  return new ShoppingApi({ baseUrl });
}
