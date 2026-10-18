/** Small dispatcher: room lifecycle, storage and transports do not implement card rules. */
import type { Rng } from './cards';
import { applyAction, createRound, removePlayer } from './prsi/engine';
import { chooseBotAction } from './prsi/bot';
import { filterEventFor, viewFor } from './prsi/view';
import type { PrsiAction, PrsiClientEvent, PrsiEvent, PrsiState } from './prsi/types';
import { applySedmaAction, createSedmaRound, isSedma, removeSedmaPlayer } from './sedma/engine';
import { chooseSedmaBotFromView, filterSedmaEventFor, sedmaViewFor } from './sedma/view';
import type { SedmaAction, SedmaClientEvent, SedmaEvent, SedmaState } from './sedma/types';
import { applyLharAction, createLharRound, isLhar, removeLharPlayer } from './lhar/engine';
import { chooseLharBotFromView, filterLharEventFor, lharViewFor } from './lhar/view';
import type { LharAction, LharClientEvent, LharEvent, LharState } from './lhar/types';
import { GAME_MODULES_EXTRA, type ExtraAction, type ExtraClientEvent, type ExtraEvent, type ExtraState } from './extra';

export const GAME_IDS = ['prsi', 'sedma', 'lhar', 'snaps', 'durak'] as const;
export type GameId = typeof GAME_IDS[number];
export type GameState = PrsiState | SedmaState | LharState | ExtraState;
export type GameEvent = PrsiEvent | SedmaEvent | LharEvent | ExtraEvent;
export type GameAction = PrsiAction | SedmaAction | LharAction | ExtraAction;
export type GameClientEvent = PrsiClientEvent | SedmaClientEvent | LharClientEvent | ExtraClientEvent;

/** Everything the lobby, evening and home screen need to know about a game, in one place. */
export interface GameInfo {
  name: string;
  /** One or two characters for compact game marks. */
  mark: string;
  /** Exact seat counts the game accepts. */
  players: readonly number[];
  /** Human label, e.g. "2–4 hráči". */
  playersLabel: string;
  /** Shown when the table has an unsupported number of seats. */
  needPlayers: string;
  /** Computer opponents offered for a quick solo game. */
  botCounts: readonly number[];
  tagline: string;
}
export const GAME_INFO: Record<GameId, GameInfo> = {
  prsi: { name: 'Prší', mark: 'P', players: [2, 3, 4], playersLabel: '2–4 hráči', needPlayers: 'Prší potřebuje 2 až 4 hráče.', botCounts: [1, 2, 3], tagline: 'Zbav se karet jako první.' },
  sedma: { name: 'Sedma', mark: '7', players: [2, 4], playersLabel: '2 nebo 4 hráči', needPlayers: 'Sedma potřebuje přesně 2 nebo 4 hráče.', botCounts: [1, 3], tagline: 'Štychy, esa a desítky.' },
  snaps: { name: 'Šnaps', mark: '66', players: [2], playersLabel: '2 hráči', needPlayers: 'Šnaps je hra pro přesně 2 hráče.', botCounts: [1], tagline: 'Šedesát šest, trumfy a hlášky.' },
  durak: { name: 'Durak', mark: 'D', players: [2, 3, 4], playersLabel: '2–4 hráči', needPlayers: 'Durak potřebuje 2 až 4 hráče.', botCounts: [1, 2, 3], tagline: 'Útoč, braň se, nezůstaň hlupákem.' },
  lhar: { name: 'Lhář', mark: 'L', players: [2, 3, 4], playersLabel: '2–4 hráči', needPlayers: 'Lhář potřebuje 2 až 4 hráče.', botCounts: [1, 2, 3], tagline: 'Blafuj, nebo prohlédni blaf.' },
};
export const gameName = (id: GameId) => GAME_INFO[id].name;
export const canStartGame = (id: GameId, count: number) => GAME_INFO[id].players.includes(count);

export type GameApplyResult = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: string };
/** A game plugged into the dispatcher. Every state keeps `players[].id`, `currentIndex` and `phase`. */
export interface GameModule {
  id: GameId;
  is(state: GameState): boolean;
  owns(event: GameEvent): boolean;
  create(players: string[], start: number, rng: Rng, bonus: 0 | 10): { state: GameState; events: GameEvent[] };
  apply(state: GameState, playerId: string, action: GameAction, rng: Rng): GameApplyResult;
  view(state: GameState, playerId: string): unknown;
  filterEvent(event: GameEvent, playerId: string): GameClientEvent;
  remove(state: GameState, playerId: string, rng: Rng): { state: GameState; events: GameEvent[] };
  bot(state: GameState, rng: Rng): GameAction;
  winners(state: GameState): string[];
  /** Approximate client animation time for an event, so bots never outrun what people see. */
  eventMs?(event: GameEvent): number;
}

