import type { GameModule } from '../games';
import { applyOkoAction, createOkoRound, isOkoState, removeOkoPlayer } from './engine';
import { chooseOkoBotFromView, filterOkoEventFor, okoViewFor } from './view';
import type { OkoAction, OkoEvent, OkoState } from './types';

const cur = (s: OkoState) => s.players[s.currentIndex]!.id;
export const OKO_MODULE: GameModule = {
  id: 'oko',
  is: (s) => isOkoState(s),
  owns: (e) => e.type.startsWith('oko'),
  create: (players, start, rng) => createOkoRound(players, start, rng),
  apply: (s, id, action, rng) => applyOkoAction(s as OkoState, id, action as OkoAction, rng),
  view: (s, id) => okoViewFor(s as OkoState, id),
  filterEvent: (e, id) => filterOkoEventFor(e as OkoEvent, id),
  remove: (s, id) => removeOkoPlayer(s as OkoState, id),
  bot: (s) => chooseOkoBotFromView(okoViewFor(s as OkoState, cur(s as OkoState)), cur(s as OkoState)),
  winners: (s) => (s as OkoState).result?.winnerIds ?? [],
  eventMs: (e) => ({ okoHand: 1200, okoDrew: 600, okoStood: 400, okoResolved: 2200, okoEnded: 900 } as Record<string, number>)[e.type] ?? 160,
};
