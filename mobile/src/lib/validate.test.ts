import {
  normalizeEmail,
  parseDecimalInput,
  validateEmail,
  validateItemName,
  validateListName,
  validatePassword,
  validatePasswordConfirm,
  validatePrice,
  validateQuantity,
} from './validate';

describe('validateEmail', () => {
  it('требует e-mail', () => {
    expect(validateEmail('')).toBe('Введите e-mail');
    expect(validateEmail('   ')).toBe('Введите e-mail');
  });

  it('отклоняет некорректные адреса', () => {
    expect(validateEmail('user')).toBeTruthy();
    expect(validateEmail('user@')).toBeTruthy();
    expect(validateEmail('user@example')).toBeTruthy();
    expect(validateEmail('user @example.com')).toBeTruthy();
  });

  it('принимает нормальные адреса', () => {
    expect(validateEmail('user@example.com')).toBeNull();
    expect(validateEmail(' Family.Shopping@mail.ru ')).toBeNull();
  });

  it('нормализует регистр и пробелы', () => {
    expect(normalizeEmail('  Anna@Mail.RU ')).toBe('anna@mail.ru');
  });
});

describe('validatePassword', () => {
  it('проверяет длину', () => {
    expect(validatePassword('')).toBe('Введите пароль');
    expect(validatePassword('short')).toBe('Пароль должен быть не короче 8 символов');
    expect(validatePassword('12345678')).toBeNull();
    expect(validatePassword('a'.repeat(129))).toBe('Пароль слишком длинный');
  });

  it('сверяет подтверждение', () => {
    expect(validatePasswordConfirm('12345678', '87654321')).toBe('Пароли не совпадают');
    expect(validatePasswordConfirm('12345678', '12345678')).toBeNull();
    expect(validatePasswordConfirm('12345678', '')).toBe('Повторите пароль');
  });
});

describe('validateListName и validateItemName', () => {
  it('не пропускает пустые названия', () => {
    expect(validateListName('  ')).toBe('Введите название списка');
    expect(validateItemName('')).toBe('Введите название товара');
  });

  it('ограничивает длину', () => {
    expect(validateListName('a'.repeat(101))).toBe('Максимум 100 символов');
    expect(validateItemName('a'.repeat(121))).toBe('Максимум 120 символов');
    expect(validateListName('Продукты')).toBeNull();
  });
});

describe('parseDecimalInput', () => {
  it('понимает запятую и точку', () => {
    expect(parseDecimalInput('12,5')).toBe(12.5);
    expect(parseDecimalInput('12.5')).toBe(12.5);
    expect(parseDecimalInput(' 1 000 ')).toBe(1000);
    expect(parseDecimalInput('')).toBeNull();
  });

  it('возвращает NaN для нечисел', () => {
    expect(Number.isNaN(parseDecimalInput('12a') as number)).toBe(true);
    expect(Number.isNaN(parseDecimalInput('1,2,3') as number)).toBe(true);
  });
});

describe('validatePrice', () => {
  it('пустая цена допустима (0)', () => {
    expect(validatePrice('')).toBeNull();
  });

  it('отклоняет мусор и отрицательные значения', () => {
    expect(validatePrice('abc')).toBe('Только цифры, например 89,90');
    expect(validatePrice('-5')).toBeTruthy();
  });

  it('принимает дробные цены', () => {
    expect(validatePrice('89,90')).toBeNull();
    expect(validatePrice('0')).toBeNull();
  });
});

describe('validateQuantity', () => {
  it('требует положительное число', () => {
    expect(validateQuantity('')).toBe('Укажите количество');
    expect(validateQuantity('0')).toBe('Количество должно быть больше нуля');
    expect(validateQuantity('-1')).toBeTruthy();
    expect(validateQuantity('abc')).toBe('Только цифры, например 1,5');
  });

  it('принимает дробные значения', () => {
    expect(validateQuantity('1,5')).toBeNull();
    expect(validateQuantity('2')).toBeNull();
  });
});
