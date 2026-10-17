import {
  applyGameAction as applyAction, chooseGameBotAction as chooseBotAction, createGameRound as createRound, filterGameEventFor as filterEventFor, removeGamePlayer as removePlayer, gameViewFor as viewFor, canStartGame, gameWinnerIds,
  MAX_BOTS, ROOM_MAX_PLAYERS,
  createEvening, ensureRoomEvening, reconcileEvening, eveningView, applyEveningCommand, beginEveningMatch, finishEveningMatch, type EveningState,
  emoteAllowed, EMOTE_TTL_MS, type EmoteMessage,
  type ClientMessage, type ErrorCode, type GameEvent, type GameState, type GameId, type Rng,
  type RoomStatus, type AnyRoomView, type ServerMessage,
} from '@balik/shared';

export interface Player {
  id: string;
  userId: string | null;
  name: string;
  bot: boolean;
  wins: number;
  lastSeen: number;
  connected: boolean;
  connectionId: string;
  lastEmoteAt?: number | null;
}

/** Plain data only: no SDK, socket, timer or process-local references. */
export interface Room {
  code: string;
  version: number;
  players: Player[];
  hostId: string;
  status: RoomStatus;
  /** Missing in pre-W2 persisted rooms means Prší. */
  gameId?: GameId;
  evening?: EveningState;
  sedmaBonus?: 0 | 10;
  game: GameState | null;
  seq: number;
  round: number;
  startIndex: number;
  botDueAt: number | null;
  updatedAt: number;
}

export type Command = ClientMessage | { t: 'tick' } | { t: 'sync' };
export interface Request { id: string; code?: string; connectionId?: string; message: Command }
export interface Frame {
  signals?: EmoteMessage[];
  revision: number;
  message: Extract<ServerMessage, { t: 'state' }>;
  wakeAt: number | null;
  connectionId: string;
}
export interface Reply { frame?: Frame; message?: ServerMessage; code?: string; wakeAt?: number | null }
export interface Delivery { userId: string; frame: Frame }
type EngineEvent = GameEvent & { seq: number };
export interface Environment { now: number; rng: Rng; id: () => string; connectionId?: string }

export class GameError extends Error {
  constructor(readonly code: ErrorCode, message: string) { super(message); }
}
const fail = (code: ErrorCode, message: string): never => { throw new GameError(code, message); };
const BOT_NAMES = ['Robo Rudla', 'Bot Božka', 'Čip Čeněk', 'Kyber Květa'];
export const ONLINE_MS = 45_000;

export function newRoom(code: string, userId: string, name: string, env: Environment, gameId: GameId = 'prsi', sedmaBonus: 0 | 10 = 10): Room {
  return {
    code, version: 0, gameId, sedmaBonus, evening: createEvening(env.now), players: [human(userId, name, env.now, env.connectionId ?? userId)], hostId: userId,
    status: 'lobby', game: null, seq: 0, round: 0, startIndex: -1,
    botDueAt: null, updatedAt: env.now,
  };
}
function human(userId: string, name: string, now: number, connectionId: string): Player {
  return { id: userId, userId, name, bot: false, wins: 0, lastSeen: now, connected: true, connectionId };
}
function addBot(room: Room, env: Environment) {
  if (room.players.length >= ROOM_MAX_PLAYERS) fail('room-full', 'Místnost je plná.');
  const name = BOT_NAMES.find((n) => !room.players.some((p) => p.name === n)) ?? 'Bot';
  room.players.push({ id: env.id(), userId: null, name, bot: true, wins: 0, lastSeen: env.now, connected: true, connectionId: '' });
}
function afterGameChange(room: Room, now: number, reason: 'cards' | 'forfeit' = 'cards') {
  if (room.game?.phase !== 'finished' || room.status === 'finished') return;
  const evening = ensureRoomEvening(room, room.players, now);
  room.status = 'finished';
  if (!finishEveningMatch(evening, room.game!, now, reason)) return;
  for (const id of gameWinnerIds(room.game!)) { const winner = room.players.find((p) => p.id === id); if (winner) winner.wins++; }
}
function remove(room: Room, playerId: string, env: Environment): GameEvent[] {
  ensureRoomEvening(room, room.players, env.now);
  room.players = room.players.filter((p) => p.id !== playerId);
  reconcileEvening(room.evening!, room.players);
  if (room.hostId === playerId) room.hostId = (room.players.find((p) => !p.bot && p.connected) ?? room.players.find((p) => !p.bot))?.id ?? '';
  if (!room.game || room.status !== 'playing') return [];
  const result = removePlayer(room.game, playerId, env.rng);
  room.game = result.state;
  afterGameChange(room, env.now, 'forfeit');
  return result.events;
}

