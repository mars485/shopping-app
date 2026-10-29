import { formatItemMeta, formatListSubtitle, formatMoney, formatQuantity, formatRelativeSync, initials, listStats, pluralRu, round2 } from './format';
import type { Item, ShoppingList } from '../api/types';

function item(partial: Partial<Item>): Item {
  return {
    id: 'item-1',
    name: 'Молоко',
    quantity: 2,
    unit: 'шт',
    price: 89.9,
    checked: false,
    ...partial,
  };
}

describe('formatMoney', () => {
  it('разделяет тысячи и показывает копейки', () => {
    expect(formatMoney(1234.5)).toBe('1\u00A0234,50\u00A0₽');
  });

  it('не добавляет копейки для целых сумм', () => {
    expect(formatMoney(0)).toBe('0\u00A0₽');
    expect(formatMoney(1500)).toBe('1\u00A0500\u00A0₽');
  });

  it('округляет до копеек и переживает мусор на входе', () => {
    expect(formatMoney(10.999)).toBe('11\u00A0₽');
    expect(formatMoney(Number.NaN)).toBe('0\u00A0₽');
  });
});

describe('formatQuantity', () => {
  it('убирает лишние нули и ставит запятую', () => {
    expect(formatQuantity(2)).toBe('2');
    expect(formatQuantity(1.5)).toBe('1,5');
    expect(formatQuantity(0.25)).toBe('0,25');
  });
});

describe('formatItemMeta', () => {
  it('показывает количество и цену', () => {
    expect(formatItemMeta(item({ quantity: 3, unit: 'кг', price: 120 }))).toBe('3 кг · 120\u00A0₽');
  });

  it('скрывает нулевую цену', () => {
    expect(formatItemMeta(item({ price: 0 }))).toBe('2 шт');
  });
});

describe('pluralRu', () => {
  it('склоняет по-русски', () => {
    expect(pluralRu(1, 'item')).toBe('1 товар');
    expect(pluralRu(3, 'item')).toBe('3 товара');
    expect(pluralRu(5, 'item')).toBe('5 товаров');
    expect(pluralRu(11, 'item')).toBe('11 товаров');
    expect(pluralRu(21, 'item')).toBe('21 товар');
    expect(pluralRu(104, ['список', 'списка', 'списков'])).toBe('104 списка');
  });
});

describe('listStats', () => {
  const list: ShoppingList = {
    id: 'list-1',
    name: 'Продукты',
    owner_id: 'user-1',
    items: [
      item({ id: 'a', quantity: 2, price: 100, checked: true }),
      item({ id: 'b', quantity: 1, price: 50.5, checked: false }),
      item({ id: 'c', quantity: 3, price: 0, checked: true }),
    ],
  };

  it('считает суммы и прогресс', () => {
    const stats = listStats(list);
    expect(stats.totalCount).toBe(3);
    expect(stats.checkedCount).toBe(2);
    expect(stats.remaining).toBe(1);
    expect(stats.sum).toBe(250.5);
    expect(stats.checkedSum).toBe(200);
    expect(stats.progress).toBeCloseTo(2 / 3);
  });

  it('не делит на ноль в пустом списке', () => {
    expect(listStats({ items: [] }).progress).toBe(0);
  });

  it('описывает список текстом', () => {
    expect(formatListSubtitle({ items: [] })).toBe('Пусто — добавьте первый товар');
    expect(formatListSubtitle(list)).toBe('3 позиции · осталось 1');
    expect(formatListSubtitle({ items: [item({ checked: true })] })).toBe('1 позиция · всё куплено');
  });
});

describe('formatRelativeSync', () => {
  const now = new Date('2026-10-29T12:00:00Z').getTime();

  it('описывает свежие обновления', () => {
    expect(formatRelativeSync(null, now)).toBe('не синхронизировано');
    expect(formatRelativeSync(now - 5_000, now)).toBe('только что');
    expect(formatRelativeSync(now - 5 * 60_000, now)).toBe('5 мин назад');
  });

  it('показывает время для сегодняшних и дату для старых', () => {
    const today = new Date('2026-10-29T09:30:00');
    expect(formatRelativeSync(today.getTime(), now)).toMatch(/^\d{2}:\d{2}$/);
    const older = new Date('2026-09-01T09:30:00');
    expect(formatRelativeSync(older.getTime(), now)).toBe('01.09');
  });
});

describe('initials и round2', () => {
  it('делает инициалы из e-mail', () => {
    expect(initials('anna.k@gmail.com')).toBe('AK');
    expect(initials('ivan_petrov@mail.ru')).toBe('IP');
    expect(initials('family@example.com')).toBe('FA');
    expect(initials('@example.com')).toBe('?');
  });

  it('округляет деньги без плавающих ошибок', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(2.005)).toBe(2.01);
  });
});
