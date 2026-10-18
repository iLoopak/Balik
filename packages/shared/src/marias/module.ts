import type { GameModule } from '../games';
import { applyMariasAction, createMariasRound, isMarias, removeMariasPlayer } from './engine';
import { chooseMariasBotFromView, filterMariasEventFor, mariasViewFor } from './view';
import type { MariasAction, MariasEvent, MariasState } from './types';

const cur = (s: MariasState) => s.players[s.currentIndex]!.id;
export const MARIAS_MODULE: GameModule = {
  id: 'marias',
  is: (s) => isMarias(s),
  owns: (e) => e.type.startsWith('marias'),
  create: (players, start, rng) => createMariasRound(players, start, rng),
  apply: (s, id, action) => applyMariasAction(s as MariasState, id, action as MariasAction),
  view: (s, id) => mariasViewFor(s as MariasState, id),
  filterEvent: (e, id) => filterMariasEventFor(e as MariasEvent, id),
  remove: (s, id) => removeMariasPlayer(s as MariasState, id),
  bot: (s) => chooseMariasBotFromView(mariasViewFor(s as MariasState, cur(s as MariasState)), cur(s as MariasState)),
  winners: (s) => (s as MariasState).result?.winnerIds ?? [],
  eventMs: (e) => ({ mariasStarted: 900, mariasTrump: 900, mariasDealt: 1600, mariasDeclared: 900, mariasFlek: 700, mariasPlayed: 520, mariasTrick: 900, mariasEnded: 900 } as Record<string, number>)[e.type] ?? 160,
};
