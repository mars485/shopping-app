import { fireEvent, screen } from '@testing-library/react-native';

import type { ShoppingList } from '../api/types';
import { renderWithTheme } from '../test-utils';
import { ListCard } from './ListCard';

const list: ShoppingList = {
  id: 'list-1',
  name: 'Продукты',
  owner_id: 'user-1',
  items: [
    { id: 'a', name: 'Молоко', quantity: 2, unit: 'шт', price: 100, checked: true },
    { id: 'b', name: 'Хлеб', quantity: 1, unit: 'шт', price: 50, checked: false },
    { id: 'c', name: 'Сыр', quantity: 1, unit: 'кг', price: 600, checked: false },
  ],
};

describe('ListCard', () => {
  it('показывает название, прогресс и сумму', async () => {
    await renderWithTheme(<ListCard list={list} onPress={jest.fn()} />);

    expect(screen.getByText('Продукты')).toBeOnTheScreen();
    expect(screen.getByText('1 из 3 куплено')).toBeOnTheScreen();
    expect(screen.getByText(/850 ₽/)).toBeOnTheScreen();
    expect(screen.getByText(/3 позиции · осталось 2/)).toBeOnTheScreen();
  });

  it('открывает список по нажатию', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<ListCard list={list} onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('помечает общий список', async () => {
    await renderWithTheme(<ListCard list={list} onPress={jest.fn()} shared />);
    expect(screen.getByText('Общий')).toBeOnTheScreen();
  });

  it('не показывает бейдж для собственного списка', async () => {
    await renderWithTheme(<ListCard list={list} onPress={jest.fn()} />);
    expect(screen.queryByText('Общий')).toBeNull();
  });

  it('описывает пустой список', async () => {
    await renderWithTheme(<ListCard list={{ ...list, items: [] }} onPress={jest.fn()} />);
    expect(screen.getByText('Пусто — добавьте первый товар')).toBeOnTheScreen();
    expect(screen.getByText('Нет товаров')).toBeOnTheScreen();
  });
});
