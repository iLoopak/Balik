import { z } from 'zod';
import { RANKS, SUITS } from './cards';
import { GAME_IDS } from './games';
import { EMOTE_IDS } from './social';
import { AVATAR_IDS } from './avatars';
import { MAX_BOTS, MAX_NAME_LENGTH, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './protocol';

// Runtime validation of client messages. Server-only entry point (`@balik/shared/schema`)
// so the web bundle doesn't ship zod.

const token = z.string().min(16).max(64).regex(/^[A-Za-z0-9_-]+$/);
const name = z.string().trim().min(1).max(MAX_NAME_LENGTH);
const code = z
  .string()
  .trim()
  .toUpperCase()
  .length(ROOM_CODE_LENGTH)
  .regex(new RegExp(`^[${ROOM_CODE_ALPHABET}]+$`));

export const prsiActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('play'), cardId: z.string().max(16), chosenSuit: z.enum(SUITS).optional() }),
  z.object({ type: z.literal('draw') }),
  z.object({ type: z.literal('pass') }),
]);

export const gameActionSchema = z.union([prsiActionSchema, z.object({ type: z.literal('collect') }),
  z.object({type:z.literal('lharPlay'),cardIds:z.array(z.string().min(1).max(16)).min(1).max(4).refine(ids=>new Set(ids).size===ids.length),declaredRank:z.enum(RANKS)}),
  z.object({type:z.literal('lharChallenge'),claimId:z.number().int().positive()}),
  z.object({type:z.literal('lharAccept'),claimId:z.number().int().positive()}),
]);

const round = z.number().int().nonnegative().optional();

export const clientMessageSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('profile'), avatarId: z.enum(AVATAR_IDS) }),
  z.object({ t: z.literal('vote'), ballotId: z.number().int().nonnegative(), gameId: z.enum(GAME_IDS) }),
  z.object({ t: z.literal('evening'), baseRevision: z.number().int().nonnegative(), action: z.enum(['between','openVote','close','confirm']), gameId: z.enum(GAME_IDS).optional() }).refine((m) => m.action !== 'confirm' || !!m.gameId),
  z.object({ t: z.literal('emote'), emote: z.enum(EMOTE_IDS) }),
  z.object({ t: z.literal('lobby'), round }),
  /** `bots` > 0 = single player: the room gets computer opponents and starts right away. */
  z.object({ t: z.literal('create'), token, name, avatarId: z.enum(AVATAR_IDS).optional(), gameId: z.enum(GAME_IDS).optional(), sedmaBonus: z.union([z.literal(0), z.literal(10)]).optional(), bots: z.number().int().min(0).max(MAX_BOTS).optional() }),
  z.object({ t: z.literal('addBot'), round }),
  z.object({ t: z.literal('removeBot'), round, playerId: z.string().min(1).max(64) }),
  z.object({ t: z.literal('join'), token, name, code, avatarId: z.enum(AVATAR_IDS).optional() }),
  z.object({ t: z.literal('start'), round }),
  z.object({ t: z.literal('act'), baseSeq: z.number().int().nonnegative(), action: gameActionSchema }),
  z.object({ t: z.literal('rematch'), round }),
  z.object({ t: z.literal('leave') }),
  z.object({ t: z.literal('ping') }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;
