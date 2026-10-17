/** Small dispatcher: room lifecycle, storage and transports do not implement card rules. */
import type { Rng } from './cards';
import { applyAction, createRound, removePlayer } from './prsi/engine';
import { chooseBotAction } from './prsi/bot';
import { filterEventFor, viewFor } from './prsi/view';
import type { PrsiAction, PrsiEvent, PrsiState } from './prsi/types';
import { applySedmaAction, createSedmaRound, isSedma, removeSedmaPlayer } from './sedma/engine';
import { chooseSedmaBotFromView, filterSedmaEventFor, sedmaViewFor } from './sedma/view';
import type { SedmaAction, SedmaEvent, SedmaState } from './sedma/types';
import { applyLharAction, createLharRound, isLhar, removeLharPlayer } from './lhar/engine';
import { chooseLharBotFromView, filterLharEventFor, lharViewFor } from './lhar/view';
import type { LharAction, LharEvent, LharState } from './lhar/types';
export const GAME_IDS = ['prsi', 'sedma', 'lhar'] as const;
export type GameId = typeof GAME_IDS[number];
export type GameState = PrsiState | SedmaState | LharState;
export type GameEvent = PrsiEvent | SedmaEvent | LharEvent;
export type GameAction = PrsiAction | SedmaAction | LharAction;
export const gameName = (id: GameId) => ({prsi:'Prší',sedma:'Sedma',lhar:'Lhář'})[id];
export const canStartGame = (id: GameId, count: number) => id === 'sedma' ? count === 2 || count === 4 : count >= 2 && count <= 4;
export function createGameRound(id: GameId, players: string[], start: number, rng: Rng, bonus: 0 | 10 = 10) {
  if (id === 'lhar') return createLharRound(players, start, rng);
  return id === 'sedma' ? createSedmaRound(players, start, rng, bonus) : createRound(players, start, rng);
}
export function applyGameAction(state: GameState, id: string, action: GameAction, rng: Rng) {
  if (isLhar(state)) return applyLharAction(state, id, action);
  if (isSedma(state)) return applySedmaAction(state, id, action, rng);
  if (action.type !== 'play' && action.type !== 'draw' && action.type !== 'pass') return { ok: false as const, error: 'illegal-action' as const };
  return applyAction(state, id, action, rng);
}
export function gameViewFor(state: GameState, id: string) {
  if (isLhar(state)) return lharViewFor(state, id);
  return isSedma(state) ? sedmaViewFor(state, id) : viewFor(state, id);
}
export function filterGameEventFor(event: GameEvent, id: string) {
  if (event.type.startsWith('lhar')) return filterLharEventFor(event as LharEvent, id);
  return event.type.startsWith('sedma') || event.type === 'trickResolved'
    ? filterSedmaEventFor(event as SedmaEvent, id) : filterEventFor(event as PrsiEvent, id);
}
export function removeGamePlayer(state: GameState, id: string, rng: Rng) {
  if (isLhar(state)) return removeLharPlayer(state, id);
  return isSedma(state) ? removeSedmaPlayer(state, id) : removePlayer(state, id, rng);
}
export function chooseGameBotAction(state: GameState, rng: Rng): GameAction {
  if (isLhar(state)) { const id = state.players[state.currentIndex]!.id; return chooseLharBotFromView(lharViewFor(state, id), id, rng); }
  return isSedma(state) ? chooseSedmaBotFromView(sedmaViewFor(state, state.players[state.currentIndex]!.id), state.players[state.currentIndex]!.id) : chooseBotAction(state, rng);
}
export function gameWinnerIds(state: GameState): string[] {
  return isSedma(state) || isLhar(state) ? state.result?.winnerIds ?? [] : state.winnerId ? [state.winnerId] : [];
}
