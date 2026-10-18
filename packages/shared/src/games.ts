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

export const GAME_IDS = ['prsi', 'sedma', 'lhar', 'snaps', 'durak', 'marias', 'petr', 'oko', 'pexeso'] as const;
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
  /** What the game is about, in one or two plain sentences for the game library. */
  pitch: string;
  /** The kind of card game, so similar titles read as a family. */
  family: string;
  /**
   * How much there is to learn, counted as the distinct decisions a turn can ask for.
   * 1: one kind of move (play or draw, flip, hit or stand). 2: one more decision on top
   * (continue a trick, challenge, defend or take). 3: several phases or special actions
   * (trump choice, contracts, doubling, closing the talon, marriages).
   * It classifies the rules and never promises a duration.
   */
  learn: 1 | 2 | 3;
}
export const GAME_INFO: Record<GameId, GameInfo> = {
  prsi: { name: 'Prší', mark: 'P', players: [2, 3, 4], playersLabel: '2–4 hráči', needPlayers: 'Prší potřebuje 2 až 4 hráče.', botCounts: [1, 2, 3], tagline: 'Zbav se karet jako první.',
    pitch: 'Přikládej stejnou barvu nebo hodnotu. Sedma dává trest, eso stojí, svršek mění barvu.', family: 'Odhazovací', learn: 1 },
  sedma: { name: 'Sedma', mark: '7', players: [2, 4], playersLabel: '2 nebo 4 hráči', needPlayers: 'Sedma potřebuje přesně 2 nebo 4 hráče.', botCounts: [1, 3], tagline: 'Štychy, esa a desítky.',
    pitch: 'Barva nehraje roli, rozhoduje hodnota. Sedma přebije cokoli, esa a desítky nesou body.', family: 'Štychová', learn: 2 },
  snaps: { name: 'Šnaps', mark: '66', players: [2], playersLabel: '2 hráči', needPlayers: 'Šnaps je hra pro přesně 2 hráče.', botCounts: [1], tagline: 'Šedesát šest, trumfy a hlášky.',
    pitch: 'Souboj dvou o 66 bodů. Sbírej štychy, hlas krále se svrškem a talon zavři ve správnou chvíli.', family: 'Štychová', learn: 3 },
  durak: { name: 'Durak', mark: 'D', players: [2, 3, 4], playersLabel: '2–4 hráči', needPlayers: 'Durak potřebuje 2 až 4 hráče.', botCounts: [1, 2, 3], tagline: 'Útoč, braň se, nezůstaň hlupákem.',
    pitch: 'Útočníci přihazují, obránce přebíjí vyšší kartou nebo trumfem. Kdo zůstane s kartami poslední, je durak.', family: 'Útok a obrana', learn: 2 },
  marias: { name: 'Mariáš', mark: 'M', players: [3], playersLabel: '3 hráči', needPlayers: 'Volený mariáš hrají přesně 3 hráči.', botCounts: [2], tagline: 'Volený mariáš: trumfy, hlášky a betl.',
    pitch: 'Hospodská klasika pro tři. Volič určí trumf a hru, dva obránci ho zkusí zastavit.', family: 'Štychová', learn: 3 },
  petr: { name: 'Černý Petr', mark: 'ČP', players: [2, 3, 4], playersLabel: '2–4 hráči', needPlayers: 'Černý Petr potřebuje 2 až 4 hráče.', botCounts: [1, 2, 3], tagline: 'Hlavně ať ti nezůstane Petr.',
    pitch: 'Tahej naslepo od souseda a odkládej dvojice. Komu nakonec zůstane Černý Petr, prohrál.', family: 'Táhací', learn: 1 },
  oko: { name: 'Oko bere', mark: '21', players: [2, 3, 4], playersLabel: '2–4 hráči', needPlayers: 'Oko bere potřebuje 2 až 4 hráče.', botCounts: [1, 2, 3], tagline: 'Jednadvacet bez sázek, jen o body.',
    pitch: 'Ber karty a blíž se k 21. Kdo přetáhne, prohraje ruku. Hraje se jen o body, bez sázek.', family: 'Riskovací', learn: 1 },
  pexeso: { name: 'Pexeso', mark: 'PX', players: [1, 2, 3, 4], playersLabel: '1–4 hráči', needPlayers: 'Pexeso hraje 1 až 4 hráči.', botCounts: [1, 2, 3], tagline: 'Najdi dvojice stejné hodnoty a barvy.',
    pitch: 'Otáčej po dvou kartách a pamatuj si, kde co leží. Najdi nejvíc dvojic.', family: 'Paměťová', learn: 1 },
  lhar: { name: 'Lhář', mark: 'L', players: [2, 3, 4], playersLabel: '2–4 hráči', needPlayers: 'Lhář potřebuje 2 až 4 hráče.', botCounts: [1, 2, 3], tagline: 'Blafuj, nebo prohlédni blaf.',
    pitch: 'Pokládáš karty rubem a tvrdíš, co jsou. Ostatní ti uvěří, nebo tě nachytají.', family: 'Blafovací', learn: 2 },
};
export const gameName = (id: GameId) => GAME_INFO[id].name;
export const LEARN_LABEL: Record<GameInfo['learn'], string> = { 1: 'Naučíš se hned', 2: 'Pár pravidel navíc', 3: 'Bohatá pravidla' };
/** Games a table with `count` seats can start, in registry order. */
export const gamesForPlayers = (count: number) => GAME_IDS.filter((id) => GAME_INFO[id].players.includes(count));
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
