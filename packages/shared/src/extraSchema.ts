import { z } from 'zod';
/** Client action validation for the games added after Lhář (server-only, ships zod). */
const cardId = z.string().min(1).max(16);
export const extraActionSchemas = [
  z.object({ type: z.literal('snapsPlay'), cardId, marriage: z.boolean().optional() }),
  z.object({ type: z.literal('snapsExchange') }),
  z.object({ type: z.literal('snapsClose') }),
] as const;
