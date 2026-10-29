import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { ShoppingApi } from '../api/shopping';
import { AuthProvider } from '../state/auth';
import { renderWithTheme } from '../test-utils';
import SignInScreen from '../app/sign-in';

const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

function fakeApi(overrides: Partial<ShoppingApi> = {}): ShoppingApi {
  return {
    login: jest.fn(async () => ({ access_token: 'token-1', token_type: 'bearer' })),
    register: jest.fn(async () => ({ access_token: 'token-2', token_type: 'bearer' })),
    getLists: jest.fn(async () => []),
    ...overrides,
  } as unknown as ShoppingApi;
}

describe('SignInScreen', () => {
  beforeEach(() => {
    mockRouter.replace.mockClear();
    mockRouter.push.mockClear();
  });

  it('показывает поля входа', async () => {
    await renderWithTheme(
      <AuthProvider api={fakeApi()}>
        <SignInScreen />
      </AuthProvider>,
    );

    expect(screen.getByTestId('signin-email')).toBeOnTheScreen();
    expect(screen.getByTestId('signin-password')).toBeOnTheScreen();
    expect(screen.getByTestId('signin-submit')).toBeOnTheScreen();
  });

  it('не отправляет форму с пустыми полями', async () => {
    const api = fakeApi();
    await renderWithTheme(
      <AuthProvider api={api}>
        <SignInScreen />
      </AuthProvider>,
    );

    await fireEvent.press(screen.getByTestId('signin-submit'));

    expect(api.login).not.toHaveBeenCalled();
    expect(screen.getByText('Введите e-mail')).toBeOnTheScreen();
  });

  it('показывает ошибку сервера при неверном пароле', async () => {
    const api = fakeApi({
      login: jest.fn(async () => {
        throw new Error('Неверный e-mail или пароль');
      }),
    });

    await renderWithTheme(
      <AuthProvider api={api}>
        <SignInScreen />
      </AuthProvider>,
    );

    await fireEvent.changeText(screen.getByTestId('signin-email'), 'family@example.com');
    await fireEvent.changeText(screen.getByTestId('signin-password'), 'password123');
    await fireEvent.press(screen.getByTestId('signin-submit'));

    await waitFor(() => expect(screen.getByText('Неверный e-mail или пароль')).toBeOnTheScreen());
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('уводит на списки после успешного входа', async () => {
    const api = fakeApi();

    await renderWithTheme(
      <AuthProvider api={api}>
        <SignInScreen />
      </AuthProvider>,
    );

    await fireEvent.changeText(screen.getByTestId('signin-email'), ' Family@Example.com ');
    await fireEvent.changeText(screen.getByTestId('signin-password'), 'password123');
    await fireEvent.press(screen.getByTestId('signin-submit'));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/lists'));
    expect(api.login).toHaveBeenCalledWith('family@example.com', 'password123');
  });
});
