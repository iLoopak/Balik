import type { GameModule } from '../games';
import { applySnapsAction, createSnapsRound, isSnaps, removeSnapsPlayer } from './engine';
import { chooseSnapsBotFromView, filterSnapsEventFor, snapsViewFor } from './view';
import type { SnapsAction, SnapsEvent, SnapsState } from './types';

const cur = (s: SnapsState) => s.players[s.currentIndex]!.id;
export const SNAPS_MODULE: GameModule = {
  id: 'snaps',
  is: (s) => isSnaps(s),
  owns: (e) => e.type.startsWith('snaps'),
  create: (players, start, rng) => createSnapsRound(players, start, rng),
  apply: (s, id, action) => applySnapsAction(s as SnapsState, id, action as SnapsAction),
  view: (s, id) => snapsViewFor(s as SnapsState, id),
  filterEvent: (e, id) => filterSnapsEventFor(e as SnapsEvent, id),
  remove: (s, id) => removeSnapsPlayer(s as SnapsState, id),
  bot: (s) => chooseSnapsBotFromView(snapsViewFor(s as SnapsState, cur(s as SnapsState)), cur(s as SnapsState)),
  winners: (s) => (s as SnapsState).result?.winnerIds ?? [],
  eventMs: (e) => ({ snapsStarted: 1500, snapsPlayed: 560, snapsTrick: 900, snapsDrawn: 450, snapsExchanged: 700, snapsClosed: 600, snapsEnded: 900 } as Record<string, number>)[e.type] ?? 160,
};
