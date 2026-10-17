import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import {
  chooseBotAction, chooseSedmaBotFromView, type AnyRoomView,
  createRound,
  legalMoves,
  legalMovesFromView,
  applyAction,
  mulberry32,
  type ClientMessage,
  type RoomView,
  type ServerMessage,
} from '@balik/shared';
import { RoomManager, type Conn } from '../src/rooms';
import { startServer } from '../src/server';
import { clientMessageSchema } from '@balik/shared/schema';

class StubConn implements Conn {
  messages: ServerMessage[] = [];
  send(msg: ServerMessage) {
    this.messages.push(structuredClone(msg));
  }
  get states() {
    return this.messages.filter((m): m is Extract<ServerMessage, { t: 'state' }> => m.t === 'state');
  }
  get last(): RoomView {
    const s = this.states.at(-1);
    if (!s) throw new Error('no state yet');
    if (s.room.gameId !== 'prsi') throw new Error('Expected Prší');
    return s.room;
  }
  get lastError() {
    return this.messages.filter((m) => m.t === 'error').at(-1);
  }
}

const tok = (n: number) => `token-${String(n).padStart(12, '0')}`;

describe('public cosmetic identity', () => {
  it('validates ids and cannot target another seat or inject an asset URL', () => {
    for (const avatarId of ['https://evil.test/avatar.png', '../sova', '__proto__', '', 7]) {
      expect(clientMessageSchema.safeParse({ t: 'profile', avatarId }).success).toBe(false);
    }
    expect(clientMessageSchema.parse({ t: 'profile', avatarId: 'sova', playerId: 'other' })).toEqual({ t: 'profile', avatarId: 'sova' });
  });
  it('broadcasts avatars, preserves game views and reconnects with the saved identity', () => {
    const s = setup(); const [a, b] = s.conns as [StubConn, StubConn];
    s.rooms.handle(a, { t: 'profile', avatarId: 'vega' });
    s.rooms.handle(b, { t: 'profile', avatarId: 'sova' });
    s.rooms.handle(a, { t: 'start' });
    const before = structuredClone(a.last);
    s.rooms.handle(b, { t: 'profile', avatarId: 'gambit' });
    expect(a.last.players.find(p => p.id === b.last.you)?.avatarId).toBe('gambit');
    expect(a.last.players.find(p => p.id === a.last.you)?.avatarId).toBe('vega');
    expect(a.last.game).toEqual(before.game);
    expect(a.last.evening).toEqual(before.evening);
    expect(a.last.seq).toBe(before.seq);
    expect(a.states.at(-1)).toMatchObject({ reset: false, events: [] });
    s.rooms.disconnect(b);
    const replacement = new StubConn();
    s.rooms.handle(replacement, { t: 'join', code: s.code, token: tok(1), name: 'P1' });
    expect(replacement.last.players.find(p => p.id === replacement.last.you)?.avatarId).toBe('gambit');
    expect(replacement.last.game).toEqual(b.last.game);
  });
});

function setup(players = 2) {
  let now = 1_000_000;
  const rooms = new RoomManager({ rng: mulberry32(1), now: () => now });
  const conns = Array.from({ length: players }, () => new StubConn());
  rooms.handle(conns[0]!, { t: 'create', token: tok(0), name: 'Host' });
  const code = conns[0]!.last.code;
  for (let i = 1; i < players; i++) rooms.handle(conns[i]!, { t: 'join', token: tok(i), name: `P${i}`, code });
  return { rooms, conns, code, advance: (ms: number) => (now += ms) };
}

/** Plays legal moves until the round ends; returns all conns' messages. */
function playOut(rooms: RoomManager, conns: StubConn[]) {
  for (let step = 0; step < 3000; step++) {
    const views = conns.map((c) => c.last);
    if (views[0]!.status !== 'playing') return;
    const turnIdx = views.findIndex((v) => v.game!.currentPlayerId === v.you);
    const view = views[turnIdx]!;
    const moves = legalMovesFromView(view.game!, view.you);
    const id = moves.playable[0];
    const msg: ClientMessage = id
      ? { t: 'act', baseSeq: view.seq, action: { type: 'play', cardId: id, chosenSuit: id.endsWith('-Q') ? 'hearts' : undefined } }
      : { t: 'act', baseSeq: view.seq, action: moves.canPass ? { type: 'pass' } : { type: 'draw' } };
    rooms.handle(conns[turnIdx]!, msg);
  }
  throw new Error('round did not finish');
}

