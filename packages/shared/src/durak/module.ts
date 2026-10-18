import type { GameModule } from '../games';
import { applyDurakAction, createDurakRound, isDurak, removeDurakPlayer } from './engine';
import { chooseDurakBotFromView, durakViewFor, filterDurakEventFor } from './view';
import type { DurakAction, DurakEvent, DurakState } from './types';

const cur = (s: DurakState) => s.players[s.currentIndex]!.id;
export const DURAK_MODULE: GameModule = {
  id: 'durak',
  is: (s) => isDurak(s),
  owns: (e) => e.type.startsWith('durak'),
  create: (players, start, rng) => createDurakRound(players, start, rng),
  apply: (s, id, action) => applyDurakAction(s as DurakState, id, action as DurakAction),
  view: (s, id) => durakViewFor(s as DurakState, id),
  filterEvent: (e, id) => filterDurakEventFor(e as DurakEvent, id),
  remove: (s, id) => removeDurakPlayer(s as DurakState, id),
  bot: (s) => chooseDurakBotFromView(durakViewFor(s as DurakState, cur(s as DurakState)), cur(s as DurakState)),
  winners: (s) => (s as DurakState).result?.winnerIds ?? [],
  eventMs: (e) => ({ durakStarted: 1800, durakAttacked: 520, durakDefended: 520, durakTook: 800, durakBito: 700, durakDrawn: 500, durakOut: 600, durakEnded: 900 } as Record<string, number>)[e.type] ?? 160,
};
