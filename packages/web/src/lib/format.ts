const AVATAR_COLORS = ['#f97362', '#f5a524', '#36c48f', '#4f9dff', '#a78bfa', '#ec6fb1', '#2fc4c4', '#e5c04b'];

export function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

/** Czech plural: 1 karta, 2–4 karty, 0/5+ karet. */
export function cardsWord(n: number): string {
  if (n === 1) return 'karta';
  if (n >= 2 && n <= 4) return 'karty';
  return 'karet';
}
