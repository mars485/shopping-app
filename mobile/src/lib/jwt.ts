export type TokenPayload = {
  sub?: string;
  exp?: number;
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Decode(input: string): string {
  const globalAtob = (globalThis as { atob?: (value: string) => string }).atob;
  if (typeof globalAtob === 'function') {
    return globalAtob(input);
  }
  // Минимальный fallback для сред без atob (старые Hermes).
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const char of input.replace(/=+$/, '')) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) {
      continue;
    }
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

/** Разбирает payload JWT без проверки подписи — нужен только `sub` и `exp`. */
export function decodeToken(token: string | null | undefined): TokenPayload | null {
  if (!token) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length < 2 || !parts[1]) {
    return null;
  }
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(base64Decode(padded)) as TokenPayload;
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

export function currentUserId(token: string | null | undefined): string | null {
  const payload = decodeToken(token);
  return typeof payload?.sub === 'string' ? payload.sub : null;
}

export function isTokenExpired(token: string | null | undefined, skewMs = 0): boolean {
  const payload = decodeToken(token);
  if (!payload || typeof payload.exp !== 'number') {
    return false;
  }
  return payload.exp * 1000 - skewMs <= Date.now();
}
