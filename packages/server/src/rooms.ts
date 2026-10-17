import { randomBytes, randomInt } from 'node:crypto';
import {
  ROOM_MAX_PLAYERS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  MAX_BOTS, BOT_AVATAR_IDS, defaultAvatarId, type AvatarId,
  createEvening, ensureRoomEvening, eveningView, applyEveningCommand, beginEveningMatch, finishEveningMatch, EveningError, type EveningState, type EveningCommand,
  emoteAllowed, EMOTE_TTL_MS, type EmoteId,
  applyGameAction as applyAction,
  canStartGame, gameWinnerIds, type GameId,
  chooseGameBotAction as chooseBotAction,
  createGameRound as createRound,
  filterGameEventFor as filterEventFor,
  removeGamePlayer as removePlayer,
  gameViewFor as viewFor,
  type ClientMessage,
  type ErrorCode,
  type GameAction,
  type PrsiError,
  type GameEvent,
  type GameState,
  type Rng,
  type RoomStatus,
  type AnyRoomView,
  type ServerMessage,
} from '@balik/shared';

/** Anything that can receive server messages — a WebSocket in production, a stub in tests. */
export interface Conn {
  send(msg: ServerMessage): void;
}

interface Player {
  lastEmoteAt: number | null;
  avatarId?: AvatarId;
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
  /** Reconnect credentials remain private while the room lives, including after a leave. */
  departed: Player[];
  hostId: string;
  status: RoomStatus;
  gameId: GameId;
  evening?: EveningState;
  sedmaBonus: 0 | 10;
  game: GameState | null;
  seq: number;
  round: number;
  startIndex: number;
  emptySince: number | null;
  botTimer: ReturnType<typeof setTimeout> | null;
}

