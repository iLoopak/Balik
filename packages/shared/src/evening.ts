import { canStartGame, gameWinnerIds, type GameId, type GameState } from './games';
import { isSedma } from './sedma/engine';
import type { ErrorCode } from './protocol';

export interface EveningPerson { id: string; name: string; connected: boolean; bot: boolean }
export interface MatchPerson { id: string; name: string; team?: 0 | 1 }
export interface EveningStats {
  id: string; name: string; played: number; wins: number; teamWins: number; streak: number; bestStreak: number;
}
export interface EveningMatch {
  id: number; gameId: GameId; players: MatchPerson[]; startedAt: number | null; endedAt: number;
  winnerIds: string[]; scores?: [number, number]; reason: 'cards' | 'points' | 'forfeit';
}
export interface EveningView {
  revision: number;
  phase: 'ready' | 'playing' | 'between' | 'voting' | 'closed';
  startedAt: number; closedAt: number | null;
  ballotId: number; votes: Record<string, GameId>;
  stats: Record<string, EveningStats>;
  history: EveningMatch[]; completedMatches: number; gameCounts: Record<GameId, number>;
}
export interface EveningState extends EveningView {
  active: { id: number; gameId: GameId; players: MatchPerson[]; startedAt: number | null } | null;
  lastRecordedId: number;
  rosterSignature: string;
}
export type EveningCommand =
  | { t: 'vote'; ballotId: number; gameId: GameId }
  | { t: 'evening'; baseRevision: number; action: 'between' | 'openVote' | 'close' | 'confirm'; gameId?: GameId };
