import { describe, expect, it } from 'vitest';
import {
  applyAction,
  cardId,
  createDeck32,
  createRound,
  filterEventFor,
  isSpecial,
  legalMoves,
  legalMovesFromView,
  mulberry32,
  removePlayer,
  viewFor,
  type Card,
  type PrsiState,
  type Rank,
  type Suit,
} from '../src';

const c = (rank: Rank, suit: Suit): Card => ({ id: cardId(suit, rank), suit, rank });
const rng = mulberry32(42);

/** Builds a state by hand; remaining deck cards go to the draw pile unless given. */
function makeState(opts: {
  hands: Card[][];
  top: Card;
  activeSuit?: Suit;
  current?: number;
  pendingDraw?: number;
  drawPile?: Card[];
  discardBelow?: Card[];
}): PrsiState {
  const used = new Set([...opts.hands.flat(), opts.top, ...(opts.discardBelow ?? [])].map((x) => x.id));
  const drawPile = opts.drawPile ?? createDeck32().filter((x) => !used.has(x.id));
  return {
    players: opts.hands.map((hand, i) => ({ id: `p${i}`, hand })),
    drawPile,
    discardPile: [...(opts.discardBelow ?? []), opts.top],
    activeSuit: opts.activeSuit ?? opts.top.suit,
    currentIndex: opts.current ?? 0,
    pendingDraw: opts.pendingDraw ?? 0,
    drawnCardId: null,
    phase: 'playing',
    winnerId: null,
  };
}

function ok(result: ReturnType<typeof applyAction>) {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result;
}

function allCards(s: PrsiState): string[] {
  return [...s.drawPile, ...s.discardPile, ...s.players.flatMap((p) => p.hand)].map((x) => x.id);
}

describe('deck', () => {
  it('has 32 unique cards', () => {
    const deck = createDeck32();
    expect(deck).toHaveLength(32);
    expect(new Set(deck.map((x) => x.id)).size).toBe(32);
  });
});

describe('createRound', () => {
  it('deals 4 cards each, never opens with a special card, conserves cards', () => {
    for (let seed = 0; seed < 300; seed++) {
      const n = 2 + (seed % 3);
      const ids = Array.from({ length: n }, (_, i) => `p${i}`);
      const { state, events } = createRound(ids, seed % n, mulberry32(seed));
      expect(state.players.every((p) => p.hand.length === 4)).toBe(true);
      expect(isSpecial(state.discardPile[0]!)).toBe(false);
      expect(state.activeSuit).toBe(state.discardPile[0]!.suit);
      const cards = allCards(state);
      expect(cards).toHaveLength(32);
      expect(new Set(cards).size).toBe(32);
      const started = events[0]!;
      expect(started.type).toBe('roundStarted');
      if (started.type === 'roundStarted') {
        expect(started.dealOrder).toHaveLength(4 * n);
        expect(started.dealOrder[0]).toBe(ids[seed % n]);
      }
      expect(events[1]).toEqual({ type: 'turnChanged', playerId: ids[seed % n] });
    }
  });
});

describe('matching', () => {
  it('accepts same suit or same rank, rejects others', () => {
    const s = makeState({ hands: [[c('9', 'hearts'), c('8', 'clubs'), c('K', 'spades')], [c('10', 'spades')]], top: c('8', 'hearts') });
    expect(legalMoves(s, 'p0').playable.sort()).toEqual([cardId('clubs', '8'), cardId('hearts', '9')].sort());
    const bad = applyAction(s, 'p0', { type: 'play', cardId: cardId('spades', 'K') }, rng);
    expect(bad).toEqual({ ok: false, error: 'card-not-playable' });
    const good = ok(applyAction(s, 'p0', { type: 'play', cardId: cardId('clubs', '8') }, rng));
    expect(good.state.activeSuit).toBe('clubs');
    expect(good.state.currentIndex).toBe(1);
    expect(good.events.map((e) => e.type)).toEqual(['cardPlayed', 'turnChanged']);
  });

  it('rejects actions out of turn and cards not in hand', () => {
    const s = makeState({ hands: [[c('9', 'hearts'), c('10', 'hearts')], [c('8', 'hearts')]], top: c('8', 'spades') });
    expect(applyAction(s, 'p1', { type: 'draw' }, rng)).toEqual({ ok: false, error: 'not-your-turn' });
    expect(applyAction(s, 'p0', { type: 'play', cardId: cardId('hearts', '8') }, rng)).toEqual({
      ok: false,
      error: 'card-not-in-hand',
    });
  });

  it('does not mutate the previous state', () => {
    const s = makeState({ hands: [[c('9', 'hearts'), c('10', 'hearts')], [c('8', 'clubs')]], top: c('8', 'hearts') });
    const snapshot = structuredClone(s);
    ok(applyAction(s, 'p0', { type: 'play', cardId: cardId('hearts', '9') }, rng));
    expect(s).toEqual(snapshot);
  });
});