describe('Sedma RoomManager', () => {
  for (const count of [2, 4]) it(`plays a complete ${count}-seat multiplayer game, reconnect and rematch`, () => {
    const rooms = new RoomManager({ rng: mulberry32(8) });
    class Seat implements Conn {
      messages: ServerMessage[] = [];
      send(msg: ServerMessage) { this.messages.push(structuredClone(msg)); }
      get room(): AnyRoomView { return this.messages.filter((m) => m.t === 'state').at(-1)!.room; }
    }
    const seats = Array.from({ length: count }, () => new Seat());
    rooms.handle(seats[0]!, { t: 'create', token: tok(0), name: 'Host', gameId: 'sedma' });
    const code = seats[0]!.room.code;
    for (let i = 1; i < count; i++) rooms.handle(seats[i]!, { t: 'join', code, token: tok(i), name: `P${i}` });
    rooms.handle(seats[0]!, { t: 'start' });
    for (let step = 0; step < 70; step++) {
      const view = seats[0]!.room;
      if (view.status === 'finished') break;
      const index = seats.findIndex((seat) => seat.room.you === view.game!.currentPlayerId);
      let seat = seats[index]!;
      if (step === 1) {
        const before = seat.room.game; rooms.disconnect(seat); seat = new Seat(); seats[index] = seat;
        rooms.handle(seat, { t: 'join', code, token: tok(index), name: `P${index}` });
        expect(seat.room.game).toEqual(before); expect(seat.messages[0]).toMatchObject({ reset: true, events: [] });
      }
      const room = seat.room;
      if (room.gameId !== 'sedma' || !room.game) throw new Error('Expected Sedma');
      const action = chooseSedmaBotFromView(room.game, room.you);
      rooms.handle(seat, { t: 'act', baseSeq: room.seq, action });
      expect(seat.messages.at(-1)!.t).toBe('state');
      rooms.handle(seat, { t: 'act', baseSeq: room.seq, action });
      expect(seat.messages.at(-1)).toMatchObject({ t: 'error', code: seat.room.status === 'finished' ? 'illegal' : 'stale' });
    }
    const final = seats[0]!.room;
    expect(final.status).toBe('finished');
    if (final.gameId !== 'sedma') throw new Error('Expected Sedma');
    expect(final.game!.scores.reduce((a, b) => a + b)).toBe(90);
    expect(final.players.map((p) => p.wins)).toEqual(final.players.map((p) => final.game!.result!.winnerIds.includes(p.id) ? 1 : 0));
    rooms.handle(seats[0]!, { t: 'rematch' }); expect(seats[0]!.room.round).toBe(2);
    expect(seats[0]!.room.players.map((p) => p.wins)).toEqual(final.players.map((p) => p.wins));
  });
  it('does not start three players or accept a Prší action in Sedma', () => {
    const rooms = new RoomManager(); const seats = [new StubConn(), new StubConn(), new StubConn()];
    rooms.handle(seats[0]!, { t: 'create', token: tok(0), name: 'Host', gameId: 'sedma' });
    const state = seats[0]!.states.at(-1)!.room;
    for (let i = 1; i < 3; i++) rooms.handle(seats[i]!, { t: 'join', code: state.code, token: tok(i), name: 'P' });
    rooms.handle(seats[0]!, { t: 'start' }); expect(seats[0]!.lastError).toMatchObject({ code: 'not-enough-players' });
    rooms.handle(seats[2]!, { t: 'leave' }); rooms.handle(seats[0]!, { t: 'start' });
    const room = seats[0]!.states.at(-1)!.room;
    rooms.handle(seats[0]!, { t: 'act', baseSeq: room.seq, action: { type: 'draw' } });
    expect(seats[0]!.lastError).toMatchObject({ code: 'illegal' });
    rooms.handle(seats[1]!, { t: 'leave' }); expect(seats[0]!.states.at(-1)!.room.game).toMatchObject({ result: { reason: 'forfeit', winnerTeam: 0 } });
  });
});

