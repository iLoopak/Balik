import { type Card, type PrsiView, type SeqEvent, type Suit } from '@balik/shared';
import { rankLabel, suitName } from '../cards/skin';
import { effectsForGameEvent, type EffectEvent, type EffectInstance } from '../effects/effectEvents';
import type { SoundCue } from '../brand/feedback';
import { soundForEvent } from './feedback';

// The display state is what the table currently *shows*. It trails the server snapshot:
// every server event becomes a few cue steps that move the display one visual beat at a time,
// and once the queue drains the display is reconciled with the snapshot (the source of truth).

export type MoveKind = 'deal' | 'play' | 'draw' | 'penalty' | 'flipStart' | 'expand' | 'toDeck' | 'appear';

export type Spawn =
  | { kind: 'deck' }
  | { kind: 'seat'; playerId: string; index: number; count: number }
  | { kind: 'fade' };

export interface CardEntity {
  /** React key: the card id, or a placeholder for an opponent's hidden card. */
  key: string;
  /** null = face-down card whose identity this client must not know. */
  card: Card | null;
  move: MoveKind | null;
  /** Display step in which `move` happened; older moves settle with a neutral spring. */
  moveStamp: number;
  spawn: Spawn | null;
  /** Seconds of stagger for the current move. */
  delay: number;
  flash: { kind: 'penalty' | 'drawn'; id: number } | null;
}

export interface Display {
  stamp: number;
  me: string;
  order: string[];
  hands: Record<string, CardEntity[]>;
  discard: CardEntity[];
  /** Cards on their way back into the deck (reshuffle, new round). */
  outgoing: CardEntity[];
  drawCount: number;
  activeSuit: Suit | null;
  pendingDraw: number;
  currentPlayerId: string | null;
  drawnCardId: string | null;
  phase: 'idle' | 'playing' | 'finished';
  winnerId: string | null;
  /** Presentation attribution for chained penalties; never sent to the engine. */
  lastPlayedBy: string | null;
  /** During dealing my cards stay stacked face-down; then the fan opens. */
  handCollapsed: boolean;
}

export type FxTone = 'neutral' | 'penalty' | 'skip' | 'suit' | 'win';

export type FxItem =
  | EffectInstance
  | { kind: 'label'; id: number; text: string; tone: FxTone; ttl: number }
  | { kind: 'impact'; id: number; tone: FxTone; delay: number; ttl: number }
  | { kind: 'skip'; id: number; playerId: string; ttl: number }
  | { kind: 'suit'; id: number; suit: Suit; ttl: number }
  | { kind: 'hit'; id: number; playerId: string; ttl: number };

/** Distributive omit so each FxItem variant keeps its own fields. */
type FxSpec = FxItem extends infer T ? (T extends FxItem ? Omit<T, 'id'> : never) : never;

export interface CueStep {
  feedback?: SoundCue;
  apply?: (d: Display) => Display;
  /** Milliseconds before the next step starts (scaled by the director); may depend on the applied display. */
  wait: number | ((d: Display) => number);
  fx?: FxSpec[];
  effects?: (before: Display, after: Display) => EffectEvent[];
}

const DISCARD_KEEP = 8;
let placeholderCounter = 0;
let flashCounter = 0;
const placeholder = (playerId: string) => `${playerId}#${++placeholderCounter}`;

export function emptyDisplay(me: string): Display {
  return {
    stamp: 0,
    me,
    order: [],
    hands: {},
    discard: [],
    outgoing: [],
    drawCount: 0,
    activeSuit: null,
    pendingDraw: 0,
    currentPlayerId: null,
    drawnCardId: null,
    phase: 'idle',
    winnerId: null,
    lastPlayedBy: null,
    handCollapsed: false,
  };
}

function entity(key: string, card: Card | null, stamp: number, extra: Partial<CardEntity> = {}): CardEntity {
  return { key, card, move: null, moveStamp: stamp, spawn: null, delay: 0, flash: null, ...extra };
}

const sortRank: Record<string, number> = { '7': 0, '8': 1, '9': 2, '10': 3, J: 4, Q: 5, K: 6, A: 7 };
const sortSuit: Record<Suit, number> = { hearts: 0, clubs: 1, diamonds: 2, spades: 3 };

/** Own hand is kept sorted by suit, then rank — new cards slide into place. */
export function sortHand(cards: CardEntity[]): CardEntity[] {
  return cards.slice().sort((a, b) => {
    if (!a.card || !b.card) return 0;
    return sortSuit[a.card.suit] - sortSuit[b.card.suit] || sortRank[a.card.rank]! - sortRank[b.card.rank]!;
  });
}