type SeqEngineEvent = GameEvent & { seq: number };

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
function animationMs(events: GameEvent[]): number {
  let ms = 0;
  for (const e of events) {
    switch (e.type) {
      case 'lharStarted':
        ms += 650 + e.dealOrder.length * 45;
        break;
      case 'sedmaStarted':
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
      case 'sedmaDrawn':
      case 'cardsDrawn':
        ms += 600 + Math.max(0, e.cards.length - 1) * 150;
        break;
      case 'deckReshuffled':
        ms += 600;
        break;
      case 'turnSkipped':
        ms += 900;
        break;
      case 'lharResolved':
        ms += 1400;
        break;
      case 'trickResolved':
      case 'lharEnded':
      case 'sedmaEnded':
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
  'rate-limited': 'Další reakci můžeš poslat za chvíli.',
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
      case 'vote': case 'evening': return this.eveningCommand(conn, msg);
      case 'profile': {
        const ctx = this.context(conn); if (!ctx || ctx.player.avatarId === msg.avatarId) return;
        ctx.player.avatarId = msg.avatarId;
        this.broadcast(ctx.room, []); return;
      }
      case 'emote': return this.emote(conn, msg.emote);
      case 'lobby': {
        const ctx = this.context(conn); if (!ctx) return;
        if (ctx.room.hostId !== ctx.player.id) return this.error(conn, 'not-host');
        if (msg.round !== undefined && msg.round !== ctx.room.round) return this.error(conn, 'stale');
        if (ctx.room.evening!.phase === 'closed') return this.error(conn, 'illegal', 'Herní večer už skončil.');
        if (ctx.room.status === 'playing') return this.error(conn, 'game-in-progress');
        if (ctx.room.botTimer) clearTimeout(ctx.room.botTimer);
        ctx.room.botTimer = null; ctx.room.game = null; ctx.room.status = 'lobby';
        ctx.room.evening!.phase = ctx.room.evening!.completedMatches ? 'between' : 'ready'; ctx.room.evening!.votes = {}; ctx.room.evening!.revision++;
        this.broadcast(ctx.room, []); return;
      }
      case 'ping':
        conn.send({ t: 'pong' });
        return;
      case 'create':
        return this.create(conn, msg.token, msg.name, msg.bots ?? 0, msg.gameId ?? 'prsi', msg.sedmaBonus ?? 10, msg.avatarId);
      case 'addBot':
        return this.addBot(conn, msg.round);
      case 'removeBot':
        return this.removeBot(conn, msg.playerId, msg.round);
      case 'join':
        return this.join(conn, msg.code, msg.token, msg.name, msg.avatarId);
      case 'start':
      case 'rematch':
        return this.start(conn, msg.round);
      case 'act':
        return this.act(conn, msg.baseSeq, msg.action);
      case 'leave':
        return this.leave(conn);
    }
  }

  /** Social signals are ephemeral and never advance the game sequence. */
  private emote(conn: Conn, emote: EmoteId): void {
    const ctx = this.context(conn); if (!ctx) return;
    const now = this.now();
    if (!emoteAllowed(ctx.player.lastEmoteAt, now)) return this.error(conn, 'rate-limited');
    ctx.player.lastEmoteAt = now;
    const message = { t: 'emote' as const, id: randomBytes(12).toString('base64url'), code: ctx.room.code,
      playerId: ctx.player.id, emote, at: now, expiresAt: now + EMOTE_TTL_MS };
    for (const player of ctx.room.players) player.conn?.send(message);
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

  private create(conn: Conn, token: string, name: string, bots: number, gameId: GameId, sedmaBonus: 0 | 10, avatarId?: AvatarId): void {
    if (bots && !canStartGame(gameId, bots + 1)) return this.error(conn, 'not-enough-players', 'Sedma potřebuje přesně 2 nebo 4 hráče.');
    this.detach(conn);
    const code = this.newCode();
    const player = this.newPlayer(token, name, conn);
    player.avatarId = avatarId ?? defaultAvatarId(player.id);
    const room: Room = {
      code, gameId, sedmaBonus, evening: createEvening(this.now()),
      players: [player], departed: [],
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

  private addBot(conn: Conn, round?: number): void {
    const ctx = this.context(conn);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.hostId !== player.id) return this.error(conn, 'not-host');
    if (round !== undefined && round !== room.round) return this.error(conn, 'stale');
    if (room.evening?.phase === 'closed') return this.error(conn, 'illegal', 'Herní večer už skončil.');
    if (room.status === 'playing') return this.error(conn, 'game-in-progress');
    if (room.players.length >= ROOM_MAX_PLAYERS) return this.error(conn, 'room-full');
    room.players.push(this.newBot(room));
    this.broadcast(room, []);
  }

  private removeBot(conn: Conn, botId: string, round?: number): void {
    const ctx = this.context(conn);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.hostId !== player.id) return this.error(conn, 'not-host');
    if (round !== undefined && round !== room.round) return this.error(conn, 'stale');
    if (room.evening?.phase === 'closed') return this.error(conn, 'illegal', 'Herní večer už skončil.');
    if (room.status === 'playing') return this.error(conn, 'game-in-progress');
    if (!room.players.some((p) => p.id === botId && p.bot)) return;
    this.removeFromRoom(room, botId);
  }

  private join(conn: Conn, code: string, token: string, name: string, avatarId?: AvatarId): void {
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
      if (avatarId) existing.avatarId = avatarId;
      if (room.status === 'lobby') existing.name = name;
      room.emptySince = null;
      this.seats.set(conn, { code, playerId: existing.id });
      this.sendState(room, existing, [], true);
      this.broadcast(room, [], existing.id);
      this.scheduleBot(room, []);
      return;
    }
    if (room.evening?.phase === 'closed') return this.error(conn, 'game-in-progress', 'Herní večer už skončil.');
    if (room.status === 'playing') return this.error(conn, 'game-in-progress');
    if (room.players.length >= ROOM_MAX_PLAYERS) return this.error(conn, 'room-full');
    this.detach(conn);
    const retired = room.departed.find((p) => p.token === token);
    const player = retired ? { ...retired, name, conn, disconnectedAt: null } : this.newPlayer(token, name, conn);
    player.avatarId = avatarId ?? player.avatarId ?? defaultAvatarId(player.id);
    room.departed = room.departed.filter((p) => p.token !== token);
    room.players.push(player);
    room.emptySince = null;
    this.seats.set(conn, { code, playerId: player.id });
    this.sendState(room, player, [], true);
    this.broadcast(room, [], player.id);
  }

  private start(conn: Conn, round?: number): void {
    const ctx = this.context(conn);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.hostId !== player.id) return this.error(conn, 'not-host');
    if (round !== undefined && round !== room.round) return this.error(conn, 'stale');
    if (room.status === 'playing') return;
    if (room.evening!.phase === 'closed' || room.evening!.phase === 'voting') return this.error(conn, 'illegal', 'Nejdřív dokončete volbu hry.');
    if (room.players.some((p) => !p.bot && !p.conn)) return this.error(conn, 'not-enough-players', 'Čekáme na návrat nebo uvolnění odpojeného místa.');
    if (!canStartGame(room.gameId, room.players.length)) {
      this.broadcast(room, []);
      return this.error(conn, 'not-enough-players', room.gameId === 'sedma' ? 'Sedma potřebuje přesně 2 nebo 4 hráče.' : undefined);
    }
    room.round += 1;
    room.startIndex = (room.startIndex + 1) % room.players.length;
    const { state, events } = createRound(
      room.gameId,
      room.players.map((p) => p.id),
      room.startIndex,
      this.rng, room.sedmaBonus,
    );
    room.game = state;
    room.status = 'playing';
    beginEveningMatch(room.evening!, room.round, room.gameId, state, this.eveningPeople(room), this.now());
    this.log(`room ${room.code} round ${room.round} started (${room.players.length} players)`);
    this.commitEvents(room, events);
  }

  private act(conn: Conn, baseSeq: number, action: GameAction): void {
    const ctx = this.context(conn);
    if (!ctx) return;
    const { room, player } = ctx;
    if (room.status !== 'playing' || !room.game) return this.error(conn, 'illegal');
    if (baseSeq !== room.seq) return this.error(conn, 'stale');
    const result = applyAction(room.game, player.id, action, this.rng);
    if (!result.ok) return this.error(conn, 'illegal', ILLEGAL_TEXT[result.error as PrsiError]);
    room.game = result.state;
    this.afterGameChange(room);
    this.commitEvents(room, result.events);
  }

  private commitEvents(room: Room, events: GameEvent[]): void {
    this.broadcast(room, this.stamp(room, events));
    this.scheduleBot(room, events);
  }

  /**
   * Lets a bot act when it's its turn. The delay covers the clients' animations for the
   * events just sent plus a little "thinking", so bots never outrun what humans see.
   * Bots pause while no human is connected.
   */
  private scheduleBot(room: Room, events: GameEvent[]): void {
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
    this.ensureEvening(room);
    const index = room.players.findIndex((p) => p.id === playerId);
    if (index < 0) return;
    const [player] = room.players.splice(index, 1);
    if (player && !player.bot) room.departed.push({ ...player, conn: null, disconnectedAt: this.now() });
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
      this.afterGameChange(room, 'forfeit');
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

  private afterGameChange(room: Room, reason: 'cards' | 'forfeit' = 'cards'): void {
    const game = room.game!;
    if (game.phase === 'finished' && room.status !== 'finished') {
      const evening = this.ensureEvening(room);
      room.status = 'finished';
      if (!finishEveningMatch(evening, game, this.now(), reason)) return;
      for (const id of gameWinnerIds(game)) { const winner = room.players.find((p) => p.id === id); if (winner) winner.wins += 1; }
    }
  }

  private stamp(room: Room, events: GameEvent[]): SeqEngineEvent[] {
    return events.map((e) => ({ ...e, seq: ++room.seq }));
  }

  private broadcast(room: Room, events: SeqEngineEvent[], exceptId?: string): void {
    this.ensureEvening(room);
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

  private roomView(room: Room, viewerId: string): AnyRoomView {
    const evening = this.ensureEvening(room);
    return {
      evening: eveningView(evening),
      code: room.code,
      gameId: room.gameId, sedmaBonus: room.sedmaBonus,
      you: viewerId,
      hostId: room.hostId,
      status: room.status,
      players: room.players.map((p) => ({ id: p.id, name: p.name, connected: p.bot || !!p.conn, wins: p.wins, bot: p.bot, avatarId: p.avatarId ?? defaultAvatarId(p.id, p.bot) })),
      round: room.round,
      seq: room.seq,
      game: room.game ? viewFor(room.game, viewerId) : null,
    } as AnyRoomView;
  }

  private context(conn: Conn): { room: Room; player: Player } | null {
    const seat = this.seats.get(conn);
    const room = seat && this.rooms.get(seat.code);
    const player = room?.players.find((p) => p.id === seat!.playerId);
    if (!room || !player) {
      this.error(conn, 'not-in-room');
      return null;
    }
    this.ensureEvening(room);
    return { room, player };
  }

  private eveningPeople(room: Room) {
    return room.players.map((p) => ({ id: p.id, name: p.name, bot: p.bot, connected: p.bot || !!p.conn }));
  }
  private ensureEvening(room: Room) { return ensureRoomEvening(room, this.eveningPeople(room), this.now()); }
  private eveningCommand(conn: Conn, command: EveningCommand): void {
    const ctx = this.context(conn); if (!ctx) return;
    const { room, player } = ctx;
    try {
      const result = applyEveningCommand(room.evening!, this.eveningPeople(room), room.hostId, player.id, command, this.now());
      if (result.directive !== 'none') {
        if (room.botTimer) clearTimeout(room.botTimer);
        room.botTimer = null; room.game = null; room.status = 'lobby';
      }
      if (result.directive === 'start') { room.gameId = result.gameId!; this.start(conn, room.round); }
      else this.broadcast(room, []);
    } catch (error) {
      if (!(error instanceof EveningError)) throw error;
      this.error(conn, error.code, error.message);
      if (error.code === 'stale') this.sendState(room, player, [], true);
    }
  }

  /** A connection switching rooms behaves like a disconnect from the old one. */
  private detach(conn: Conn): void {
    if (this.seats.has(conn)) this.disconnect(conn);
  }

  private error(conn: Conn, code: ErrorCode, message?: string): void {
    conn.send({ t: 'error', code, message: message ?? ERROR_TEXT[code] });
  }

  private newPlayer(token: string, name: string, conn: Conn): Player {
    return { id: randomBytes(6).toString('base64url'), token, name, conn, disconnectedAt: null, wins: 0, bot: false, lastEmoteAt: null };
  }

  private newBot(room: Room): Player {
    const used = new Set(room.players.map((p) => p.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${room.players.length}`;
    return { id: randomBytes(6).toString('base64url'), token: randomBytes(16).toString('base64url'), name, avatarId: BOT_AVATAR_IDS[BOT_NAMES.indexOf(name)] ?? BOT_AVATAR_IDS[0], conn: null, disconnectedAt: null, wins: 0, bot: true, lastEmoteAt: null };
  }

  private newCode(): string {
    for (;;) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
  }
}
