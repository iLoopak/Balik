import { EveningError, canStartGame, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@balik/shared';
import { execute, frameFor, GameError, newRoom, refreshPresence, scheduleBot, stamp,
  type Environment, type Reply, type Request } from './model';
import type { RoomRepository } from './ports';
export type { RoomRepository, Commit } from './ports';
export type { Room, Frame, Reply, Request, Delivery } from './model';

/** Portable application boundary; hosting, auth verification and delivery are adapters. */
export class RoomApplication {
  constructor(private readonly repository: RoomRepository, private readonly environment: () => Environment) {}

  async handle(userId: string, request: Request): Promise<Reply> {
    const receipt = await this.repository.receipt(userId, request.id);
    if (receipt) return receipt;
    const creating = request.message.t === 'create';
    const joining = request.message.t === 'join';
    if (request.message.t === 'create' && request.message.bots && !canStartGame(request.message.gameId ?? 'prsi', request.message.bots + 1)) {
      return { message: { t: 'error', code: 'not-enough-players', message: 'Sedma potřebuje přesně 2 nebo 4 hráče.' } };
    }
    const membership = await this.repository.membership(userId);
    const targetCode = request.message.t === 'join' ? request.message.code : request.code ?? membership;
    // Switching rooms is an explicit persisted leave, so the old room keeps functioning.
    if (membership && (creating || (joining && membership !== targetCode))) {
      const completed = await this.repository.receipt(userId, request.id);
      if (completed) return completed;
      await this.handle(userId, { id: `${request.id}:detach`, code: membership, message: { t: 'leave' } });
    }
    for (let attempt = 0; attempt < 12; attempt++) {
      const env = { ...this.environment(), connectionId: request.connectionId ?? userId };
      const code = creating ? this.code(env) : targetCode;
      if (!code) return { message: { t: 'error', code: 'not-in-room', message: 'Nejsi v žádné místnosti.' } };
      const original = creating ? null : await this.repository.load(code);
      if (!creating && !original) return { message: { t: 'error', code: 'room-not-found', message: 'Místnost s tímto kódem neexistuje.' } };
      const room = creating && request.message.t === 'create'
        ? newRoom(code, userId, request.message.name, env, request.message.gameId, request.message.sedmaBonus) : structuredClone(original!);
      // Merely knowing the room code does not authorize reads, heartbeats or bot execution.
      if (!creating && !joining && !room.players.some((p) => p.userId === userId)) {
        return { message: { t: 'error', code: 'not-in-room', message: 'Nejsi v této místnosti.' } };
      }
      if (!creating && !joining && request.connectionId && room.players.find((p) => p.userId === userId)?.connectionId !== request.connectionId) {
        return { message: { t: 'replaced' } };
      }
      const presence = refreshPresence(room, userId, env);
      try {
        const result = execute(room, userId, request.message, env);
        const events = [...presence.events, ...result.events];
        const stamped = stamp(room, events);
        scheduleBot(room, events, env);
        room.version = (original?.version ?? 0) + 1;
        room.updatedAt = env.now;
        const leaving = request.message.t === 'leave';
        const notify = creating || joining || presence.changed || result.changed;
        const deliveries = notify ? room.players.flatMap((p) => p.userId ? [{
          userId: p.userId,
          frame: { ...frameFor(room, p.userId, stamped, p.userId === userId && (creating || joining)), ...(result.signals ? { signals: result.signals } : {}) },
        }] : []) : [];
        const reply: Reply = leaving ? { message: { t: 'left' }, code } : {
          code, wakeAt: room.botDueAt,
          ...(creating || joining || request.message.t === 'sync' ? { frame: frameFor(room, userId, [], true) } : {}),
          ...(request.message.t === 'ping' ? { message: { t: 'pong' } as const } : {}),
        };
        const committed = await this.repository.commit({ userId, requestId: request.id, expectedVersion: original?.version ?? null, room, deliveries, reply });
        if (committed.status !== 'conflict') return committed.reply ?? reply;
      } catch (error) {
        if (!(error instanceof GameError) && !(error instanceof EveningError)) throw error;
        return {
          message: { t: 'error', code: error.code, message: error.message },
          ...(error.code === 'stale' && original ? { frame: frameFor(original, userId, [], true) } : {}),
        };
      }
    }
    throw new Error('Room transaction contention; retry with the same request id');
  }

  private code(env: Environment): string {
    return Array.from({ length: ROOM_CODE_LENGTH }, () => ROOM_CODE_ALPHABET[Math.floor(env.rng() * ROOM_CODE_ALPHABET.length)]!).join('');
  }
}