describe('RoomManager', () => {
  it('validates reactions, delivers them to every player and retains cooldown across reconnect', () => {
    expect(clientMessageSchema.safeParse({ t: 'emote', emote: '<script>bad</script>' }).success).toBe(false);
    const { rooms, conns, code, advance } = setup(2);
    rooms.handle(conns[0]!, { t: 'emote', emote: 'gg' });
    expect(conns[1]!.messages.at(-1)).toMatchObject({ t: 'emote', emote: 'gg', playerId: conns[0]!.last.you });
    rooms.disconnect(conns[0]!); const fresh = new StubConn();
    rooms.handle(fresh, { t: 'join', code, token: tok(0), name: 'Host' });
    expect(fresh.messages.some((m) => m.t === 'emote')).toBe(false);
    rooms.handle(fresh, { t: 'emote', emote: 'nice' }); expect(fresh.lastError?.code).toBe('rate-limited');
    advance(2500); rooms.handle(fresh, { t: 'emote', emote: 'nice' });
    expect(fresh.messages.at(-1)).toMatchObject({ t: 'emote', emote: 'nice' });
  });

  it('returns the same room to lobby after a round without losing scores', () => {
    const { rooms, conns } = setup(2); rooms.handle(conns[0]!, { t: 'start' });
    rooms.handle(conns[0]!, { t: 'lobby' }); expect(conns[0]!.lastError?.code).toBe('game-in-progress');
    playOut(rooms, conns); const players = conns[0]!.last.players;
    rooms.handle(conns[1]!, { t: 'lobby' }); expect(conns[1]!.lastError?.code).toBe('not-host');
    rooms.handle(conns[0]!, { t: 'lobby' });
    expect(conns[0]!.last.status).toBe('lobby'); expect(conns[0]!.last.game).toBeNull();
    expect(conns[0]!.last.players).toEqual(players);
    rooms.handle(conns[0]!, { t: 'start' }); expect(conns[0]!.last.round).toBe(2);
  });
  it('creates a room, lets players join and only the host start', () => {
    const { rooms, conns } = setup(3);
    expect(conns[0]!.last.players.map((p) => p.name)).toEqual(['Host', 'P1', 'P2']);
    rooms.handle(conns[1]!, { t: 'start' });
    expect(conns[1]!.lastError).toMatchObject({ code: 'not-host' });
    rooms.handle(conns[0]!, { t: 'start' });
    for (const c of conns) {
      expect(c.last.status).toBe('playing');
      expect(c.last.game!.myHand).toHaveLength(4);
    }
    const started = conns[1]!.states.at(-1)!;
    expect(started.events.map((e) => e.type)).toEqual(['roundStarted', 'turnChanged']);
    expect(started.events.map((e) => e.seq)).toEqual([1, 2]);
  });

  it('refuses to start alone and refuses joins mid-game', () => {
    const { rooms, conns } = setup(1);
    rooms.handle(conns[0]!, { t: 'start' });
    expect(conns[0]!.lastError).toMatchObject({ code: 'not-enough-players' });

    const two = setup(2);
    two.rooms.handle(two.conns[0]!, { t: 'start' });
    const late = new StubConn();
    two.rooms.handle(late, { t: 'join', token: tok(9), name: 'Late', code: two.code });
    expect(late.lastError).toMatchObject({ code: 'game-in-progress' });
  });

  it('rejects stale and out-of-turn actions', () => {
    const { rooms, conns } = setup(2);
    rooms.handle(conns[0]!, { t: 'start' });
    const view = conns[0]!.last;
    const turnIdx = view.game!.currentPlayerId === conns[0]!.last.you ? 0 : 1;
    const other = 1 - turnIdx;
    rooms.handle(conns[other]!, { t: 'act', baseSeq: view.seq, action: { type: 'draw' } });
    expect(conns[other]!.lastError).toMatchObject({ code: 'illegal' });
    rooms.handle(conns[turnIdx]!, { t: 'act', baseSeq: view.seq - 1, action: { type: 'draw' } });
    expect(conns[turnIdx]!.lastError).toMatchObject({ code: 'stale' });
    // A double-submitted action with the same baseSeq only applies once.
    rooms.handle(conns[turnIdx]!, { t: 'act', baseSeq: view.seq, action: { type: 'draw' } });
    rooms.handle(conns[turnIdx]!, { t: 'act', baseSeq: view.seq, action: { type: 'draw' } });
    expect(conns[turnIdx]!.lastError).toMatchObject({ code: 'stale' });
  });

  it('never leaks other players’ hidden cards', () => {
    const { rooms, conns } = setup(3);
    rooms.handle(conns[0]!, { t: 'start' });
    playOut(rooms, conns);
    // Rebuild the set of cards each player held at any time from their own messages,
    // then check nobody else ever received those ids while they were hidden.
    for (const [i, conn] of conns.entries()) {
      for (const msg of conn.states) {
        if (msg.room.gameId !== 'prsi') throw new Error('Expected Prší');
        const game = msg.room.game;
        if (!game) continue;
        for (const [j, other] of conns.entries()) {
          if (i === j) continue;
          const otherState = other.states.find((s) => s.room.seq === msg.room.seq);
          const hidden = otherState?.room.game?.myHand?.map((c) => c.id) ?? [];
          const visible = new Set(game.discardTop.map((c) => c.id));
          const json = JSON.stringify({ room: msg.room, events: msg.events.filter((e) => e.type !== 'cardPlayed') });
          for (const id of hidden) if (!visible.has(id)) expect(json).not.toContain(`"${id}"`);
        }
      }
    }
    expect(conns[0]!.last.status).toBe('finished');
    const winner = conns[0]!.last.players.find((p) => p.wins === 1);
    expect(winner?.id).toBe(conns[0]!.last.game!.winnerId);
  });

  it('assigns strictly increasing sequence numbers without gaps', () => {
    const { rooms, conns } = setup(2);
    rooms.handle(conns[0]!, { t: 'start' });
    playOut(rooms, conns);
    const seqs = conns[1]!.states.flatMap((s) => s.events.map((e) => e.seq));
    expect(seqs).toEqual(seqs.map((_, i) => i + 1));
    expect(conns[1]!.last.seq).toBe(seqs.at(-1));
  });

  it('reconnects a player into the same seat with a fresh snapshot', () => {
    const { rooms, conns, code } = setup(2);
    rooms.handle(conns[0]!, { t: 'start' });
    const before = conns[1]!.last;
    rooms.disconnect(conns[1]!);
    expect(conns[0]!.last.players[1]!.connected).toBe(false);

    const fresh = new StubConn();
    rooms.handle(fresh, { t: 'join', token: tok(1), name: 'P1', code });
    const snap = fresh.states.at(-1)!;
    expect(snap.reset).toBe(true);
    expect(snap.events).toEqual([]);
    expect(snap.room.you).toBe(before.you);
    expect(snap.room.game!.myHand).toEqual(before.game!.myHand);
    expect(conns[0]!.last.players[1]!.connected).toBe(true);
  });

  it('replaces an older connection using the same token (duplicated tab)', () => {
    const { rooms, conns, code } = setup(2);
    const dup = new StubConn();
    rooms.handle(dup, { t: 'join', token: tok(1), name: 'P1', code });
    expect(conns[1]!.messages.at(-1)).toEqual({ t: 'replaced' });
    expect(dup.last.players).toHaveLength(2);
  });

  it('frees lobby seats after the grace period and hands over host', () => {
    const { rooms, conns, advance } = setup(3);
    rooms.disconnect(conns[0]!);
    advance(60_000);
    rooms.sweep();
    expect(conns[1]!.last.players.map((p) => p.name)).toEqual(['P1', 'P2']);
    expect(conns[1]!.last.hostId).toBe(conns[1]!.last.you);
  });

  it('removes a leaver mid-game and keeps the game going', () => {
    const { rooms, conns } = setup(3);
    rooms.handle(conns[0]!, { t: 'start' });
    rooms.handle(conns[2]!, { t: 'leave' });
    expect(conns[2]!.messages.at(-1)).toEqual({ t: 'left' });
    const view = conns[0]!.last;
    expect(view.players).toHaveLength(2);
    expect(view.game!.players).toHaveLength(2);
    expect(view.status).toBe('playing');
    const removed = conns[0]!.states.at(-1)!.events;
    expect(removed[0]).toMatchObject({ type: 'playerRemoved' });
  });

  it('supports a rematch with the same players', () => {
    const { rooms, conns } = setup(2);
    rooms.handle(conns[0]!, { t: 'start' });
    playOut(rooms, conns);
    rooms.handle(conns[0]!, { t: 'rematch' });
    expect(conns[1]!.last.status).toBe('playing');
    expect(conns[1]!.last.round).toBe(2);
  });
});

