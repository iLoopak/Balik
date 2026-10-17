import { z } from 'zod';
import { SUITS } from './cards';
import { EMOTE_IDS } from './social';
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

export const gameActionSchema = z.union([prsiActionSchema, z.object({ type: z.literal('collect') })]);

export const clientMessageSchema = z.discriminatedUnion('t', [
  z.object({ t: z.literal('emote'), emote: z.enum(EMOTE_IDS) }),
  z.object({ t: z.literal('lobby') }),
  /** `bots` > 0 = single player: the room gets computer opponents and starts right away. */
  z.object({ t: z.literal('create'), token, name, gameId: z.enum(['prsi', 'sedma']).optional(), sedmaBonus: z.union([z.literal(0), z.literal(10)]).optional(), bots: z.number().int().min(0).max(MAX_BOTS).optional() }),
  z.object({ t: z.literal('addBot') }),
  z.object({ t: z.literal('removeBot'), playerId: z.string().max(32) }),
  z.object({ t: z.literal('join'), token, name, code }),
  z.object({ t: z.literal('start') }),
  z.object({ t: z.literal('act'), baseSeq: z.number().int().nonnegative(), action: gameActionSchema }),
  z.object({ t: z.literal('rematch') }),
  z.object({ t: z.literal('leave') }),
  z.object({ t: z.literal('ping') }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;