/**
 * Builds a display from a snapshot, reusing existing entities so nothing remounts or jumps.
 * Used after the queue drains (normally a no-op) and on reset/reconnect.
 */
export function reconcile(prev: Display, view: PrsiView | null, me: string, phaseIfNull: Display['phase'] = 'idle'): Display {
  if (!view) return { ...emptyDisplay(me), stamp: prev.stamp + 1, phase: phaseIfNull };
  const stamp = prev.stamp + 1;
  const hands: Record<string, CardEntity[]> = {};
  const fresh = (key: string, card: Card | null) => entity(key, card, stamp, { spawn: { kind: 'fade' }, move: 'appear' });

  for (const p of view.players) {
    const old = prev.hands[p.id] ?? [];
    if (p.id === me && view.myHand) {
      const byKey = new Map(old.map((e) => [e.key, e]));
      hands[p.id] = sortHand(view.myHand.map((c) => byKey.get(c.id) ?? fresh(c.id, c)));
    } else {
      const kept = old.filter((e) => !e.card).slice(0, p.handCount);
      while (kept.length < p.handCount) kept.push(fresh(placeholder(p.id), null));
      hands[p.id] = kept;
    }
  }
  const oldDiscard = new Map(prev.discard.map((e) => [e.key, e]));
  const discard = view.discardTop.map((c) => oldDiscard.get(c.id) ?? fresh(c.id, c));

  return {
    ...prev,
    stamp,
    me,
    order: view.players.map((p) => p.id),
    hands,
    discard,
    outgoing: [],
    drawCount: view.drawCount,
    activeSuit: view.activeSuit,
    pendingDraw: view.pendingDraw,
    currentPlayerId: view.phase === 'playing' ? view.currentPlayerId : null,
    drawnCardId: view.drawnCardId,
    phase: view.phase,
    winnerId: view.winnerId,
    handCollapsed: false,
  };
}

// ---------------------------------------------------------------------------
// Event → cue steps

export interface CueContext {
  me: string;
  /** Seat order of the round (from the snapshot that carried the event). */
  order: string[];
  name: (playerId: string) => string;
}

const bump = (d: Display): Display => ({ ...d, stamp: d.stamp + 1 });
const suitText = (s: Suit) => suitName(s);

export function cuesFor(ev: SeqEvent, ctx: CueContext): CueStep[] {
  const steps = movementCuesFor(ev, ctx);
  const index = ev.type === 'roundWon' ? 1 : 0;
  const step = steps[index];
  if (step) {
    step.effects = (before, after) => effectsForGameEvent(ev, before, after, ctx);
    step.feedback = soundForEvent(ev, ctx.me);
  }
  if (ev.type !== 'roundStarted') {
    for (const cue of steps) cue.fx = cue.fx?.filter((f) => f.kind !== 'impact' && f.kind !== 'suit');
  }
  return steps;
}

