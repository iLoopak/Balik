import { randomBytes, randomInt } from 'node:crypto';
import {
  PRSI_MAX_PLAYERS,
  PRSI_MIN_PLAYERS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  MAX_BOTS,
  applyAction,
  chooseBotAction,
  createRound,
  filterEventFor,
  removePlayer,
  viewFor,
  type ClientMessage,
  type ErrorCode,
  type PrsiAction,
  type PrsiError,
  type PrsiEvent,
  type PrsiState,
  type Rng,
  type RoomStatus,
  type RoomView,
  type ServerMessage,
} from '@balik/shared';

/** Anything that can receive server messages — a WebSocket in production, a stub in tests. */
export interface Conn {
  send(msg: ServerMessage): void;
}

interface Player {
  /** Public id, visible to everyone. */
  id: string;
  /** Secret reconnect token, never sent to other players. */
  token: string;
  name: string;
  conn: Conn | null;
  disconnectedAt: number | null;
  wins: number;
  /** Computer opponent: never has a connection, always counts as present. */
  bot: boolean;
}

interface Room {
  code: string;
  players: Player[];
  hostId: string;
  status: RoomStatus;
  game: PrsiState | null;
  seq: number;
  round: number;
  startIndex: number;
  emptySince: number | null;
  botTimer: ReturnType<typeof setTimeout> | null;
}

type SeqEngineEvent = PrsiEvent & { seq: number };

export interface RoomManagerOptions {
  rng?: Rng;
  now?: () => number;
  /** Lobby seats of disconnected players are freed after this long. */
  lobbyGraceMs?: number;
  /** Disconnected players are removed from a running game after this long. */
  gameGraceMs?: number;
  /** Rooms with nobody connected are deleted after this long. */
  emptyRoomMs?: number;
  log?: (msg: string) => void;
  /** Multiplier for bot "thinking + animation" delays (0 in tests). */
  botPace?: number;
}

const BOT_NAMES = ['Robo Rudla', 'Bot Božka', 'Čip Čeněk', 'Kyber Květa'];

/** Rough length of the client-side cue sequence for a batch of events (see web/table/display.ts). */
function animationMs(events: PrsiEvent[]): number {
  let ms = 0;
  for (const e of events) {
    switch (e.type) {
      case 'roundStarted':
        ms += 1900 + e.dealOrder.length * 85;
        break;
      case 'cardPlayed':
        ms += 560;
        break;
      case 'suitChanged':
        ms += 720;
        break;
      case 'drawPenalty':
        ms += 560;
        break;
      case 'cardsDrawn':
        ms += 600 + Math.max(0, e.cards.length - 1) * 150;
        break;
      case 'deckReshuffled':
        ms += 600;
        break;
      case 'turnSkipped':
        ms += 900;
        break;
      case 'roundWon':
        ms += 900;
        break;
      default:
        ms += 160;
    }
  }
  return ms;
}

const ERROR_TEXT: Record<ErrorCode, string> = {
  'bad-message': 'Neplatná zpráva.',
  'room-not-found': 'Místnost s tímto kódem neexistuje.',
  'room-full': 'Místnost je plná.',
  'game-in-progress': 'Hra už běží, počkej na další partii.',
  'not-in-room': 'Nejsi v žádné místnosti.',
  'not-host': 'Tohle může jen hostitel.',
  'not-enough-players': 'Ke hře jsou potřeba aspoň 2 hráči.',
  stale: 'Stav hry se mezitím změnil.',
  illegal: 'Tenhle tah teď nejde.',
};

const ILLEGAL_TEXT: Partial<Record<PrsiError, string>> = {
  'not-your-turn': 'Nejsi na tahu.',
  'card-not-playable': 'Tuhle kartu teď nejde zahrát.',
  'must-play-drawn-card': 'Můžeš zahrát jen právě líznutou kartu.',
  'suit-required': 'Vyber barvu.',
  'cannot-pass': 'Nejdřív si lízni.',
  'already-drew': 'Už sis lízl.',
};