export class EveningError extends Error {
  constructor(readonly code: ErrorCode, message: string) { super(message); }
}
const fail = (code: ErrorCode, message: string): never => { throw new EveningError(code, message); };
export function createEvening(now: number): EveningState {
  return { revision: 0, phase: 'ready', startedAt: now, closedAt: null, ballotId: 0, votes: {}, stats: {},
    history: [], completedMatches: 0, gameCounts: { prsi: 0, sedma: 0 }, active: null, lastRecordedId: -1, rosterSignature: '' };
}
export function eveningView(state: EveningState): EveningView {
  const { active: _active, lastRecordedId: _recorded, rosterSignature: _roster, ...view } = state;
  return structuredClone(view);
}
/** Presence changes invalidate a host's confirmation, but concurrent votes share a ballot. */
export function reconcileEvening(state: EveningState, people: EveningPerson[]): boolean {
  const signature = JSON.stringify(people.map((p) => [p.id, p.name, p.connected, p.bot]));
  if (state.rosterSignature === signature) return false;
  state.rosterSignature = signature;
  const present = people.filter((p) => p.connected || p.bot);
  for (const [id, game] of Object.entries(state.votes)) {
    if (!present.some((p) => p.id === id && !p.bot) || !canStartGame(game, present.length)) delete state.votes[id];
  }
  for (const p of people) if (state.stats[p.id]) state.stats[p.id]!.name = p.name;
  state.revision++; return true;
}
export function beginEveningMatch(state: EveningState, id: number, gameId: GameId, game: GameState, people: EveningPerson[], now: number | null) {
  state.active = { id, gameId, startedAt: now, players: game.players.map((p) => ({ id: p.id,
    name: people.find((person) => person.id === p.id)?.name ?? 'Odpojený hráč',
    ...(isSedma(game) ? { team: game.players.find((person) => person.id === p.id)!.team } : {}) })) };
  state.phase = 'playing'; state.votes = {}; state.revision++;
}
/** The active match id is a monotone receipt, independent of any particular result event. */
export function finishEveningMatch(state: EveningState, game: GameState, now: number, reason: 'cards' | 'forfeit' = 'cards'): boolean {
  const active = state.active;
  if (game.phase !== 'finished' || !active || active.id <= state.lastRecordedId) return false;
  const winnerIds = gameWinnerIds(game);
  const record: EveningMatch = { ...structuredClone(active), endedAt: now, winnerIds: [...winnerIds],
    ...(isSedma(game) ? { scores: [...game.scores] as [number, number], reason: game.result!.reason } : { reason }) };
  for (const p of active.players) {
    const stats = state.stats[p.id] ??= { id: p.id, name: p.name, played: 0, wins: 0, teamWins: 0, streak: 0, bestStreak: 0 };
    stats.played++;
    if (winnerIds.includes(p.id)) {
      stats.wins++; stats.streak++; stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
      if (active.players.length === 4 && active.gameId === 'sedma') stats.teamWins++;
    } else stats.streak = 0;
  }
  state.history.push(record); state.history = state.history.slice(-100);
  state.active = null; state.lastRecordedId = active.id; state.completedMatches++; state.gameCounts[active.gameId]++;
  state.phase = 'between'; state.revision++; return true;
}
export function eveningBallot(state: EveningView, people: EveningPerson[]) {
  const present = people.filter((p) => p.connected || p.bot);
  const voters = present.filter((p) => !p.bot);
  const available = (['prsi', 'sedma'] as const).filter((game) => canStartGame(game, present.length));
  const counts: Record<GameId, number> = { prsi: 0, sedma: 0 };
  let cast = 0;
  for (const p of voters) { const game = state.votes[p.id]; if (game && available.includes(game)) { counts[game]++; cast++; } }
  const majority = available.find((game) => counts[game] > voters.length / 2);
  const max = Math.max(0, ...available.map((game) => counts[game]));
  const leaders = majority ? [majority] : available.filter((game) => counts[game] === max && max > 0);
  const ready = !!majority || (cast === voters.length && cast > 0);
  const allPresent = people.length === present.length;
  return { counts, voters: voters.map((p) => p.id), cast, available, leaders, ready: ready && allPresent, allPresent };
}
/** Returns a directive; adapters alone own engines and timers. */
export function applyEveningCommand(state: EveningState, people: EveningPerson[], hostId: string, userId: string, command: EveningCommand, now: number): { changed: boolean; directive: 'none' | 'clear' | 'start'; gameId?: GameId } {
  const person = people.find((p) => p.id === userId && p.connected && !p.bot);
  if (!person) fail('not-in-room', 'Nejsi připojený ke stolu.');
  if (state.phase === 'playing') fail('game-in-progress', 'Nejdřív dohrajte partii.');
  if (state.phase === 'closed') fail('illegal', 'Herní večer už skončil.');
  if (command.t === 'vote') {
    if (state.phase !== 'voting' || command.ballotId !== state.ballotId) fail('stale', 'Toto hlasování už není aktuální.');
    const ballot = eveningBallot(state, people);
    if (!ballot.available.includes(command.gameId)) fail('not-enough-players', command.gameId === 'sedma' ? 'Sedma potřebuje 2 nebo 4 připojené hráče.' : 'Ke hře jsou potřeba aspoň 2 hráči.');
    if (state.votes[userId] === command.gameId) return { changed: false, directive: 'none' };
    state.votes[userId] = command.gameId; state.revision++; return { changed: true, directive: 'none' };
  }
  if (command.baseRevision !== state.revision) fail('stale', 'Večer se mezitím změnil. Použij aktuální přehled.');
  if (command.action === 'openVote') {
    if (state.phase === 'voting') return { changed: false, directive: 'none' };
    state.phase = 'voting'; state.ballotId++; state.votes = {}; state.revision++;
    return { changed: true, directive: 'clear' };
  }
  if (command.action === 'between' && state.phase !== 'voting') {
    state.phase = state.completedMatches ? 'between' : 'ready'; state.revision++;
    return { changed: true, directive: 'clear' };
  }
  if (userId !== hostId) fail('not-host', 'Tohle může jen hostitel.');
  if (command.action === 'confirm') {
    const ballot = eveningBallot(state, people);
    const gameId = command.gameId;
    if (!gameId) return fail('bad-message', 'Vyber hru.');
    if (state.phase !== 'voting' || !ballot.ready || !ballot.leaders.includes(gameId)) fail('illegal', 'Nejdřív je potřeba platná dohoda u stolu.');
    if (!canStartGame(gameId, people.length)) fail('not-enough-players', 'Pro tuto hru chybí platný počet hráčů.');
    state.phase = 'ready'; state.votes = {}; state.revision++;
    return { changed: true, directive: 'start', gameId };
  }
  if (command.action === 'close') { state.phase = 'closed'; state.closedAt = now; state.votes = {}; state.revision++; }
  else { state.phase = state.completedMatches ? 'between' : 'ready'; state.votes = {}; state.revision++; }
  return { changed: true, directive: 'clear' };
}
export function eveningSummary(state: EveningView) {
  const stats = Object.values(state.stats);
  const maxWins = Math.max(0, ...stats.map((p) => p.wins));
  const winners = maxWins ? stats.filter((p) => p.wins === maxWins).map((p) => p.id) : [];
  const maxGames = Math.max(state.gameCounts.prsi, state.gameCounts.sedma);
  const mostPlayed = maxGames ? (['prsi', 'sedma'] as const).filter((id) => state.gameCounts[id] === maxGames) : [];
  return { winners, mostPlayed, played: state.completedMatches, bestStreak: Math.max(0, ...stats.map((p) => p.bestStreak)) };
}

/** Lazy upgrade of pre-W3 persisted rooms, without inventing prior match history. */
export function ensureRoomEvening(room: { evening?: EveningState; status: 'lobby' | 'playing' | 'finished'; round: number; gameId?: GameId; game: GameState | null }, people: EveningPerson[], now: number): EveningState {
  if (!room.evening) {
    room.evening = createEvening(now);
    if (room.status === 'playing' && room.game) beginEveningMatch(room.evening, room.round, room.gameId ?? 'prsi', room.game, people, null);
    else if (room.status === 'finished') room.evening.phase = 'between';
  }
  reconcileEvening(room.evening, people);
  return room.evening;
}