function movementCuesFor(ev: SeqEvent, ctx: CueContext): CueStep[] {
  const isMe = (id: string) => id === ctx.me;

  switch (ev.type) {
    case 'roundStarted': {
      const steps: CueStep[] = [
        // Old cards (previous round) sweep back into the deck.
        {
          apply: (d0) => {
            const d = bump(d0);
            const all = [...Object.values(d.hands).flat(), ...d.discard];
            return {
              ...d,
              outgoing: all.map((e) => ({ ...e, move: 'toDeck', moveStamp: d.stamp, delay: 0, flash: null })),
              hands: {},
              discard: [],
              order: ctx.order,
              drawCount: 32,
              phase: 'playing',
              winnerId: null,
              lastPlayedBy: null,
              pendingDraw: 0,
              drawnCardId: null,
              currentPlayerId: null,
              activeSuit: null,
              handCollapsed: true,
            };
          },
          wait: (d) => (d.outgoing.length ? 440 : 80),
        },
        { apply: (d) => ({ ...bump(d), outgoing: [] }), wait: 40 },
      ];
      let mine = 0;
      for (const pid of ev.dealOrder) {
        const card = isMe(pid) ? ev.myCards[mine++] ?? null : null;
        steps.push({
          apply: (d0) => {
            const d = bump(d0);
            const key = card ? card.id : placeholder(pid);
            const e = entity(key, card, d.stamp, { move: 'deal', spawn: { kind: 'deck' } });
            return { ...d, hands: { ...d.hands, [pid]: [...(d.hands[pid] ?? []), e] }, drawCount: Math.max(0, d.drawCount - 1) };
          },
          wait: 85,
          feedback: { id: `${ev.seq}:deal:${steps.length}`, kind: 'deal', delay: 0 },
        });
      }
      steps.push({ wait: 340 });
      steps.push({
        apply: (d0) => {
          const d = bump(d0);
          const e = entity(ev.startCard.id, ev.startCard, d.stamp, { move: 'flipStart', spawn: { kind: 'deck' } });
          return { ...d, discard: [e], activeSuit: ev.startCard.suit, drawCount: Math.max(0, d.drawCount - 1) };
        },
        wait: 520,
        fx: [{ kind: 'impact', tone: 'neutral', delay: 0.38, ttl: 900 }],
      });
      steps.push({
        apply: (d0) => {
          const d = bump(d0);
          const mineSorted = sortHand(d.hands[ctx.me] ?? []).map((e, i) => ({
            ...e,
            move: 'expand' as const,
            moveStamp: d.stamp,
            delay: i * 0.05,
          }));
          return { ...d, handCollapsed: false, hands: { ...d.hands, [ctx.me]: mineSorted } };
        },
        wait: 620,
      });
      return steps;
    }

    case 'cardPlayed': {
      const { card, playerId } = ev;
      const cardText = `${rankLabel(card.rank)} ${suitName(card.suit)}`;
      const label = isMe(playerId) ? `Hraješ ${cardText}` : `${ctx.name(playerId)} hraje ${cardText}`;
      const special = card.rank === '7' || card.rank === 'A' || card.rank === 'Q';
      return [
        {
          apply: (d0) => {
            const d = bump(d0);
            const hand = d.hands[playerId] ?? [];
            let moved: CardEntity;
            let rest: CardEntity[];
            const own = hand.findIndex((e) => e.key === card.id);
            if (own >= 0) {
              moved = { ...hand[own]!, card, move: 'play', moveStamp: d.stamp, delay: 0, spawn: null };
              rest = hand.filter((_, i) => i !== own);
            } else {
              // Opponent: the card appears where one of their hidden cards was and flips on the way.
              const index = hand.length ? Math.floor((hand.length - 1) / 2) : 0;
              moved = entity(card.id, card, d.stamp, {
                move: 'play',
                spawn: { kind: 'seat', playerId, index, count: Math.max(hand.length, 1) },
              });
              rest = hand.filter((_, i) => i !== index);
            }
            const discard = [...d.discard.filter((e) => e.key !== card.id), moved].slice(-DISCARD_KEEP);
            return {
              ...d,
              hands: { ...d.hands, [playerId]: rest },
              discard,
              activeSuit: card.rank === 'Q' ? d.activeSuit : card.suit,
              drawnCardId: null,
              lastPlayedBy: playerId,
            };
          },
          wait: special ? 480 : 560,
          fx: [
            { kind: 'impact', tone: 'neutral', delay: 0.4, ttl: 900 },
            { kind: 'label', text: label, tone: 'neutral', ttl: 1800 },
          ],
        },
      ];
    }

    case 'suitChanged':
      return [
        {
          apply: (d) => ({ ...bump(d), activeSuit: ev.suit }),
          wait: 720,
          fx: [
            { kind: 'suit', suit: ev.suit, ttl: 1100 },
            {
              kind: 'label',
              text: `${isMe(ev.playerId) ? 'Měníš' : `${ctx.name(ev.playerId)} mění`} na ${suitText(ev.suit)}`,
              tone: 'suit',
              ttl: 2000,
            },
          ],
        },
      ];

    case 'drawPenalty':
      return [
        {
          apply: (d) => ({ ...bump(d), pendingDraw: ev.total }),
          wait: 560,
          fx: [
            { kind: 'impact', tone: 'penalty', delay: 0, ttl: 900 },
            {
              kind: 'label',
              text: isMe(ev.targetPlayerId) ? `+${ev.total} na tebe!` : `+${ev.total} → ${ctx.name(ev.targetPlayerId)}`,
              tone: 'penalty',
              ttl: 2000,
            },
          ],
        },
      ];

    case 'cardsDrawn': {
      const { playerId, count, reason } = ev;
      if (count === 0) {
        return [{ wait: 420, fx: [{ kind: 'label', text: 'Balíček je prázdný', tone: 'neutral', ttl: 1600 }] }];
      }
      const penalty = reason === 'penalty';
      const gap = penalty ? 0.15 : 0.12;
      const label = isMe(playerId)
        ? penalty
          ? `Bereš ${count}`
          : 'Lížeš'
        : `${ctx.name(playerId)} ${penalty ? `bere ${count}` : 'líže'}`;
      return [
        {
          apply: (d0) => {
            const d = bump(d0);
            const flashId = ++flashCounter;
            const added = Array.from({ length: count }, (_, i) => {
              const card = ev.cards?.[i] ?? null;
              return entity(card ? card.id : placeholder(playerId), card, d.stamp, {
                move: penalty ? 'penalty' : 'draw',
                spawn: { kind: 'deck' },
                delay: i * gap,
                flash: penalty ? { kind: 'penalty', id: flashId } : isMe(playerId) ? { kind: 'drawn', id: flashId } : null,
              });
            });
            let hand = [...(d.hands[playerId] ?? []), ...added];
            if (isMe(playerId)) hand = sortHand(hand);
            return {
              ...d,
              hands: { ...d.hands, [playerId]: hand },
              drawCount: Math.max(0, d.drawCount - count),
              pendingDraw: penalty ? 0 : d.pendingDraw,
            };
          },
          wait: (penalty ? 600 : 470) + (count - 1) * gap * 1000,
          fx: [
            { kind: 'label', text: label, tone: penalty ? 'penalty' : 'neutral', ttl: 1700 },
            ...(penalty ? [{ kind: 'hit' as const, playerId, ttl: 700 }] : []),
          ],
        },
      ];
    }

    case 'deckReshuffled':
      return [
        {
          apply: (d0) => {
            const d = bump(d0);
            const top = d.discard.at(-1);
            const rest = d.discard.slice(0, -1).map((e) => ({ ...e, move: 'toDeck' as const, moveStamp: d.stamp, delay: 0 }));
            return { ...d, discard: top ? [top] : [], outgoing: rest, drawCount: ev.count };
          },
          wait: 520,
          fx: [{ kind: 'label', text: 'Míchám odhozené karty', tone: 'neutral', ttl: 1500 }],
        },
        { apply: (d) => ({ ...bump(d), outgoing: [] }), wait: 80 },
      ];

    case 'turnSkipped':
      return [
        {
          wait: 660,
          fx: [
            { kind: 'skip', playerId: ev.playerId, ttl: 1150 },
            { kind: 'impact', tone: 'skip', delay: 0, ttl: 900 },
            {
              kind: 'label',
              text: isMe(ev.playerId) ? 'Stojíš — eso' : `${ctx.name(ev.playerId)} stojí`,
              tone: 'skip',
              ttl: 1800,
            },
          ],
        },
      ];

    case 'passed':
      return [
        {
          apply: (d) => ({ ...bump(d), drawnCardId: null }),
          wait: 260,
          fx: [{ kind: 'label', text: isMe(ev.playerId) ? 'Nehraješ' : `${ctx.name(ev.playerId)} nehraje`, tone: 'neutral', ttl: 1300 }],
        },
      ];

    case 'turnChanged':
      return [{ apply: (d) => ({ ...bump(d), currentPlayerId: ev.playerId, drawnCardId: null }), wait: 160 }];

    case 'playerRemoved':
      return [
        {
          apply: (d0) => {
            const d = bump(d0);
            const hands = { ...d.hands };
            const leaving = (hands[ev.playerId] ?? []).map((e) => ({ ...e, move: 'toDeck' as const, moveStamp: d.stamp }));
            delete hands[ev.playerId];
            return { ...d, hands, outgoing: leaving, order: d.order.filter((id) => id !== ev.playerId) };
          },
          wait: 480,
          fx: [{ kind: 'label', text: `${ctx.name(ev.playerId)} opouští hru`, tone: 'neutral', ttl: 1800 }],
        },
        { apply: (d) => ({ ...bump(d), outgoing: [] }), wait: 40 },
      ];

    case 'roundWon':
      return [
        // Short hold so the last card lands before the celebration.
        { wait: 160 },
        {
          apply: (d) => ({ ...bump(d), phase: 'finished', winnerId: ev.playerId, currentPlayerId: null, pendingDraw: 0 }),
          wait: 600,
          fx: [{ kind: 'label', text: isMe(ev.playerId) ? 'Vyhráváš!' : `${ctx.name(ev.playerId)} vyhrává`, tone: 'win', ttl: 2200 }],
        },
      ];
  }
}
