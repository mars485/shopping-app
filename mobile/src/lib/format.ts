import type { Item, ShoppingList } from '../api/types';

const NBSP = '\u00A0';

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** 1234.5 → "1 234,50 ₽" */
export function formatMoney(value: number, currency = '₽'): string {
  const safe = Number.isFinite(value) ? round2(value) : 0;
  const [integer, fraction] = Math.abs(safe).toFixed(2).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const sign = safe < 0 ? '−' : '';
  const body = fraction === '00' ? grouped : `${grouped},${fraction}`;
  return currency ? `${sign}${body}${NBSP}${currency}` : `${sign}${body}`;
}

/** 2 → "2", 1.5 → "1,5", 0.25 → "0,25" */
export function formatQuantity(quantity: number): string {
  if (!Number.isFinite(quantity)) {
    return '0';
  }
  const rounded = Math.round(quantity * 1000) / 1000;
  return String(rounded).replace('.', ',');
}

/** "2 шт · 89,90 ₽" */
export function formatItemMeta(item: Pick<Item, 'quantity' | 'unit' | 'price'>): string {
  const parts = [`${formatQuantity(item.quantity)} ${item.unit}`];
  if (item.price > 0) {
    parts.push(formatMoney(item.price));
  }
  return parts.join(' · ');
}

const PLURALS: Record<string, [string, string, string]> = {
  item: ['товар', 'товара', 'товаров'],
  list: ['список', 'списка', 'списков'],
  position: ['позиция', 'позиции', 'позиций'],
};

/** Русская плюрализация: pluralRu(3, 'item') → "3 товара". */
export function pluralRu(count: number, key: keyof typeof PLURALS | [string, string, string]): string {
  const forms = Array.isArray(key) ? key : PLURALS[key];
  const abs = Math.abs(count) % 100;
  const tail = abs % 10;
  let word = forms[2];
  if (abs > 10 && abs < 20) {
    word = forms[2];
  } else if (tail === 1) {
    word = forms[0];
  } else if (tail >= 2 && tail <= 4) {
    word = forms[1];
  }
  return `${count} ${word}`;
}

/** "только что", "5 мин назад", "14:32", "05.03" */
export function formatRelativeSync(timestamp: number | null, now: number = Date.now()): string {
  if (!timestamp) {
    return 'не синхронизировано';
  }
  const diffSeconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (diffSeconds < 45) {
    return 'только что';
  }
  if (diffSeconds < 3600) {
    return `${Math.round(diffSeconds / 60)} мин назад`;
  }
  const date = new Date(timestamp);
  const today = new Date(now);
  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  if (sameDay) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** "anna.k@gmail.com" → "AK" */
export function initials(email: string): string {
  const name = email.split('@')[0] ?? '';
  const parts = name.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export type ListStats = {
  totalCount: number;
  checkedCount: number;
  remaining: number;
  progress: number;
  sum: number;
  checkedSum: number;
};

/** Сводка по списку: количество, прогресс и сумма в рублях. */
export function listStats(list: Pick<ShoppingList, 'items'>): ListStats {
  const totalCount = list.items.length;
  const checkedCount = list.items.filter((item) => item.checked).length;
  const sum = round2(list.items.reduce((acc, item) => acc + item.price * item.quantity, 0));
  const checkedSum = round2(
    list.items.filter((item) => item.checked).reduce((acc, item) => acc + item.price * item.quantity, 0),
  );
  return {
    totalCount,
    checkedCount,
    remaining: totalCount - checkedCount,
    progress: totalCount === 0 ? 0 : checkedCount / totalCount,
    sum,
    checkedSum,
  };
}

export function formatListSubtitle(list: Pick<ShoppingList, 'items'>): string {
  const stats = listStats(list);
  if (stats.totalCount === 0) {
    return 'Пусто — добавьте первый товар';
  }
  const positions = pluralRu(stats.totalCount, 'position');
  return stats.remaining === 0 ? `${positions} · всё куплено` : `${positions} · осталось ${stats.remaining}`;
}