const current = (state: { players: { id: string }[]; currentIndex: number }) => state.players[state.currentIndex]!.id;
const prsi: GameModule = {
  id: 'prsi',
  is: (s) => !('kind' in s),
  owns: () => true,
  create: (players, start, rng) => createRound(players, start, rng),
  apply: (s, id, action, rng) => action.type !== 'play' && action.type !== 'draw' && action.type !== 'pass'
    ? { ok: false, error: 'illegal-action' } : applyAction(s as PrsiState, id, action as PrsiAction, rng),
  view: (s, id) => viewFor(s as PrsiState, id),
  filterEvent: (e, id) => filterEventFor(e as PrsiEvent, id),
  remove: (s, id, rng) => removePlayer(s as PrsiState, id, rng),
  bot: (s, rng) => chooseBotAction(s as PrsiState, rng),
  winners: (s) => (s as PrsiState).winnerId ? [(s as PrsiState).winnerId!] : [],
};
const sedma: GameModule = {
  id: 'sedma',
  is: (s) => isSedma(s),
  owns: (e) => e.type.startsWith('sedma') || e.type === 'trickResolved',
  create: (players, start, rng, bonus) => createSedmaRound(players, start, rng, bonus),
  apply: (s, id, action, rng) => applySedmaAction(s as SedmaState, id, action, rng),
  view: (s, id) => sedmaViewFor(s as SedmaState, id),
  filterEvent: (e, id) => filterSedmaEventFor(e as SedmaEvent, id),
  remove: (s, id) => removeSedmaPlayer(s as SedmaState, id),
  bot: (s) => chooseSedmaBotFromView(sedmaViewFor(s as SedmaState, current(s as SedmaState)), current(s as SedmaState)),
  winners: (s) => (s as SedmaState).result?.winnerIds ?? [],
};
const lhar: GameModule = {
  id: 'lhar',
  is: (s) => isLhar(s),
  owns: (e) => e.type.startsWith('lhar'),
  create: (players, start, rng) => createLharRound(players, start, rng),
  apply: (s, id, action) => applyLharAction(s as LharState, id, action),
  view: (s, id) => lharViewFor(s as LharState, id),
  filterEvent: (e, id) => filterLharEventFor(e as LharEvent, id),
  remove: (s, id) => removeLharPlayer(s as LharState, id),
  bot: (s, rng) => chooseLharBotFromView(lharViewFor(s as LharState, current(s as LharState)), current(s as LharState), rng),
  winners: (s) => (s as LharState).result?.winnerIds ?? [],
};
// Prší is the untagged legacy state, so it is matched last.
const MODULES: GameModule[] = [sedma, lhar, ...GAME_MODULES_EXTRA, prsi];
export const GAME_MODULES: Record<GameId, GameModule> = Object.fromEntries(MODULES.map((m) => [m.id, m])) as Record<GameId, GameModule>;
const moduleOf = (state: GameState) => MODULES.find((m) => m.is(state))!;
const moduleOfEvent = (event: GameEvent) => MODULES.find((m) => m.owns(event))!;

export function createGameRound(id: GameId, players: string[], start: number, rng: Rng, bonus: 0 | 10 = 10) {
  return GAME_MODULES[id].create(players, start, rng, bonus);
}
export function applyGameAction(state: GameState, id: string, action: GameAction, rng: Rng) {
  return moduleOf(state).apply(state, id, action, rng);
}
export function gameViewFor(state: GameState, id: string) {
  return moduleOf(state).view(state, id);
}
export function filterGameEventFor(event: GameEvent, id: string): GameClientEvent {
  return moduleOfEvent(event).filterEvent(event, id);
}
export function removeGamePlayer(state: GameState, id: string, rng: Rng) {
  return moduleOf(state).remove(state, id, rng);
}
export function chooseGameBotAction(state: GameState, rng: Rng): GameAction {
  return moduleOf(state).bot(state, rng);
}
export function gameWinnerIds(state: GameState): string[] {
  return moduleOf(state).winners(state);
}
/** Client cue length for an event; undefined lets the transport use its own default. */
export function gameEventMs(event: GameEvent): number | undefined {
  return moduleOfEvent(event).eventMs?.(event);
}
