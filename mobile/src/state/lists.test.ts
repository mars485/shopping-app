import type { Item, ShoppingList } from '../api/types';
import { initialListsState, listsReducer, type ListsState } from './lists';

function item(partial: Partial<Item> = {}): Item {
  return { id: 'item-1', name: 'Хлеб', quantity: 1, unit: 'шт', price: 50, checked: false, ...partial };
}

function list(partial: Partial<ShoppingList> = {}): ShoppingList {
  return { id: 'list-1', name: 'Продукты', owner_id: 'user-1', items: [], ...partial };
}

function ready(lists: ShoppingList[]): ListsState {
  return listsReducer(initialListsState, { type: 'loadSucceeded', lists, lastSync: 1_000 });
}

describe('listsReducer', () => {
  it('загружает списки и снимает флаги', () => {
    const state = listsReducer({ ...initialListsState, refreshing: true, offline: true, error: 'x' }, {
      type: 'loadSucceeded',
      lists: [list()],
      lastSync: 42,
    });

    expect(state.status).toBe('ready');
    expect(state.refreshing).toBe(false);
    expect(state.offline).toBe(false);
    expect(state.error).toBeNull();
    expect(state.lastSync).toBe(42);
    expect(state.lists).toHaveLength(1);
  });

  it('показывает кэш до ответа сервера', () => {
    const state = listsReducer(initialListsState, { type: 'hydrated', lists: [list()], lastSync: 7 });
    expect(state.status).toBe('ready');
    expect(state.lists).toHaveLength(1);
    expect(state.lastSync).toBe(7);
  });

  it('не теряет кэш при ошибке сети', () => {
    const cached = listsReducer(initialListsState, { type: 'hydrated', lists: [list()], lastSync: 7 });
    const failed = listsReducer(cached, {
      type: 'errorSet',
      error: 'Нет соединения с сервером',
      offline: true,
    });

    expect(failed.lists).toHaveLength(1);
    expect(failed.offline).toBe(true);
    expect(failed.error).toBe('Нет соединения с сервером');
    expect(failed.status).toBe('ready');
  });

  it('добавляет список в начало', () => {
    const state = listsReducer(ready([list({ id: 'old' })]), { type: 'listAdded', list: list({ id: 'new' }) });
    expect(state.lists.map((entry) => entry.id)).toEqual(['new', 'old']);
  });

  it('удаляет список', () => {
    const state = listsReducer(ready([list(), list({ id: 'list-2' })]), { type: 'listRemoved', listId: 'list-1' });
    expect(state.lists.map((entry) => entry.id)).toEqual(['list-2']);
  });

  it('оптимистично переключает и откатывает отметку', () => {
    const start = ready([list({ items: [item({ checked: false })] })]);
    const optimistic = listsReducer(start, {
      type: 'itemPatched',
      listId: 'list-1',
      itemId: 'item-1',
      patch: { checked: true },
    });
    expect(optimistic.lists[0].items[0].checked).toBe(true);

    const rolledBack = listsReducer(optimistic, {
      type: 'itemPatched',
      listId: 'list-1',
      itemId: 'item-1',
      patch: { checked: false },
    });
    expect(rolledBack.lists[0].items[0].checked).toBe(false);
  });

  it('заменяет список целиком при откате', () => {
    const start = ready([list({ items: [item()] })]);
    const removed = listsReducer(start, { type: 'itemRemoved', listId: 'list-1', itemId: 'item-1' });
    expect(removed.lists[0].items).toHaveLength(0);

    const restored = listsReducer(removed, { type: 'listsReplaced', lists: start.lists });
    expect(restored.lists[0].items).toHaveLength(1);
  });

  it('обновляет товар по ответу сервера', () => {
    const start = ready([list({ items: [item()] })]);
    const updated = listsReducer(start, {
      type: 'itemUpdated',
      listId: 'list-1',
      item: item({ name: 'Батон', quantity: 2, checked: true }),
    });
    expect(updated.lists[0].items[0]).toMatchObject({ name: 'Батон', quantity: 2, checked: true });
  });

  it('добавляет товар и не дублирует его', () => {
    const start = ready([list()]);
    const once = listsReducer(start, { type: 'itemAdded', listId: 'list-1', item: item() });
    const twice = listsReducer(once, { type: 'itemAdded', listId: 'list-1', item: item({ name: 'Молоко' }) });
    expect(twice.lists[0].items).toHaveLength(1);
    expect(twice.lists[0].items[0].name).toBe('Молоко');
  });

  it('сбрасывает состояние при выходе', () => {
    const state = listsReducer(ready([list()]), { type: 'reset' });
    expect(state).toEqual(initialListsState);
  });
});
