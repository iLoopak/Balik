import type { GameModule } from '../games';
import { applyPetrAction, createPetrRound, isPetr, removePetrPlayer } from './engine';
import { choosePetrBotFromView, filterPetrEventFor, petrViewFor } from './view';
import type { PetrAction, PetrEvent, PetrState } from './types';

const cur = (s: PetrState) => s.players[s.currentIndex]!.id;
export const PETR_MODULE: GameModule = {
  id: 'petr',
  is: (s) => isPetr(s),
  owns: (e) => e.type.startsWith('petr'),
  create: (players, start, rng) => createPetrRound(players, start, rng),
  apply: (s, id, action, rng) => applyPetrAction(s as PetrState, id, action as PetrAction, rng),
  view: (s, id) => petrViewFor(s as PetrState, id),
  filterEvent: (e, id) => filterPetrEventFor(e as PetrEvent, id),
  remove: (s, id) => removePetrPlayer(s as PetrState, id),
  bot: (s, rng) => choosePetrBotFromView(petrViewFor(s as PetrState, cur(s as PetrState)), cur(s as PetrState), rng),
  winners: (s) => (s as PetrState).result?.winnerIds ?? [],
  eventMs: (e) => ({ petrStarted: 2600, petrDrew: 900, petrOut: 600, petrEnded: 900 } as Record<string, number>)[e.type] ?? 160,
};
