import {
  applyAction, chooseBotAction, createRound, filterEventFor, removePlayer, viewFor,
  MAX_BOTS, PRSI_MAX_PLAYERS, PRSI_MIN_PLAYERS,
  type ClientMessage, type ErrorCode, type PrsiEvent, type PrsiState, type Rng,
  type RoomStatus, type RoomView, type ServerMessage,
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
}

/** Plain data only: no SDK, socket, timer or process-local references. */
export interface Room {
  code: string;
  version: number;
  players: Player[];
  hostId: string;
  status: RoomStatus;
  game: PrsiState | null;
  seq: number;
  round: number;
  startIndex: number;
  botDueAt: number | null;
  updatedAt: number;
}

export type Command = ClientMessage | { t: 'tick' } | { t: 'sync' };
export interface Request { id: string; code?: string; connectionId?: string; message: Command }
export interface Frame {
  revision: number;
  message: Extract<ServerMessage, { t: 'state' }>;
  wakeAt: number | null;
  connectionId: string;
}
export interface Reply { frame?: Frame; message?: ServerMessage; code?: string; wakeAt?: number | null }
export interface Delivery { userId: string; frame: Frame }
type EngineEvent = PrsiEvent & { seq: number };
export interface Environment { now: number; rng: Rng; id: () => string; connectionId?: string }

export class GameError extends Error {
  constructor(readonly code: ErrorCode, message: string) { super(message); }
}
const fail = (code: ErrorCode, message: string): never => { throw new GameError(code, message); };
const BOT_NAMES = ['Robo Rudla', 'Bot Božka', 'Čip Čeněk', 'Kyber Květa'];
export const ONLINE_MS = 45_000;

export function newRoom(code: string, userId: string, name: string, env: Environment): Room {
  return {
    code, version: 0, players: [human(userId, name, env.now, env.connectionId ?? userId)], hostId: userId,
    status: 'lobby', game: null, seq: 0, round: 0, startIndex: -1,
    botDueAt: null, updatedAt: env.now,
  };
}
function human(userId: string, name: string, now: number, connectionId: string): Player {
  return { id: userId, userId, name, bot: false, wins: 0, lastSeen: now, connected: true, connectionId };
}
function addBot(room: Room, env: Environment) {
  if (room.players.length >= PRSI_MAX_PLAYERS) fail('room-full', 'Místnost je plná.');
  const name = BOT_NAMES.find((n) => !room.players.some((p) => p.name === n)) ?? 'Bot';
  room.players.push({ id: env.id(), userId: null, name, bot: true, wins: 0, lastSeen: env.now, connected: true, connectionId: '' });
}
function afterGameChange(room: Room) {
  if (room.game?.phase !== 'finished' || room.status === 'finished') return;
  room.status = 'finished';
  const winner = room.players.find((p) => p.id === room.game!.winnerId);
  if (winner) winner.wins++;
}
function remove(room: Room, playerId: string, env: Environment): PrsiEvent[] {
  room.players = room.players.filter((p) => p.id !== playerId);
  if (room.hostId === playerId) room.hostId = (room.players.find((p) => !p.bot && p.connected) ?? room.players.find((p) => !p.bot))?.id ?? '';
  if (!room.game || room.status !== 'playing') return [];
  const result = removePlayer(room.game, playerId, env.rng);
  room.game = result.state;
  afterGameChange(room);
  return result.events;
}

/** Expiration is evaluated by any authenticated room request, never by client-supplied time. */
export function refreshPresence(room: Room, userId: string, env: Environment): { changed: boolean; events: PrsiEvent[] } {
  let changed = false;
  const events: PrsiEvent[] = [];
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
  return { changed, events };
}