describe('bots (single player)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('solo create adds bots, starts at once and bots play when it is their turn', () => {
    vi.useFakeTimers();
    const rooms = new RoomManager({ rng: mulberry32(3), botPace: 0 });
    const me = new StubConn();
    rooms.handle(me, { t: 'create', token: tok(0), name: 'Solo', bots: 2 });
    expect(me.last.status).toBe('playing');
    expect(me.last.players.filter((p) => p.bot)).toHaveLength(2);
    expect(me.last.players.every((p) => p.connected)).toBe(true);
    // Human plays legal moves whenever it's their turn; bots answer via timers.
    for (let i = 0; i < 2000 && me.last.status === 'playing'; i++) {
      const v = me.last;
      if (v.game!.currentPlayerId === v.you) {
        const moves = legalMovesFromView(v.game!, v.you);
        const id = moves.playable[0];
        rooms.handle(me, {
          t: 'act',
          baseSeq: v.seq,
          action: id ? { type: 'play', cardId: id, chosenSuit: id.endsWith('-Q') ? 'clubs' : undefined } : moves.canPass ? { type: 'pass' } : { type: 'draw' },
        });
      } else {
        vi.runOnlyPendingTimers();
      }
    }
    expect(me.last.status).toBe('finished');
    expect(me.last.players.reduce((n, p) => n + p.wins, 0)).toBe(1);
  });

  it('bots pause while no human is connected', () => {
    vi.useFakeTimers();
    const rooms = new RoomManager({ rng: mulberry32(4), botPace: 0 });
    const me = new StubConn();
    rooms.handle(me, { t: 'create', token: tok(0), name: 'Solo', bots: 1 });
    rooms.disconnect(me);
    const seq = me.last.seq;
    vi.advanceTimersByTime(60_000);
    const back = new StubConn();
    rooms.handle(back, { t: 'join', token: tok(0), name: 'Solo', code: me.last.code });
    expect(back.last.seq).toBe(seq);
  });

  it('only the host adds/removes bots, and only in the lobby', () => {
    const { rooms, conns } = setup(2);
    rooms.handle(conns[1]!, { t: 'addBot' });
    expect(conns[1]!.lastError).toMatchObject({ code: 'not-host' });
    rooms.handle(conns[0]!, { t: 'addBot' });
    const bot = conns[0]!.last.players.find((p) => p.bot)!;
    expect(bot).toBeTruthy();
    rooms.handle(conns[0]!, { t: 'removeBot', playerId: bot.id });
    expect(conns[0]!.last.players.some((p) => p.bot)).toBe(false);
  });

  it('closes the room when the last human leaves', () => {
    const rooms = new RoomManager({ rng: mulberry32(5), botPace: 0 });
    const me = new StubConn();
    rooms.handle(me, { t: 'create', token: tok(0), name: 'Solo', bots: 3 });
    expect(rooms.roomCount).toBe(1);
    rooms.handle(me, { t: 'leave' });
    expect(rooms.roomCount).toBe(0);
  });

  it('bot strategy only ever picks legal actions', () => {
    for (let seed = 0; seed < 200; seed++) {
      const r = mulberry32(seed);
      let { state } = createRound(['a', 'b', 'c'], seed, r);
      for (let i = 0; i < 400 && state.phase === 'playing'; i++) {
        const me = state.players[state.currentIndex]!.id;
        const action = chooseBotAction(state, r);
        const moves = legalMoves(state, me);
        if (action.type === 'play') expect(moves.playable).toContain(action.cardId);
        if (action.type === 'pass') expect(moves.canPass).toBe(true);
        if (action.type === 'draw') expect(moves.canDraw).toBe(true);
        const res = applyAction(state, me, action, r);
        if (!res.ok) throw new Error(res.error);
        state = res.state;
      }
    }
  });
});

