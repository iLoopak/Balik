/** Small dispatcher: room lifecycle, storage and transports do not implement card rules. */
import type { Rng } from './cards';
import { applyAction, createRound, removePlayer } from './prsi/engine';
import { chooseBotAction } from './prsi/bot';
import { filterEventFor, viewFor } from './prsi/view';
import type { PrsiAction, PrsiEvent, PrsiState } from './prsi/types';
import { applySedmaAction, createSedmaRound, isSedma, removeSedmaPlayer } from './sedma/engine';
import { chooseSedmaBotFromView, filterSedmaEventFor, sedmaViewFor } from './sedma/view';
import type { SedmaAction, SedmaEvent, SedmaState } from './sedma/types';
export type GameId = 'prsi' | 'sedma';
export type GameState = PrsiState | SedmaState;
export type GameEvent = PrsiEvent | SedmaEvent;
export type GameAction = PrsiAction | SedmaAction;
export const gameName = (id: GameId) => id === 'sedma' ? 'Sedma' : 'Prší';
export const canStartGame = (id: GameId, count: number) => id === 'sedma' ? count === 2 || count === 4 : count >= 2 && count <= 4;
export function createGameRound(id: GameId, players: string[], start: number, rng: Rng, bonus: 0 | 10 = 10) {
  return id === 'sedma' ? createSedmaRound(players, start, rng, bonus) : createRound(players, start, rng);
}
export function applyGameAction(state: GameState, id: string, action: GameAction, rng: Rng) {
  if (isSedma(state)) return applySedmaAction(state, id, action, rng);
  if (action.type === 'collect') return { ok: false as const, error: 'illegal-action' as const };
  return applyAction(state, id, action, rng);
}
export function gameViewFor(state: GameState, id: string) {
  return isSedma(state) ? sedmaViewFor(state, id) : viewFor(state, id);
}
export function filterGameEventFor(event: GameEvent, id: string) {
  return event.type.startsWith('sedma') || event.type === 'trickResolved'
    ? filterSedmaEventFor(event as SedmaEvent, id) : filterEventFor(event as PrsiEvent, id);
}
export function removeGamePlayer(state: GameState, id: string, rng: Rng) {
  return isSedma(state) ? removeSedmaPlayer(state, id) : removePlayer(state, id, rng);
}
export function chooseGameBotAction(state: GameState, rng: Rng): GameAction {
  return isSedma(state) ? chooseSedmaBotFromView(sedmaViewFor(state, state.players[state.currentIndex]!.id), state.players[state.currentIndex]!.id) : chooseBotAction(state, rng);
}
export function gameWinnerIds(state: GameState): string[] {
  return isSedma(state) ? state.result?.winnerIds ?? [] : state.winnerId ? [state.winnerId] : [];
}