describe('Q (svršek)', () => {
  it('requires a suit, can be played on anything and changes the active suit', () => {
    const s = makeState({ hands: [[c('Q', 'clubs'), c('9', 'clubs')], [c('9', 'diamonds'), c('K', 'clubs')]], top: c('8', 'hearts') });
    expect(applyAction(s, 'p0', { type: 'play', cardId: cardId('clubs', 'Q') }, rng)).toEqual({ ok: false, error: 'suit-required' });
    const r = ok(applyAction(s, 'p0', { type: 'play', cardId: cardId('clubs', 'Q'), chosenSuit: 'diamonds' }, rng));
    expect(r.state.activeSuit).toBe('diamonds');
    expect(r.events.map((e) => e.type)).toEqual(['cardPlayed', 'suitChanged', 'turnChanged']);
    // Next player must follow the chosen suit, not the Q's suit.
    expect(legalMoves(r.state, 'p1').playable).toEqual([cardId('diamonds', '9')]);
  });
});

describe('7 penalty', () => {
  it('forces the next player to draw 2 and ends their turn', () => {
    const s = makeState({ hands: [[c('7', 'hearts'), c('9', 'clubs')], [c('8', 'hearts'), c('K', 'spades')]], top: c('10', 'hearts') });
    const r1 = ok(applyAction(s, 'p0', { type: 'play', cardId: cardId('hearts', '7') }, rng));
    expect(r1.state.pendingDraw).toBe(2);
    expect(r1.events).toContainEqual({ type: 'drawPenalty', targetPlayerId: 'p1', total: 2 });
    // Matching suit is not enough while a penalty is pending.
    expect(legalMoves(r1.state, 'p1').playable).toEqual([]);
    expect(applyAction(r1.state, 'p1', { type: 'play', cardId: cardId('hearts', '8') }, rng)).toEqual({
      ok: false,
      error: 'card-not-playable',
    });
    const r2 = ok(applyAction(r1.state, 'p1', { type: 'draw' }, rng));
    expect(r2.state.players[1]!.hand).toHaveLength(4);
    expect(r2.state.pendingDraw).toBe(0);
    expect(r2.state.currentIndex).toBe(0);
    const drawn = r2.events.find((e) => e.type === 'cardsDrawn');
    expect(drawn).toMatchObject({ playerId: 'p1', reason: 'penalty' });
  });

  it('stacks with another 7 (+4) and passes on to the following player', () => {
    const s = makeState({
      hands: [[c('7', 'hearts'), c('9', 'clubs')], [c('7', 'spades'), c('K', 'spades')], [c('8', 'diamonds')]],
      top: c('10', 'hearts'),
    });
    const r1 = ok(applyAction(s, 'p0', { type: 'play', cardId: cardId('hearts', '7') }, rng));
    const r2 = ok(applyAction(r1.state, 'p1', { type: 'play', cardId: cardId('spades', '7') }, rng));
    expect(r2.state.pendingDraw).toBe(4);
    expect(r2.events).toContainEqual({ type: 'drawPenalty', targetPlayerId: 'p2', total: 4 });
    const r3 = ok(applyAction(r2.state, 'p2', { type: 'draw' }, rng));
    expect(r3.state.players[2]!.hand).toHaveLength(5);
    expect(r3.state.currentIndex).toBe(0);
  });
});

describe('A (eso)', () => {
  it('skips the next player with 3 players', () => {
    const s = makeState({ hands: [[c('A', 'hearts'), c('9', 'clubs')], [c('8', 'hearts')], [c('9', 'hearts')]], top: c('10', 'hearts') });
    const r = ok(applyAction(s, 'p0', { type: 'play', cardId: cardId('hearts', 'A') }, rng));
    expect(r.events).toContainEqual({ type: 'turnSkipped', playerId: 'p1', byPlayerId: 'p0' });
    expect(r.state.currentIndex).toBe(2);
  });

  it('gives the same player another turn with 2 players', () => {
    const s = makeState({ hands: [[c('A', 'hearts'), c('9', 'clubs')], [c('8', 'hearts')]], top: c('10', 'hearts') });
    const r = ok(applyAction(s, 'p0', { type: 'play', cardId: cardId('hearts', 'A') }, rng));
    expect(r.events).toContainEqual({ type: 'turnSkipped', playerId: 'p1', byPlayerId: 'p0' });
    expect(r.state.currentIndex).toBe(0);
    expect(r.events.at(-1)).toEqual({ type: 'turnChanged', playerId: 'p0' });
  });

  it('wraps around the table', () => {
    const s = makeState({
      hands: [[c('8', 'clubs')], [c('8', 'spades')], [c('A', 'hearts'), c('9', 'clubs')]],
      top: c('10', 'hearts'),
      current: 2,
    });
    const r = ok(applyAction(s, 'p2', { type: 'play', cardId: cardId('hearts', 'A') }, rng));
    expect(r.state.currentIndex).toBe(1);
  });
});