describe('WebSocket server', () => {
  let server: Awaited<ReturnType<typeof startServer>>;
  beforeAll(async () => {
    server = await startServer({ port: 0, host: '127.0.0.1' });
  });
  afterAll(async () => {
    await server.close();
  });

  function client() {
    const ws = new WebSocket(`ws://127.0.0.1:${server.port}/ws`);
    const inbox: ServerMessage[] = [];
    const waiters: Array<() => void> = [];
    ws.on('message', (d) => {
      inbox.push(JSON.parse(d.toString()));
      waiters.splice(0).forEach((w) => w());
    });
    const opened = new Promise<void>((r) => ws.on('open', () => r()));
    return {
      ws,
      inbox,
      opened,
      send: (m: unknown) => ws.send(JSON.stringify(m)),
      async next(pred: (m: ServerMessage) => boolean): Promise<ServerMessage> {
        for (;;) {
          const found = inbox.find(pred);
          if (found) {
            inbox.splice(inbox.indexOf(found), 1);
            return found;
          }
          await new Promise<void>((r) => waiters.push(r));
        }
      },
    };
  }

  it('runs create → join → start → reconnect over real sockets', async () => {
    const a = client();
    const b = client();
    await Promise.all([a.opened, b.opened]);

    a.send({ t: 'create', token: tok(100), name: 'Alice' });
    const created = (await a.next((m) => m.t === 'state')) as Extract<ServerMessage, { t: 'state' }>;
    const code = created.room.code;

    b.send({ t: 'join', token: tok(101), name: 'Bob', code });
    await b.next((m) => m.t === 'state');
    a.send({ t: 'emote', emote: 'gg' });
    expect(await b.next((m) => m.t === 'emote')).toMatchObject({ emote: 'gg', playerId: created.room.you });
    a.send({ t: 'emote', emote: 'nice' });
    expect(await a.next((m) => m.t === 'error')).toMatchObject({ code: 'rate-limited' });
    a.send({ t: 'start' });
    const started = (await b.next((m) => m.t === 'state' && m.room.status === 'playing')) as Extract<ServerMessage, { t: 'state' }>;
    expect(started.room.game!.myHand).toHaveLength(4);

    // Garbage is rejected without killing the connection.
    b.send({ t: 'act', baseSeq: -1, action: { type: 'nope' } });
    expect(await b.next((m) => m.t === 'error')).toMatchObject({ code: 'bad-message' });

    b.ws.close();
    await a.next((m) => m.t === 'state' && m.room.players.some((p) => !p.connected));
    const b2 = client();
    await b2.opened;
    b2.send({ t: 'join', token: tok(101), name: 'Bob', code });
    const snap = (await b2.next((m) => m.t === 'state')) as Extract<ServerMessage, { t: 'state' }>;
    expect(snap.reset).toBe(true);
    expect(snap.room.game!.myHand).toEqual(started.room.game!.myHand);
    a.ws.close();
    b2.ws.close();
  });
});
