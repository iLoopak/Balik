import type { GameModule } from '../games';
import { applyPexesoAction, createPexesoRound, isPexeso, removePexesoPlayer } from './engine';
import { choosePexesoBotFromView, filterPexesoEventFor, pexesoViewFor } from './view';
import type { PexesoAction, PexesoEvent, PexesoState } from './types';

export const PEXESO_MODULE: GameModule = {
  id: 'pexeso',
  is: (s) => isPexeso(s),
  owns: (e) => e.type.startsWith('pexeso'),
  create: (players, start, rng) => createPexesoRound(players, start, rng),
  apply: (s, id, action) => applyPexesoAction(s as PexesoState, id, action as PexesoAction),
  view: (s) => pexesoViewFor(s as PexesoState),
  filterEvent: (e) => filterPexesoEventFor(e as PexesoEvent),
  remove: (s, id) => removePexesoPlayer(s as PexesoState, id),
  bot: (s, rng) => { const st = s as PexesoState; return choosePexesoBotFromView(pexesoViewFor(st), st.players[st.currentIndex]!.id, rng); },
  winners: (s) => (s as PexesoState).result?.winnerIds ?? [],
  eventMs: (e) => ({ pexesoStarted: 1200, pexesoFlipped: 520, pexesoMatch: 900, pexesoMiss: 1100, pexesoEnded: 900 } as Record<string, number>)[e.type] ?? 160,
};
