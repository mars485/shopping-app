import { currentUserId, decodeToken, isTokenExpired } from './jwt';

function base64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeToken(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('decodeToken', () => {
  it('достаёт payload без проверки подписи', () => {
    const token = makeToken({ sub: 'user-123', exp: 1_900_000_000 });
    expect(decodeToken(token)).toEqual({ sub: 'user-123', exp: 1_900_000_000 });
    expect(currentUserId(token)).toBe('user-123');
  });

  it('не падает на мусоре', () => {
    expect(decodeToken('')).toBeNull();
    expect(decodeToken('не-токен')).toBeNull();
    expect(decodeToken('a.b.c')).toBeNull();
    expect(decodeToken(undefined)).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('сравнивает exp с текущим временем', () => {
    const expired = makeToken({ sub: 'u', exp: Math.floor(Date.now() / 1000) - 60 });
    const valid = makeToken({ sub: 'u', exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(isTokenExpired(expired)).toBe(true);
    expect(isTokenExpired(valid)).toBe(false);
  });

  it('токен без exp не считается истёкшим', () => {
    expect(isTokenExpired(makeToken({ sub: 'u' }))).toBe(false);
  });
});
