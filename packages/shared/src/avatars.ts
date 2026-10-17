/** Public cosmetic ids only. Assets and rendering belong to the client. */
export const PLAYER_AVATAR_IDS = [
  'vega',
  'bruno',
  'jiskra',
  'sova',
  'sibr',
  'mlzka',
  'sotek',
  'luna',
  'nula',
  'kocour',
  'kika',
  'rys',
  'vedma',
  'zefyr',
  'gambit',
  'mina',
] as const;
export const BOT_AVATAR_IDS = ['bot-rudla', 'bot-bozka', 'bot-cenek', 'bot-kveta'] as const;
export const AVATAR_IDS = [...PLAYER_AVATAR_IDS, ...BOT_AVATAR_IDS] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];
export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === 'string' && (AVATAR_IDS as readonly string[]).includes(value);
}
/** Stable fallback for legacy rooms; never depends on private game data. */
export function defaultAvatarId(playerId: string, bot = false): AvatarId {
  let hash = 0;
  for (const char of playerId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const ids = bot ? BOT_AVATAR_IDS : PLAYER_AVATAR_IDS;
  return ids[hash % ids.length]!;
}
