const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email) {
    return 'Введите e-mail';
  }
  if (email.length > 255 || !EMAIL_RE.test(email)) {
    return 'Похоже, e-mail указан неверно';
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) {
    return 'Введите пароль';
  }
  if (value.length < 8) {
    return 'Пароль должен быть не короче 8 символов';
  }
  if (value.length > 128) {
    return 'Пароль слишком длинный';
  }
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) {
    return 'Повторите пароль';
  }
  return password === confirm ? null : 'Пароли не совпадают';
}

export function validateListName(value: string): string | null {
  const name = value.trim();
  if (!name) {
    return 'Введите название списка';
  }
  return name.length > 100 ? 'Максимум 100 символов' : null;
}

export function validateItemName(value: string): string | null {
  const name = value.trim();
  if (!name) {
    return 'Введите название товара';
  }
  return name.length > 120 ? 'Максимум 120 символов' : null;
}

/** "12,5" | "12.5" → 12.5; пустая строка → null. */
export function parseDecimalInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.').replace(/\s/g, '');
  if (!normalized) {
    return null;
  }
  if (!/^\d*\.?\d*$/.test(normalized)) {
    return Number.NaN;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function validatePrice(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = parseDecimalInput(value);
  if (parsed === null) {
    return null;
  }
  if (Number.isNaN(parsed)) {
    return 'Только цифры, например 89,90';
  }
  if (parsed < 0) {
    return 'Цена не может быть отрицательной';
  }
  if (parsed > 999999999) {
    return 'Слишком большая цена';
  }
  return null;
}

export function validateQuantity(value: string): string | null {
  if (!value.trim()) {
    return 'Укажите количество';
  }
  const parsed = parseDecimalInput(value);
  if (parsed === null || Number.isNaN(parsed)) {
    return 'Только цифры, например 1,5';
  }
  if (parsed <= 0) {
    return 'Количество должно быть больше нуля';
  }
  if (parsed > 999999999) {
    return 'Слишком большое количество';
  }
  return null;
}
