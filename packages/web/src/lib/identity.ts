// Local, account-less identity.
// The reconnect token is per tab (sessionStorage) so two windows of one browser are two players,
// while a page reload keeps the same seat. The display name is shared across tabs.

const TOKEN_KEY = 'balik.token';
const NAME_KEY = 'balik.name';

const ADJ = ['Rychlý', 'Tichý', 'Veselý', 'Chytrý', 'Hbitý', 'Bystrý', 'Klidný', 'Divoký'];
const NOUN = ['Jezevec', 'Sokol', 'Bobr', 'Mlok', 'Rys', 'Čáp', 'Jelen', 'Tchoř'];

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function randomToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let memoryToken: string | null = null;

export function getToken(): string {
  const stored = safe(() => sessionStorage.getItem(TOKEN_KEY), null);
  if (stored) return stored;
  memoryToken ??= randomToken();
  safe(() => sessionStorage.setItem(TOKEN_KEY, memoryToken!), undefined);
  return memoryToken;
}

export function getName(): string {
  const stored = safe(() => localStorage.getItem(NAME_KEY), null);
  if (stored) return stored;
  const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!;
  return `${pick(ADJ)} ${pick(NOUN)}`;
}

export function saveName(name: string): void {
  safe(() => localStorage.setItem(NAME_KEY, name.trim()), undefined);
}

/** Rooms this tab has already joined — reloads rejoin silently instead of asking for a name. */
export function rememberRoom(code: string): void {
  safe(() => sessionStorage.setItem(`balik.joined.${code}`, '1'), undefined);
}

export function hasJoinedRoom(code: string): boolean {
  return safe(() => sessionStorage.getItem(`balik.joined.${code}`) === '1', false);
}

export function forgetRoom(code: string): void {
  safe(() => sessionStorage.removeItem(`balik.joined.${code}`), undefined);
}