/** Expiration is evaluated by any authenticated room request, never by client-supplied time. */
export function refreshPresence(room: Room, userId: string, env: Environment): { changed: boolean; events: GameEvent[] } {
  ensureRoomEvening(room, room.players, env.now);
  let changed = false;
  const events: GameEvent[] = [];
  const grace = room.status === 'playing' ? 120_000 : 45_000;
  for (const p of [...room.players]) {
    if (p.bot) continue;
    if (p.userId === userId) p.lastSeen = env.now;
    const connected = env.now - p.lastSeen <= ONLINE_MS;
    if (p.connected !== connected) { p.connected = connected; changed = true; }
    if (env.now - p.lastSeen > ONLINE_MS + grace) {
      events.push(...remove(room, p.id, env)); changed = true;
    }
  }
  if (reconcileEvening(room.evening!, room.players)) changed = true;
  return { changed, events };
}

/** Room orchestration; the only card rules remain in @balik/shared. */
export function execute(room: Room, userId: string, command: Command, env: Environment): { events: GameEvent[]; changed: boolean; signals?: EmoteMessage[] } {
  const evening = ensureRoomEvening(room, room.players, env.now);
  let player = room.players.find((p) => p.userId === userId);
  if (command.t === 'join') {
    if (player) {
      player.lastSeen = env.now; player.connected = true;
      player.connectionId = env.connectionId ?? userId;
      if (room.status === 'lobby') player.name = command.name;
    } else {
      if (evening.phase === 'closed') fail('game-in-progress', 'Herní večer už skončil.');
      if (room.status === 'playing') fail('game-in-progress', 'Hra už běží, počkej na další partii.');
      if (room.players.length >= ROOM_MAX_PLAYERS) fail('room-full', 'Místnost je plná.');
      player = human(userId, command.name, env.now, env.connectionId ?? userId); player.wins = evening.stats[userId]?.wins ?? 0; room.players.push(player);
    }
    reconcileEvening(evening, room.players);
    return { events: [], changed: true };
  }
  if (!player) fail('not-in-room', 'Nejsi v této místnosti.');
  const host = () => { if (room.hostId !== player!.id) fail('not-host', 'Tohle může jen hostitel.'); };
  if ((command.t === 'start' || command.t === 'rematch' || command.t === 'lobby' || command.t === 'addBot' || command.t === 'removeBot') && command.round !== undefined && command.round !== room.round) fail('stale', 'Tato partie už není aktuální.');
  switch (command.t) {
    case 'vote': case 'evening': {
      const result = applyEveningCommand(evening, room.players, room.hostId, player!.id, command, env.now);
      if (result.directive !== 'none') { room.game = null; room.status = 'lobby'; room.botDueAt = null; }
      if (result.directive === 'start') {
        room.gameId = result.gameId!;
        return execute(room, userId, { t: 'start', round: room.round }, env);
      }
      return { events: [], changed: result.changed };
    }
    case 'emote': {
      if (!emoteAllowed(player!.lastEmoteAt ?? null, env.now)) fail('rate-limited', 'Další reakci můžeš poslat za chvíli.');
      player!.lastEmoteAt = env.now;
      return { events: [], changed: true, signals: [{ t: 'emote', id: env.id(), code: room.code,
        playerId: player!.id, emote: command.emote, at: env.now, expiresAt: env.now + EMOTE_TTL_MS }] };
    }
    case 'lobby': {
      host();
      if (room.status === 'playing') fail('game-in-progress', 'Hra ještě běží.');
      if (evening.phase === 'closed') fail('illegal', 'Herní večer už skončil.');
      evening.phase = evening.completedMatches ? 'between' : 'ready'; evening.votes = {}; evening.revision++;
      room.game = null; room.status = 'lobby'; room.botDueAt = null;
      return { events: [], changed: true };
    }
    case 'create': {
      for (let i = 0; i < Math.min(command.bots ?? 0, MAX_BOTS); i++) addBot(room, env);
      if (!command.bots) return { events: [], changed: true };
      return execute(room, userId, { t: 'start' }, env);
    }
    case 'start': case 'rematch': {
      host();
      if (room.status === 'playing') return { events: [], changed: false };
      if (evening.phase === 'closed' || evening.phase === 'voting') fail('illegal', 'Nejdřív dokončete volbu hry.');
      if (room.players.some((p) => !p.bot && !p.connected)) fail('not-enough-players', 'Čekáme na návrat nebo uvolnění odpojeného místa.');
      if (!canStartGame(room.gameId ?? 'prsi', room.players.length)) fail('not-enough-players', room.gameId === 'sedma' ? 'Sedma potřebuje přesně 2 nebo 4 hráče.' : 'Ke hře jsou potřeba aspoň 2 hráči.');
      room.round++;
      room.startIndex = (room.startIndex + 1) % room.players.length;
      const result = createRound(room.gameId ?? 'prsi', room.players.map((p) => p.id), room.startIndex, env.rng, room.sedmaBonus);
      room.game = result.state; room.status = 'playing';
      beginEveningMatch(evening, room.round, room.gameId ?? 'prsi', room.game, room.players, env.now);
      return { events: result.events, changed: true };
    }
    case 'addBot': case 'removeBot': {
      host();
      if (evening.phase === 'closed') fail('illegal', 'Herní večer už skončil.');
      if (room.status === 'playing') fail('game-in-progress', 'Hra už běží.');
      if (command.t === 'addBot') addBot(room, env);
      else if (room.players.some((p) => p.id === command.playerId && p.bot)) remove(room, command.playerId, env);
      reconcileEvening(evening, room.players);
      return { events: [], changed: true };
    }
    case 'act': {
      if (room.status !== 'playing' || !room.game) fail('illegal', 'Tenhle tah teď nejde.');
      if (command.baseSeq !== room.seq) fail('stale', 'Stav hry se mezitím změnil.');
      const result = applyAction(room.game!, player!.id, command.action, env.rng);
      if (!result.ok) fail('illegal', 'Tenhle tah teď nejde.');
      if (!result.ok) throw new Error('unreachable');
      room.game = result.state; afterGameChange(room, env.now);
      return { events: result.events, changed: true };
    }
    case 'leave': return { events: remove(room, player!.id, env), changed: true };
    case 'tick': {
      const game = room.game;
      const bot = game && room.players.find((p) => p.id === game.players[game.currentIndex]!.id);
      if (!game || room.status !== 'playing' || !bot?.bot || room.botDueAt === null || env.now < room.botDueAt) return { events: [], changed: false };
      const result = applyAction(game, bot.id, chooseBotAction(game, env.rng), env.rng);
      if (!result.ok) throw new Error(`Invalid bot action: ${result.error}`);
      room.game = result.state; afterGameChange(room, env.now);
      return { events: result.events, changed: true };
    }
    case 'ping': case 'sync': return { events: [], changed: false };
  }
}