export class RoomManager {
  private rooms = new Map<string, Room>();
  private seats = new Map<Conn, { code: string; playerId: string }>();
  private readonly rng: Rng;
  private readonly now: () => number;
  private readonly opts: Required<Pick<RoomManagerOptions, 'lobbyGraceMs' | 'gameGraceMs' | 'emptyRoomMs'>>;
  private readonly log: (msg: string) => void;
  private readonly botPace: number;

  constructor(options: RoomManagerOptions = {}) {
    this.rng = options.rng ?? (() => randomInt(0, 2 ** 32) / 2 ** 32);
    this.now = options.now ?? Date.now;
    this.opts = {
      lobbyGraceMs: options.lobbyGraceMs ?? 45_000,
      gameGraceMs: options.gameGraceMs ?? 120_000,
      emptyRoomMs: options.emptyRoomMs ?? 5 * 60_000,
    };
    this.log = options.log ?? (() => {});
    this.botPace = options.botPace ?? 1;
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  handle(conn: Conn, msg: ClientMessage): void {
    switch (msg.t) {
      case 'ping':
        conn.send({ t: 'pong' });
        return;
      case 'create':
        return this.create(conn, msg.token, msg.name, msg.bots ?? 0);
      case 'addBot':
        return this.addBot(conn);
      case 'removeBot':
        return this.removeBot(conn, msg.playerId);
      case 'join':
        return this.join(conn, msg.code, msg.token, msg.name);
      case 'start':
      case 'rematch':
        return this.start(conn);
      case 'act':
        return this.act(conn, msg.baseSeq, msg.action);
      case 'leave':
        return this.leave(conn);
    }
  }

  /** Socket closed — keep the seat for reconnecting. */
  disconnect(conn: Conn): void {
    const seat = this.seats.get(conn);
    this.seats.delete(conn);
    if (!seat) return;
    const room = this.rooms.get(seat.code);
    const player = room?.players.find((p) => p.id === seat.playerId);
    if (!room || !player || player.conn !== conn) return;
    player.conn = null;
    player.disconnectedAt = this.now();
    if (!room.players.some((p) => p.conn)) room.emptySince = this.now();
    this.broadcast(room, []);
  }

  /** Periodic cleanup of abandoned seats and rooms. */
  sweep(): void {
    const now = this.now();
    for (const room of [...this.rooms.values()]) {
      if (room.emptySince !== null && now - room.emptySince > this.opts.emptyRoomMs) {
        this.closeRoom(room);
        continue;
      }
      const grace = room.status === 'playing' ? this.opts.gameGraceMs : this.opts.lobbyGraceMs;
      for (const p of [...room.players]) {
        if (!p.bot && !p.conn && p.disconnectedAt !== null && now - p.disconnectedAt > grace) this.removeFromRoom(room, p.id);
      }
    }
  }

  private create(conn: Conn, token: string, name: string, bots: number): void {
    this.detach(conn);
    const code = this.newCode();
    const player = this.newPlayer(token, name, conn);
    const room: Room = {
      code,
      players: [player],
      hostId: player.id,
      status: 'lobby',
      game: null,
      seq: 0,
      round: 0,
      startIndex: -1,
      emptySince: null,
      botTimer: null,
    };
    this.rooms.set(code, room);
    this.seats.set(conn, { code, playerId: player.id });
    this.log(`room ${code} created${bots ? ` (solo, ${bots} bots)` : ''}`);
    for (let i = 0; i < Math.min(bots, MAX_BOTS); i++) room.players.push(this.newBot(room));
    this.sendState(room, player, [], true);
    if (bots > 0) this.start(conn);
  }

  private addBot(conn: Conn): void {
    const ctx = this.context(conn);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.hostId !== player.id) return this.error(conn, 'not-host');
    if (room.status === 'playing') return this.error(conn, 'game-in-progress');
    if (room.players.length >= PRSI_MAX_PLAYERS) return this.error(conn, 'room-full');
    room.players.push(this.newBot(room));
    this.broadcast(room, []);
  }

