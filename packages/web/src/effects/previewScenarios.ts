import { SUITS, type Card, type PrsiClientEvent, type SeqEvent, type Suit } from '@balik/shared';
import { cuesFor, emptyDisplay, type CardEntity, type CueStep, type Display } from '../table/display';
import type { EffectKind } from './effectEvents';

export type PreviewAction = Exclude<EffectKind, 'pause'> | 'chain';
export const PREVIEW_ACTIONS: { id: PreviewAction; title: string; note: string; key: string }[] = [
  { id: 'play', title: 'Zahrát kartu', note: 'Odlepení → přelet → dopad', key: '1' },
  { id: 'draw', title: 'Dobrat kartu', note: 'Z balíčku ke správné ruce', key: '2' },
  { id: 'suit', title: 'Změnit barvu', note: 'Nová frakce, jasný barevný pulse', key: '3' },
  { id: 'skip', title: 'Eso / STOP', note: 'Time-slice a přeskočený hráč', key: '4' },
  { id: 'reverse', title: 'Otočit směr', note: 'Samostatná ukázka pro další hry', key: '5' },
  { id: 'penalty', title: 'Poslat +2', note: 'Odesílatel → příjemce → součet', key: '6' },
  { id: 'danger', title: 'Poslední karta', note: 'Pozor, zbývá už jen jedna', key: '7' },
  { id: 'win', title: 'Vyhrát kolo', note: 'Krátký lokální vítězný flourish', key: '8' },
  { id: 'chain', title: 'Řetězec +2 → +6', note: 'Tři sedmičky v rychlé sekvenci', key: '9' },
];

export const PREVIEW_PLAYERS = { me: 'Ty', ada: 'Ada', max: 'Max' } as const;
const ORDER = ['me', 'ada', 'max'];
export const previewCard = (suit: Suit, rank: Card['rank']): Card => ({ id: `${suit}-${rank}`, suit, rank });
const item = (key: string, card: Card | null): CardEntity => ({ key, card, move: null, moveStamp: 0, spawn: null, delay: 0, flash: null });

export function previewDisplay(suit: Suit, action: PreviewAction = 'play'): Display {
  const ranks: Card['rank'][] = action === 'danger' ? ['8', 'Q'] : action === 'win' ? ['8'] : ['7', '8', 'Q', 'A'];
  const mine = ranks.map((rank) => { const card = previewCard(suit, rank); return item(card.id, card); });
  const top = previewCard(suit, '10');
  return {
    ...emptyDisplay('me'), order: [...ORDER], hands: {
      me: mine,
      ada: Array.from({ length: 4 }, (_, i) => item(`ada#${i}`, null)),
      max: Array.from({ length: 4 }, (_, i) => item(`max#${i}`, null)),
    }, discard: [item(top.id, top)], drawCount: 31 - mine.length - 8,
    activeSuit: suit, currentPlayerId: 'me', phase: 'playing',
  };
}

/** The playground feeds the same public events and cue adapter used at the live table. */
export function previewScenario(action: PreviewAction, suit: Suit): { initial: Display; steps: CueStep[] } {
  const initial = previewDisplay(suit, action);
  let seq = 0;
  const ev = (event: PrsiClientEvent): SeqEvent => ({ ...event, seq: ++seq });
  const play = (rank: Card['rank'], playerId = 'me', color = suit) => ev({ type: 'cardPlayed', playerId, card: previewCard(color, rank) });
  const nextSuit = SUITS[(SUITS.indexOf(suit) + 1) % 4]!;
  let events: SeqEvent[];
  switch (action) {
    case 'play': events = [play('8'), ev({ type: 'turnChanged', playerId: 'ada' })]; break;
    case 'draw': events = [ev({ type: 'cardsDrawn', playerId: 'me', cards: [previewCard(suit, '9')], count: 1, reason: 'normal' })]; break;
    case 'suit': events = [play('Q'), ev({ type: 'suitChanged', playerId: 'me', suit: nextSuit }), ev({ type: 'turnChanged', playerId: 'ada' })]; break;
    case 'skip': events = [play('A'), ev({ type: 'turnSkipped', playerId: 'ada', byPlayerId: 'me' }), ev({ type: 'turnChanged', playerId: 'max' })]; break;
    case 'danger': events = [play('8'), ev({ type: 'turnChanged', playerId: 'ada' })]; break;
    case 'win': events = [play('8'), ev({ type: 'roundWon', playerId: 'me' })]; break;
    case 'penalty': events = [play('7'), ev({ type: 'drawPenalty', targetPlayerId: 'ada', total: 2 }), ev({ type: 'turnChanged', playerId: 'ada' })]; break;
    case 'chain': events = [
      play('7'), ev({ type: 'drawPenalty', targetPlayerId: 'ada', total: 2 }), ev({ type: 'turnChanged', playerId: 'ada' }),
      play('7', 'ada', nextSuit), ev({ type: 'drawPenalty', targetPlayerId: 'max', total: 4 }), ev({ type: 'turnChanged', playerId: 'max' }),
      play('7', 'max', SUITS[(SUITS.indexOf(suit) + 2) % 4]!), ev({ type: 'drawPenalty', targetPlayerId: 'me', total: 6 }), ev({ type: 'turnChanged', playerId: 'me' }),
      ev({ type: 'cardsDrawn', playerId: 'me', count: 6, reason: 'penalty', cards: SUITS.flatMap((s) => (['J', 'K'] as const).map((rank) => previewCard(s, rank))).slice(0, 6) }),
    ]; break;
    case 'reverse': return { initial, steps: [{ wait: 720, fx: [{ kind: 'label', text: 'Změna směru · ukázka pro další hry', tone: 'neutral', ttl: 1600 }], effects: () => [{ kind: 'reverse', suit, direction: -1, label: 'Změna směru · ukázka pro další hry' }] }] };
  }
  const ctx = { me: 'me', order: [...ORDER], name: (id: string) => PREVIEW_PLAYERS[id as keyof typeof PREVIEW_PLAYERS] ?? id };
  return { initial, steps: events.flatMap((event) => cuesFor(event, ctx)) };
}