/** Room orchestration; the only card rules remain in @balik/shared. */
export function execute(room: Room, userId: string, command: Command, env: Environment): { events: PrsiEvent[]; changed: boolean } {
  let player = room.players.find((p) => p.userId === userId);
  if (command.t === 'join') {
    if (player) {
      player.lastSeen = env.now; player.connected = true;
      player.connectionId = env.connectionId ?? userId;
      if (room.status === 'lobby') player.name = command.name;
    } else {
      if (room.status === 'playing') fail('game-in-progress', 'Hra už běží, počkej na další partii.');
      if (room.players.length >= PRSI_MAX_PLAYERS) fail('room-full', 'Místnost je plná.');
      player = human(userId, command.name, env.now, env.connectionId ?? userId); room.players.push(player);
    }
    return { events: [], changed: true };
  }
  if (!player) fail('not-in-room', 'Nejsi v této místnosti.');
  const host = () => { if (room.hostId !== player!.id) fail('not-host', 'Tohle může jen hostitel.'); };
  switch (command.t) {
    case 'create': {
      for (let i = 0; i < Math.min(command.bots ?? 0, MAX_BOTS); i++) addBot(room, env);
      if (!command.bots) return { events: [], changed: true };
      return execute(room, userId, { t: 'start' }, env);
    }
    case 'start': case 'rematch': {
      host();
      if (room.status === 'playing') return { events: [], changed: false };
      room.players = room.players.filter((p) => p.bot || p.connected);
      if (room.players.length < PRSI_MIN_PLAYERS) fail('not-enough-players', 'Ke hře jsou potřeba aspoň 2 hráči.');
      room.round++;
      room.startIndex = (room.startIndex + 1) % room.players.length;
      const result = createRound(room.players.map((p) => p.id), room.startIndex, env.rng);
      room.game = result.state; room.status = 'playing';
      return { events: result.events, changed: true };
    }
    case 'addBot': case 'removeBot': {
      host();
      if (room.status === 'playing') fail('game-in-progress', 'Hra už běží.');
      if (command.t === 'addBot') addBot(room, env);
      else if (room.players.some((p) => p.id === command.playerId && p.bot)) remove(room, command.playerId, env);
      return { events: [], changed: true };
    }
    case 'act': {
      if (room.status !== 'playing' || !room.game) fail('illegal', 'Tenhle tah teď nejde.');
      if (command.baseSeq !== room.seq) fail('stale', 'Stav hry se mezitím změnil.');
      const result = applyAction(room.game!, player!.id, command.action, env.rng);
      if (!result.ok) fail('illegal', 'Tenhle tah teď nejde.');
      if (!result.ok) throw new Error('unreachable');
      room.game = result.state; afterGameChange(room);
      return { events: result.events, changed: true };
    }
    case 'leave': return { events: remove(room, player!.id, env), changed: true };
    case 'tick': {
      const game = room.game;
      const bot = game && room.players.find((p) => p.id === game.players[game.currentIndex]!.id);
      if (!game || room.status !== 'playing' || !bot?.bot || room.botDueAt === null || env.now < room.botDueAt) return { events: [], changed: false };
      const result = applyAction(game, bot.id, chooseBotAction(game, env.rng), env.rng);
      if (!result.ok) throw new Error(`Invalid bot action: ${result.error}`);
      room.game = result.state; afterGameChange(room);
      return { events: result.events, changed: true };
    }
    case 'ping': case 'sync': return { events: [], changed: false };
  }
}

export function scheduleBot(room: Room, events: PrsiEvent[], env: Environment) {
  const game = room.game;
  const current = game && room.players.find((p) => p.id === game.players[game.currentIndex]!.id);
  if (room.status !== 'playing' || !current?.bot || !room.players.some((p) => !p.bot && p.connected)) { room.botDueAt = null; return; }
  if (events.length === 0 && room.botDueAt !== null) return;
  const animation = events.reduce((sum, event) => sum + (
    event.type === 'roundStarted' ? 1900 + event.dealOrder.length * 85 :
    event.type === 'cardsDrawn' ? 600 + Math.max(0, event.cards.length - 1) * 150 :
    event.type === 'turnSkipped' || event.type === 'roundWon' ? 900 :
    event.type === 'suitChanged' ? 720 : event.type === 'turnChanged' ? 160 : 560
  ), 0);
  room.botDueAt = env.now + animation + 500 + env.rng() * 600;
}

export function stamp(room: Room, events: PrsiEvent[]): EngineEvent[] {
  return events.map((event) => ({ ...event, seq: ++room.seq }));
}
export function frameFor(room: Room, userId: string, events: EngineEvent[], reset: boolean): Frame {
  const viewer = room.players.find((p) => p.userId === userId);
  if (!viewer) throw new Error('Cannot produce a view for a non-member');
  const view: RoomView = {
    code: room.code, gameId: 'prsi', you: viewer.id, hostId: room.hostId,
    status: room.status, round: room.round, seq: room.seq,
    players: room.players.map((p) => ({ id: p.id, name: p.name, bot: p.bot, wins: p.wins, connected: p.connected })),
    game: room.game ? viewFor(room.game, viewer.id) : null,
  };
  return { revision: room.version, wakeAt: room.botDueAt, connectionId: viewer.connectionId, message: {
    t: 'state', room: view, reset,
    events: reset ? [] : events.map((event) => ({ ...filterEventFor(event, viewer.id), seq: event.seq })),
  } };
}
