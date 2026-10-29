import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithTheme } from '../test-utils';
import { ItemEditorSheet } from './ItemEditorSheet';

describe('ItemEditorSheet', () => {
  it('передаёт введённые значения в onSubmit и закрывается', async () => {
    const onSubmit = jest.fn(async () => undefined);
    const onClose = jest.fn();

    await renderWithTheme(<ItemEditorSheet visible onClose={onClose} onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByTestId('item-name'), 'Молоко 3,2%');
    await fireEvent.changeText(screen.getByTestId('item-quantity'), '2,5');
    await fireEvent.changeText(screen.getByTestId('item-price'), '89,90');
    await fireEvent.press(screen.getByTestId('item-submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Молоко 3,2%',
        quantity: 2.5,
        unit: 'шт',
        price: 89.9,
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('показывает ошибку вместо отправки при пустом названии', async () => {
    const onSubmit = jest.fn(async () => undefined);
    const onClose = jest.fn();

    await renderWithTheme(<ItemEditorSheet visible onClose={onClose} onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByTestId('item-name'), '   ');
    await fireEvent.press(screen.getByTestId('item-submit'));

    expect(await screen.findByTestId('item-name-error')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('показывает количество и цену при редактировании существующего товара', async () => {
    await renderWithTheme(
      <ItemEditorSheet
        visible
        editableItem={{
          id: 'item-1',
          name: 'Хлеб',
          quantity: 2,
          unit: 'кг',
          price: 60,
          checked: false,
        }}
        onClose={jest.fn()}
        onSubmit={jest.fn(async () => undefined)}
      />,
    );

    expect(screen.getByTestId('item-quantity')).toHaveDisplayValue('2');
    expect(screen.getByTestId('item-price')).toHaveDisplayValue('60');
  });
});
