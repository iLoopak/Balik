import { SUITS, type Card, type Rng, type Suit } from '../cards';
import { currentPlayerId, legalMoves } from './engine';
import type { PrsiAction, PrsiState } from './types';

/**
 * Simple, readable Prší opponent. Uses only what a player could know:
 * its own hand, the table and opponents' card counts.
 */
export function chooseBotAction(state: PrsiState, rng: Rng): PrsiAction {
  const me = currentPlayerId(state);
  const moves = legalMoves(state, me);
  const hand = state.players[state.currentIndex]!.hand;
  const next = state.players[(state.currentIndex + 1) % state.players.length]!;
  const playable = hand.filter((c) => moves.playable.includes(c.id));

  if (!playable.length) return moves.canPass ? { type: 'pass' } : { type: 'draw' };

  const score = (c: Card): number => {
    let s = 0;
    // Keep the queen as a joker unless it's the last resort or wins the game.
    if (c.rank === 'Q') s -= hand.length === 1 ? -100 : 40;
    // Attack an opponent who is close to winning.
    if ((c.rank === '7' || c.rank === 'A') && next.hand.length <= 2) s += 30;
    if (c.rank === '7') s += 8;
    if (c.rank === 'A') s += 6;
    // Prefer staying in the suit we hold most of.
    s += hand.filter((h) => h.suit === c.suit && h.id !== c.id).length * 4;
    return s + rng() * 3;
  };
  const best = playable.slice().sort((a, b) => score(b) - score(a))[0]!;
  if (best.rank !== 'Q') return { type: 'play', cardId: best.id };
  return { type: 'play', cardId: best.id, chosenSuit: favouriteSuit(hand.filter((c) => c.id !== best.id), rng) };
}

function favouriteSuit(hand: Card[], rng: Rng): Suit {
  const counts = SUITS.map((s) => ({ s, n: hand.filter((c) => c.suit === s).length + rng() * 0.5 }));
  return counts.sort((a, b) => b.n - a.n)[0]!.s;
}
