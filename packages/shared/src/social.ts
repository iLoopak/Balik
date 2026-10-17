export const EMOTES = {
  gg: 'GG', ouch: 'Au!', phew: 'Uf', sure: 'Tak určitě', nice: 'Hezky!', again: 'Ještě jednu!',
} as const;
export type EmoteId = keyof typeof EMOTES;
export const EMOTE_IDS = Object.keys(EMOTES) as EmoteId[];
export const EMOTE_COOLDOWN_MS = 2500;
export const EMOTE_TTL_MS = 3200;
export interface EmoteMessage {
  t: 'emote'; id: string; code: string; playerId: string; emote: EmoteId; at: number; expiresAt: number;
}
export function emoteAllowed(last: number | null, now: number): boolean {
  return last === null || now - last >= EMOTE_COOLDOWN_MS;
}
