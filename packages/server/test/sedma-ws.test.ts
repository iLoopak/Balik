import { expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { chooseSedmaBotFromView, type ClientMessage, type ServerMessage } from '@balik/shared';
import { startServer } from '../src/server';
const wait = async <T>(read: () => T | false | undefined): Promise<T> => {
  const until = Date.now() + 3000;
  while (Date.now() < until) { const result = read(); if (result) return result as T; await new Promise((r) => setTimeout(r, 10)); }
  throw new Error('WebSocket response timeout');
};
for (const count of [2, 4]) it(`real WebSocket Sedma: ${count} players, invalid packets, full round, reconnect, rematch`, async () => {
  const server = await startServer({ port: 0, host: '127.0.0.1' });
  const sockets: WebSocket[] = [];
  function seat() {
    const socket = new WebSocket(`ws://127.0.0.1:${server.port}/ws`); sockets.push(socket);
    const messages: ServerMessage[] = [];
    socket.on('message', (data) => messages.push(JSON.parse(data.toString())));
    return { socket, messages, send: (msg: ClientMessage) => socket.send(JSON.stringify(msg)),
      open: () => wait(() => socket.readyState === socket.OPEN),
      state: (after = -1) => wait(() => messages.filter((m) => m.t === 'state' && m.room.seq > after).at(-1) as Extract<ServerMessage, { t: 'state' }> | undefined) };
  }
  try {
    const seats = Array.from({ length: count }, seat); await Promise.all(seats.map((s) => s.open()));
    seats[0]!.socket.send(JSON.stringify({ t: 'create', gameId: 'fake' }));
    expect(await wait(() => seats[0]!.messages.find((m) => m.t === 'error'))).toMatchObject({ code: 'bad-message' });
    seats[0]!.send({ t: 'create', token: 'ws-sedma-token-0000', name: 'Host', gameId: 'sedma' });
    const code = (await seats[0]!.state()).room.code;
    for (let i = 1; i < count; i++) seats[i]!.send({ t: 'join', code, token: `ws-sedma-token-000${i}`, name: `P${i}` });
    await wait(() => seats[0]!.messages.filter((m) => m.t === 'state').at(-1)?.room.players.length === count);
    seats[0]!.send({ t: 'start' });
    let states = await Promise.all(seats.map((s) => s.state(0)));
    for (let step = 0; step < 70 && states[0]!.room.status === 'playing'; step++) {
      const index = states.findIndex((s) => s.room.you === states[0]!.room.game!.currentPlayerId);
      if (step === 1) {
        const before = states[index]!; seats[index]!.socket.terminate();
        const resumed = seat(); seats[index] = resumed; await resumed.open();
        resumed.send({ t: 'join', code, token: `ws-sedma-token-000${index}`, name: `P${index}` });
        const snapshot = await resumed.state(); expect(snapshot.reset).toBe(true); expect(snapshot.events).toEqual([]); expect(snapshot.room.game).toEqual(before.room.game);
      }
      const room = states[index]!.room;
      if (room.gameId !== 'sedma') throw new Error('Expected Sedma');
      seats[index]!.send({ t: 'act', baseSeq: room.seq, action: chooseSedmaBotFromView(room.game!, room.you) });
      states = await Promise.all(seats.map((s) => s.state(room.seq)));
      for (const [i, state] of states.entries()) for (const other of states.filter((_, j) => i !== j)) for (const card of other.room.game!.myHand!) expect(JSON.stringify(state)).not.toContain(`"${card.id}"`);
      // Keep the real per-socket abuse limiter enabled during the test.
      await new Promise((r) => setTimeout(r, 80));
    }
    const final = states[0]!.room;
    expect(final.status).toBe('finished'); expect(final.game).toMatchObject({ scores: expect.any(Array), result: { reason: 'points' } });
    seats[0]!.send({ t: 'rematch' });
    expect((await seats[0]!.state(final.seq)).room).toMatchObject({ gameId: 'sedma', round: 2, status: 'playing' });
  } finally { sockets.forEach((s) => s.terminate()); await server.close(); }
}, 15000);