  private removeBot(conn: Conn, botId: string): void {
    const ctx = this.context(conn);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.hostId !== player.id) return this.error(conn, 'not-host');
    if (room.status === 'playing') return this.error(conn, 'game-in-progress');
    if (!room.players.some((p) => p.id === botId && p.bot)) return;
    this.removeFromRoom(room, botId);
  }

  private join(conn: Conn, code: string, token: string, name: string): void {
    const room = this.rooms.get(code);
    if (!room) return this.error(conn, 'room-not-found');
    const existing = room.players.find((p) => p.token === token);
    if (existing) {
      this.detach(conn);
      if (existing.conn && existing.conn !== conn) {
        this.seats.delete(existing.conn);
        existing.conn.send({ t: 'replaced' });
      }
      existing.conn = conn;
      existing.disconnectedAt = null;
      if (room.status === 'lobby') existing.name = name;
      room.emptySince = null;
      this.seats.set(conn, { code, playerId: existing.id });
      this.sendState(room, existing, [], true);
      this.broadcast(room, [], existing.id);
      this.scheduleBot(room, []);
      return;
    }
    if (room.status === 'playing') return this.error(conn, 'game-in-progress');
    if (room.players.length >= PRSI_MAX_PLAYERS) return this.error(conn, 'room-full');
    this.detach(conn);
    const player = this.newPlayer(token, name, conn);
    room.players.push(player);
    room.emptySince = null;
    this.seats.set(conn, { code, playerId: player.id });
    this.sendState(room, player, [], true);
    this.broadcast(room, [], player.id);
  }

  private start(conn: Conn): void {
    const ctx = this.context(conn);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.hostId !== player.id) return this.error(conn, 'not-host');
    if (room.status === 'playing') return;
    // Seats of players who are gone are freed when a new round starts.
    for (const p of [...room.players]) if (!p.conn && !p.bot) this.removeFromRoom(room, p.id, false);
    if (!this.rooms.has(room.code)) return;
    if (room.players.length < PRSI_MIN_PLAYERS) {
      this.broadcast(room, []);
      return this.error(conn, 'not-enough-players');
    }
    room.round += 1;
    room.startIndex = (room.startIndex + 1) % room.players.length;
    const { state, events } = createRound(
      room.players.map((p) => p.id),
      room.startIndex,
      this.rng,
    );
    room.game = state;
    room.status = 'playing';
    this.log(`room ${room.code} round ${room.round} started (${room.players.length} players)`);
    this.commitEvents(room, events);
  }

  private act(conn: Conn, baseSeq: number, action: PrsiAction): void {
    const ctx = this.context(conn);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.status !== 'playing' || !room.game) return this.error(conn, 'illegal');
    if (baseSeq !== room.seq) return this.error(conn, 'stale');
    const result = applyAction(room.game, player.id, action, this.rng);
    if (!result.ok) return this.error(conn, 'illegal', ILLEGAL_TEXT[result.error]);
    room.game = result.state;
    this.afterGameChange(room);
    this.commitEvents(room, result.events);
  }

  private commitEvents(room: Room, events: PrsiEvent[]): void {
    this.broadcast(room, this.stamp(room, events));
    this.scheduleBot(room, events);
  }

  /**
   * Lets a bot act when it's its turn. The delay covers the clients' animations for the
   * events just sent plus a little "thinking", so bots never outrun what humans see.
   * Bots pause while no human is connected.
   */
  private scheduleBot(room: Room, events: PrsiEvent[]): void {
    if (room.botTimer) clearTimeout(room.botTimer);
    room.botTimer = null;
    const game = room.game;
    if (room.status !== 'playing' || !game) return;
    const current = room.players.find((p) => p.id === game.players[game.currentIndex]!.id);
    if (!current?.bot || !room.players.some((p) => !p.bot && p.conn)) return;
    const delay = (animationMs(events) + 500 + this.rng() * 600) * this.botPace;
    const seq = room.seq;
    room.botTimer = setTimeout(() => {
      room.botTimer = null;
      if (!this.rooms.has(room.code) || room.seq !== seq || room.status !== 'playing' || !room.game) return;
      const action = chooseBotAction(room.game, this.rng);
      const result = applyAction(room.game, current.id, action, this.rng);
      if (!result.ok) {
        this.log(`bot ${current.name} made an illegal move: ${result.error}`);
        return;
      }
      room.game = result.state;
      this.afterGameChange(room);
      this.commitEvents(room, result.events);
    }, delay);
  }

  private leave(conn: Conn): void {
    const seat = this.seats.get(conn);
    if (seat) {
      const room = this.rooms.get(seat.code);
      if (room) this.removeFromRoom(room, seat.playerId);
    }
    this.seats.delete(conn);
    conn.send({ t: 'left' });
  }

  private removeFromRoom(room: Room, playerId: string, notify = true): void {
    const index = room.players.findIndex((p) => p.id === playerId);
    if (index < 0) return;
    const [player] = room.players.splice(index, 1);
    if (player!.conn) this.seats.delete(player!.conn);
    if (!room.players.some((p) => !p.bot)) {
      this.closeRoom(room);
      return;
    }
    if (room.hostId === playerId) {
      room.hostId = (room.players.find((p) => !p.bot && p.conn) ?? room.players.find((p) => !p.bot)!).id;
    }
    let events: SeqEngineEvent[] = [];
    if (room.status === 'playing' && room.game) {
      const result = removePlayer(room.game, playerId, this.rng);
      room.game = result.state;
      this.afterGameChange(room);
      events = this.stamp(room, result.events);
      if (notify) this.broadcast(room, events);
      this.scheduleBot(room, result.events);
      return;
    }
    if (notify) this.broadcast(room, events);
  }

  private closeRoom(room: Room): void {
    if (room.botTimer) clearTimeout(room.botTimer);
    this.rooms.delete(room.code);
    this.log(`room ${room.code} closed`);
  }

  private afterGameChange(room: Room): void {
    const game = room.game!;
    if (game.phase === 'finished') {
      room.status = 'finished';
      const winner = room.players.find((p) => p.id === game.winnerId);
      if (winner) winner.wins += 1;
    }
  }

  private stamp(room: Room, events: PrsiEvent[]): SeqEngineEvent[] {
    return events.map((e) => ({ ...e, seq: ++room.seq }));
  }

  private broadcast(room: Room, events: SeqEngineEvent[], exceptId?: string): void {
    for (const p of room.players) if (p.conn && p.id !== exceptId) this.sendState(room, p, events, false);
  }

  private sendState(room: Room, player: Player, events: SeqEngineEvent[], reset: boolean): void {
    player.conn?.send({
      t: 'state',
      room: this.roomView(room, player.id),
      events: events.map((e) => ({ ...filterEventFor(e, player.id), seq: e.seq })),
      reset,
    });
  }

  private roomView(room: Room, viewerId: string): RoomView {
    return {
      code: room.code,
      gameId: 'prsi',
      you: viewerId,
      hostId: room.hostId,
      status: room.status,
      players: room.players.map((p) => ({ id: p.id, name: p.name, connected: p.bot || !!p.conn, wins: p.wins, bot: p.bot })),
      round: room.round,
      seq: room.seq,
      game: room.game ? viewFor(room.game, viewerId) : null,
    };
  }

  private context(conn: Conn): { room: Room; player: Player } | null {
    const seat = this.seats.get(conn);
    const room = seat && this.rooms.get(seat.code);
    const player = room?.players.find((p) => p.id === seat!.playerId);
    if (!room || !player) {
      this.error(conn, 'not-in-room');
      return null;
    }
    return { room, player };
  }

  /** A connection switching rooms behaves like a disconnect from the old one. */
  private detach(conn: Conn): void {
    if (this.seats.has(conn)) this.disconnect(conn);
  }

  private error(conn: Conn, code: ErrorCode, message?: string): void {
    conn.send({ t: 'error', code, message: message ?? ERROR_TEXT[code] });
  }

  private newPlayer(token: string, name: string, conn: Conn): Player {
    return { id: randomBytes(6).toString('base64url'), token, name, conn, disconnectedAt: null, wins: 0, bot: false };
  }

  private newBot(room: Room): Player {
    const used = new Set(room.players.map((p) => p.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${room.players.length}`;
    return { id: randomBytes(6).toString('base64url'), token: randomBytes(16).toString('base64url'), name, conn: null, disconnectedAt: null, wins: 0, bot: true };
  }

  private newCode(): string {
    for (;;) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
  }
}
