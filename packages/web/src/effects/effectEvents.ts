import type { SeqEvent, Suit } from '@balik/shared';
import { suitName } from '../cards/skin';
import type { CueContext, Display } from '../table/display';

export const EFFECT_KINDS = ['play', 'draw', 'suit', 'skip', 'reverse', 'penalty', 'pause', 'danger', 'win'] as const;
export type EffectKind = typeof EFFECT_KINDS[number];

/** Public presentation data only. Never infer or inspect an opponent's hidden cards. */
export interface EffectEvent {
  kind: EffectKind;
  suit?: Suit;
  sourcePlayerId?: string;
  targetPlayerId?: string;
  sourceName?: string;
  targetName?: string;
  cardId?: string;
  count?: number;
  direction?: 1 | -1;
  label: string;
}

export interface EffectInstance {
  kind: 'effect';
  id: number;
  event: EffectEvent;
  /** Frozen at dispatch: a later director step cannot retime a running effect. */
  scale: number;
  ttl: number;
}

/** Adapter runs against the display before/after the corresponding cue, not a future snapshot. */
export function effectsForGameEvent(ev: SeqEvent, before: Display, after: Display, ctx: CueContext): EffectEvent[] {
  const name = (id: string) => id === ctx.me ? 'Ty' : ctx.name(id);
  const suit = after.activeSuit ?? undefined;
  switch (ev.type) {
    case 'cardPlayed': {
      const source = { sourcePlayerId: ev.playerId, sourceName: name(ev.playerId), suit: ev.card.suit, cardId: ev.card.id };
      const effects: EffectEvent[] = [{ ...source, kind: 'play', label: `${name(ev.playerId)} · ${ev.card.rank} ${suitName(ev.card.suit)}` }];
      if (ev.card.rank === 'A') effects.push({ ...source, kind: 'pause', label: 'Eso · přerušení tahu' });
      if ((before.hands[ev.playerId]?.length ?? 0) > 1 && after.hands[ev.playerId]?.length === 1) {
        effects.push({ ...source, kind: 'danger', targetPlayerId: ev.playerId, targetName: name(ev.playerId), label: `${name(ev.playerId)} · poslední karta` });
      }
      return effects;
    }
    case 'cardsDrawn':
      return ev.count > 0 ? [{ kind: 'draw', suit, targetPlayerId: ev.playerId, targetName: name(ev.playerId), count: ev.count, label: `${name(ev.playerId)} · +${ev.count} do ruky` }] : [];
    case 'suitChanged':
      return [{ kind: 'suit', suit: ev.suit, sourcePlayerId: ev.playerId, sourceName: name(ev.playerId), label: `Hraje se ${suitName(ev.suit)}` }];
    case 'drawPenalty': {
      const sourcePlayerId = before.lastPlayedBy ?? undefined;
      const sourceName = sourcePlayerId ? name(sourcePlayerId) : 'Sedmička';
      return [{ kind: 'penalty', suit, sourcePlayerId, sourceName, targetPlayerId: ev.targetPlayerId, targetName: name(ev.targetPlayerId), count: ev.total, label: `${sourceName} → ${name(ev.targetPlayerId)} · +${ev.total}` }];
    }
    case 'turnSkipped':
      return [{ kind: 'skip', suit, sourcePlayerId: ev.byPlayerId, sourceName: name(ev.byPlayerId), targetPlayerId: ev.playerId, targetName: name(ev.playerId), label: `${name(ev.playerId)} · přeskočení tahu` }];
    case 'roundWon':
      return [{ kind: 'win', suit, targetPlayerId: ev.playerId, targetName: name(ev.playerId), label: `${name(ev.playerId)} · vítězství` }];
    default:
      return [];
  }
}