export function scheduleBot(room: Room, events: GameEvent[], env: Environment) {
  const game = room.game;
  const current = game && room.players.find((p) => p.id === game.players[game.currentIndex]!.id);
  if (room.status !== 'playing' || !current?.bot || !room.players.some((p) => !p.bot && p.connected)) { room.botDueAt = null; return; }
  if (events.length === 0 && room.botDueAt !== null) return;
  const animation = events.reduce((sum, event) => sum + (
    event.type === 'lharStarted' ? 650 + event.dealOrder.length * 45 :
    event.type === 'lharResolved' ? 1400 :
    event.type === 'sedmaStarted' || event.type === 'roundStarted' ? 1900 + event.dealOrder.length * 85 :
    event.type === 'sedmaDrawn' || event.type === 'cardsDrawn' ? 600 + Math.max(0, event.cards.length - 1) * 150 :
    event.type === 'lharEnded' || event.type === 'trickResolved' || event.type === 'sedmaEnded' || event.type === 'turnSkipped' || event.type === 'roundWon' ? 900 :
    event.type === 'suitChanged' ? 720 : event.type === 'turnChanged' ? 160 : 560
  ), 0);
  room.botDueAt = env.now + animation + 500 + env.rng() * 600;
}

export function stamp(room: Room, events: GameEvent[]): EngineEvent[] {
  return events.map((event) => ({ ...event, seq: ++room.seq }));
}
export function frameFor(room: Room, userId: string, events: EngineEvent[], reset: boolean): Frame {
  const viewer = room.players.find((p) => p.userId === userId);
  if (!viewer) throw new Error('Cannot produce a view for a non-member');
  const view = {
    code: room.code, gameId: room.gameId ?? 'prsi', sedmaBonus: room.sedmaBonus, you: viewer.id, hostId: room.hostId,
    ...(room.evening ? { evening: eveningView(room.evening) } : {}),
    status: room.status, round: room.round, seq: room.seq,
    players: room.players.map((p) => ({ id: p.id, name: p.name, bot: p.bot, wins: p.wins, connected: p.connected })),
    game: room.game ? viewFor(room.game, viewer.id) : null,
  } as AnyRoomView;
  return { revision: room.version, wakeAt: room.botDueAt, connectionId: viewer.connectionId, message: {
    t: 'state', room: view, reset,
    events: reset ? [] : events.map((event) => ({ ...filterEventFor(event, viewer.id), seq: event.seq })),
  } };
}
