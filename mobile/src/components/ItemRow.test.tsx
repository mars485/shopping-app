import { fireEvent, screen } from '@testing-library/react-native';

import type { Item } from '../api/types';
import { renderWithTheme } from '../test-utils';
import { ItemRow } from './ItemRow';

const baseItem: Item = {
  id: 'item-1',
  name: 'Молоко 3,2%',
  quantity: 2,
  unit: 'шт',
  price: 89.9,
  checked: false,
};

describe('ItemRow', () => {
  it('показывает название, количество и сумму по строке', async () => {
    await renderWithTheme(<ItemRow item={baseItem} onToggle={jest.fn()} onEdit={jest.fn()} />);

    expect(screen.getByText('Молоко 3,2%')).toBeOnTheScreen();
    expect(screen.getByText(/2 шт · 89,90/)).toBeOnTheScreen();
    expect(screen.getByText(/179,80/)).toBeOnTheScreen();
  });

  it('для товара без цены показывает прочерк', async () => {
    await renderWithTheme(<ItemRow item={{ ...baseItem, price: 0 }} onToggle={jest.fn()} onEdit={jest.fn()} />);

    expect(screen.getByText('—')).toBeOnTheScreen();
    expect(screen.queryByText(/0,00/)).toBeNull();
  });

  it('переключает отметку по нажатию на строку', async () => {
    const onToggle = jest.fn();
    await renderWithTheme(<ItemRow item={baseItem} onToggle={onToggle} onEdit={jest.fn()} />);

    await fireEvent.press(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('открывает редактор по кнопке с тремя точками', async () => {
    const onEdit = jest.fn();
    await renderWithTheme(<ItemRow item={baseItem} onToggle={jest.fn()} onEdit={onEdit} />);

    await fireEvent.press(screen.getByLabelText('Изменить Молоко 3,2%'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('отражает отмеченное состояние для скринридера', async () => {
    await renderWithTheme(
      <ItemRow item={{ ...baseItem, checked: true }} onToggle={jest.fn()} onEdit={jest.fn()} />,
    );

    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});