describe('drawing', () => {
  it('ends the turn when the drawn card is not playable', () => {
    const s = makeState({
      hands: [[c('9', 'clubs')], [c('8', 'spades')]],
      top: c('10', 'hearts'),
      drawPile: [c('K', 'spades')],
    });
    const r = ok(applyAction(s, 'p0', { type: 'draw' }, rng));
    expect(r.state.currentIndex).toBe(1);
    expect(r.state.drawnCardId).toBeNull();
    expect(r.events.map((e) => e.type)).toEqual(['cardsDrawn', 'turnChanged']);
  });

  it('lets the player play the drawn card or pass, nothing else', () => {
    const s = makeState({
      hands: [[c('9', 'clubs'), c('8', 'clubs')], [c('8', 'spades')]],
      top: c('10', 'hearts'),
      drawPile: [c('K', 'hearts')],
    });
    const r = ok(applyAction(s, 'p0', { type: 'draw' }, rng));
    expect(r.state.currentIndex).toBe(0);
    expect(r.state.drawnCardId).toBe(cardId('hearts', 'K'));
    expect(r.events.map((e) => e.type)).toEqual(['cardsDrawn']);
    expect(legalMoves(r.state, 'p0')).toEqual({ playable: [cardId('hearts', 'K')], canDraw: false, canPass: true });
    expect(applyAction(r.state, 'p0', { type: 'draw' }, rng)).toEqual({ ok: false, error: 'already-drew' });

    const played = ok(applyAction(r.state, 'p0', { type: 'play', cardId: cardId('hearts', 'K') }, rng));
    expect(played.state.currentIndex).toBe(1);
    const passed = ok(applyAction(r.state, 'p0', { type: 'pass' }, rng));
    expect(passed.state.currentIndex).toBe(1);
    expect(passed.state.drawnCardId).toBeNull();
    expect(passed.events.map((e) => e.type)).toEqual(['passed', 'turnChanged']);
  });

  it('cannot pass without drawing first', () => {
    const s = makeState({ hands: [[c('9', 'clubs')], [c('8', 'spades')]], top: c('10', 'hearts') });
    expect(applyAction(s, 'p0', { type: 'pass' }, rng)).toEqual({ ok: false, error: 'cannot-pass' });
  });

  it('reshuffles the discard pile (keeping the top card) when the draw pile is empty', () => {
    const below = [c('8', 'diamonds'), c('9', 'diamonds'), c('K', 'diamonds')];
    const s = makeState({
      hands: [[c('9', 'clubs')], [c('8', 'spades')]],
      top: c('10', 'hearts'),
      discardBelow: below,
      drawPile: [c('J', 'spades')],
      pendingDraw: 2,
    });
    const r = ok(applyAction(s, 'p0', { type: 'draw' }, rng));
    expect(r.events.map((e) => e.type)).toEqual(['cardsDrawn', 'deckReshuffled', 'cardsDrawn', 'turnChanged']);
    expect(r.state.discardPile).toEqual([c('10', 'hearts')]);
    expect(r.state.players[0]!.hand).toHaveLength(3);
    expect(r.state.drawPile).toHaveLength(2);
  });

  it('handles both piles being exhausted', () => {
    const s = makeState({ hands: [[c('9', 'clubs')], [c('8', 'spades')]], top: c('10', 'hearts'), drawPile: [] });
    const r = ok(applyAction(s, 'p0', { type: 'draw' }, rng));
    expect(r.events).toEqual([
      { type: 'cardsDrawn', playerId: 'p0', cards: [], reason: 'normal' },
      { type: 'turnChanged', playerId: 'p1' },
    ]);
  });
});

