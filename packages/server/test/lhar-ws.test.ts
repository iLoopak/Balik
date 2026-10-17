import { expect, it } from 'vitest';
import { WebSocket } from 'ws';
import {
  chooseLharBotFromView,
  mulberry32,
  type AnyRoomView,
  type ClientMessage,
  type ServerMessage,
} from '@balik/shared';
import { startServer } from '../src/server';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function wait<T>(read: () => T | false | undefined): Promise<T> {
  const end = Date.now() + 4000;
  while (Date.now() < end) {
    const v = read();
    if (v) return v as T;
    await pause(10);
  }
  throw Error('Lhar WS timeout');
}
for (const count of [2, 3])
  it(`real WebSocket Lhář: ${count} clients, challenge, privacy, reconnect, full game and rematch`, async () => {
    const server = await startServer({ host: '127.0.0.1', port: 0 }),
      sockets: WebSocket[] = [];
    function seat() {
      const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws`);
      sockets.push(socket);
      const messages: ServerMessage[] = [];
      socket.on('message', (data) => messages.push(JSON.parse(data.toString())));
      return {
        socket,
        messages,
        open: () => wait(() => socket.readyState === socket.OPEN),
        send: (m: ClientMessage) => socket.send(JSON.stringify(m)),
        state: (predicate: (r: AnyRoomView) => boolean = () => true) =>
          wait(
            () =>
              messages.filter((m) => m.t === 'state' && predicate(m.room)).at(-1) as
                | Extract<ServerMessage, { t: 'state' }>
                | undefined,
          ),
      };
    }
    try {
      const seats = Array.from({ length: count }, seat);
      await Promise.all(seats.map((s) => s.open()));
      seats[0]!.send({ t: 'create', token: 'lhar-wire-player-0000', name: 'Host', gameId: 'lhar' });
      const code = (await seats[0]!.state()).room.code;
      for (let i = 1; i < count; i++)
        seats[i]!.send({ t: 'join', token: `lhar-wire-player-000${i}`, name: `P${i}`, code });
      await seats[0]!.state((r) => r.players.length === count);
      seats[0]!.send({ t: 'start' });
      let frames = await Promise.all(seats.map((s) => s.state((r) => r.status === 'playing'))),
        resolutions = 0;
      for (let turn = 0; turn < 1500 && frames[0]!.room.status === 'playing'; turn++) {
        const current = frames[0]!.room.game!.currentPlayerId,
          index = frames.findIndex((f) => f.room.you === current);
        const room = frames[index]!.room;
        if (room.gameId !== 'lhar') throw Error('Expected Lhar');
        if (turn === 1) {
          const before = frames[index]!;
          seats[index]!.socket.terminate();
          const resumed = seat();
          seats[index] = resumed;
          await resumed.open();
          resumed.send({ t: 'join', code, token: `lhar-wire-player-000${index}`, name: `P${index}` });
          const snapshot = await resumed.state();
          expect(snapshot.reset).toBe(true);
          expect(snapshot.events).toEqual([]);
          expect(snapshot.room.game).toEqual(before.room.game);
        }
        let action = chooseLharBotFromView(room.game!, room.you, mulberry32(turn + count * 50));
        if (turn === 0)
          action = {
            type: 'lharPlay',
            cardIds: [room.game!.myHand!.find((c) => c.rank !== '7')!.id],
            declaredRank: '7',
          };
        if (turn === 1) action = { type: 'lharChallenge', claimId: room.game!.lastClaim!.id };
        seats[index]!.send({ t: 'act', baseSeq: room.seq, action });
        frames = await Promise.all(seats.map((s) => s.state((r) => r.seq > room.seq)));
        resolutions += frames[0]!.events.filter((e) => e.type === 'lharResolved').length;
        for (const [i, f] of frames.entries()) {
          if (f.room.gameId !== 'lhar') throw Error();
          expect(f.room.game).not.toHaveProperty('pile');
          if (f.room.game!.lastClaim) expect(f.room.game!.lastClaim).not.toHaveProperty('cards');
          for (const p of f.room.game!.players) expect(p).not.toHaveProperty('hand');
          const publicIds = new Set([
            ...(f.room.game!.lastResolution?.revealed.map((c) => c.id) ?? []),
            ...f.events.flatMap((e) =>
              e.type === 'lharResolved' ? e.resolution.revealed.map((c) => c.id) : [],
            ),
          ]);
          for (const other of frames.filter((_, j) => i !== j))
            for (const card of other.room.game!.myHand ?? [])
              if (!publicIds.has(card.id)) expect(JSON.stringify(f)).not.toContain(`"${card.id}"`);
        }
        if (turn === 0) {
          const before = seats[index]!.messages.length;
          seats[index]!.send({ t: 'act', baseSeq: room.seq, action });
          await wait(() =>
            seats[index]!.messages.slice(before).some((m) => m.t === 'error' && m.code === 'stale'),
          );
        }
        await pause(65); // Exercise the production socket rate limiter without disabling it.
      }
      const final = frames[0]!.room;
      expect(final.status).toBe('finished');
      expect(resolutions).toBeGreaterThan(0);
      expect(final.evening!.gameCounts.lhar).toBe(1);
      expect(final.evening!.history[0]!.winnerIds).toHaveLength(1);
      seats[0]!.send({ t: 'rematch', round: final.round });
      const rematch = await seats[0]!.state((r) => r.round === 2);
      expect(rematch.room.game).toMatchObject({
        lastClaim: null,
        lastResolution: null,
        pileCount: 0,
        history: [],
      });
    } finally {
      sockets.forEach((s) => s.terminate());
      await server.close();
    }
  }, 60000);
