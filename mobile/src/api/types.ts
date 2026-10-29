/** DTO бэкенда Shopping API (FastAPI). Источник истины: /openapi.json. */

export type Item = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  checked: boolean;
};

export type ShoppingList = {
  id: string;
  name: string;
  owner_id: string;
  items: Item[];
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
};

export type HealthResponse = {
  status: string;
};

export type TotalResponse = {
  total: number;
};

export type ShareResponse = {
  shared: boolean;
};

export type ItemInput = {
  name: string;
  quantity: number;
  unit: string;
  price: number;
};

export type ItemPatchInput = Partial<ItemInput> & { checked?: boolean };

export type Session = {
  token: string;
  email: string;
};