describe('winning', () => {
  it('ends the round immediately on the last card, even a special one', () => {
    const s = makeState({ hands: [[c('7', 'hearts')], [c('8', 'spades')]], top: c('10', 'hearts') });
    const r = ok(applyAction(s, 'p0', { type: 'play', cardId: cardId('hearts', '7') }, rng));
    expect(r.state.phase).toBe('finished');
    expect(r.state.winnerId).toBe('p0');
    expect(r.state.pendingDraw).toBe(0);
    expect(r.events.map((e) => e.type)).toEqual(['cardPlayed', 'roundWon']);
    expect(applyAction(r.state, 'p1', { type: 'draw' }, rng)).toEqual({ ok: false, error: 'finished' });
  });
});

describe('player removal', () => {
  it('passes the turn on and returns cards to the deck', () => {
    const s = makeState({ hands: [[c('9', 'clubs')], [c('8', 'spades'), c('K', 'spades')], [c('9', 'hearts')]], top: c('10', 'hearts'), current: 1 });
    const r = removePlayer(s, 'p1', rng);
    expect(r.state.players.map((p) => p.id)).toEqual(['p0', 'p2']);
    expect(r.state.currentIndex).toBe(1);
    expect(allCards(r.state)).toHaveLength(32);
    expect(r.events).toEqual([
      { type: 'playerRemoved', playerId: 'p1' },
      { type: 'turnChanged', playerId: 'p2' },
    ]);
  });

  it('declares the last remaining player the winner', () => {
    const s = makeState({ hands: [[c('9', 'clubs')], [c('8', 'spades')]], top: c('10', 'hearts') });
    const r = removePlayer(s, 'p0', rng);
    expect(r.state.phase).toBe('finished');
    expect(r.state.winnerId).toBe('p1');
  });
});

describe('hidden information', () => {
  it('views expose only the viewer’s own hand', () => {
    const { state } = createRound(['a', 'b', 'c'], 0, mulberry32(7));
    const view = viewFor(state, 'b');
    expect(view.myHand).toEqual(state.players[1]!.hand);
    const json = JSON.stringify(view);
    for (const other of [state.players[0]!, state.players[2]!]) {
      for (const card of other.hand) expect(json).not.toContain(card.id);
    }
    for (const card of state.drawPile) expect(json).not.toContain(card.id);
  });

  it('filters dealt and drawn cards per viewer', () => {
    const { state, events } = createRound(['a', 'b'], 0, mulberry32(9));
    const dealtForB = filterEventFor(events[0]!, 'b');
    const json = JSON.stringify(dealtForB);
    for (const card of state.players[0]!.hand) expect(json).not.toContain(card.id);

    const drawn = { type: 'cardsDrawn' as const, playerId: 'a', cards: [c('K', 'spades')], reason: 'normal' as const };
    expect(filterEventFor(drawn, 'b')).toEqual({ type: 'cardsDrawn', playerId: 'a', count: 1, reason: 'normal' });
    expect(filterEventFor(drawn, 'a')).toMatchObject({ count: 1, cards: [c('K', 'spades')] });
  });

  it('client-side legal moves agree with the engine', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { state } = createRound(['a', 'b'], 0, mulberry32(seed));
      expect(legalMovesFromView(viewFor(state, 'a'), 'a')).toEqual(legalMoves(state, 'a'));
      expect(legalMovesFromView(viewFor(state, 'b'), 'b')).toEqual(legalMoves(state, 'b'));
    }
  });
});

describe('simulated games', () => {
  it('conserve all 32 cards and always finish', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const r = mulberry32(seed);
      const ids = Array.from({ length: 2 + (seed % 3) }, (_, i) => `p${i}`);
      let { state } = createRound(ids, seed, r);
      let steps = 0;
      while (state.phase === 'playing' && steps < 2000) {
        const me = state.players[state.currentIndex]!.id;
        const moves = legalMoves(state, me);
        let action: Parameters<typeof applyAction>[2];
        if (moves.playable.length && r() < 0.85) {
          const id = moves.playable[Math.floor(r() * moves.playable.length)]!;
          action = { type: 'play', cardId: id, chosenSuit: id.endsWith('-Q') ? 'spades' : undefined };
        } else {
          action = moves.canPass ? { type: 'pass' } : { type: 'draw' };
        }
        state = ok(applyAction(state, me, action, r)).state;
        const cards = allCards(state);
        expect(cards.length).toBe(32);
        expect(new Set(cards).size).toBe(32);
        steps++;
      }
      expect(state.phase).toBe('finished');
      expect(state.players.find((p) => p.id === state.winnerId)!.hand).toHaveLength(0);
    }
  });
});
