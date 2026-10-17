/** Real local Auth + Edge + Postgres/RLS + Realtime + browser transport, without a browser. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chooseSedmaBotFromView, type ClientMessage, type AnyRoomView, type ServerMessage } from '@balik/shared';
import { SupabaseTransport } from '../packages/web/src/net/transports/supabase';

const status = JSON.parse(readFileSync(process.env.SUPABASE_STATUS_FILE ?? '/tmp/balik-supabase-status.json', 'utf8'));
const url = status.API_URL as string;
const key = (status.PUBLISHABLE_KEY ?? status.ANON_KEY) as string;
assert.ok(url && ['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'QA runs only against a local test project');
assert.ok(key, 'Local Supabase public key is missing');

// The transport uses per-tab session storage. This in-memory implementation lets the same
// client code prove reload reconnects in Node without accessing any browser UI.
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
} });
const transports: SupabaseTransport[] = [];
const anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function wait<T>(read: () => T | undefined | false, description: string, timeout = 20_000): Promise<T> {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = read(); if (value) return value as T; await sleep(50); }
  throw new Error(`Timed out: ${description}`);
}
function client(tab = crypto.randomUUID()) {
  const transport = new SupabaseTransport(url, key, tab); transports.push(transport);
  const messages: ServerMessage[] = [];
  let opened = false;
  let failure = '';
  transport.connect({ open: () => { opened = true; }, message: (message) => messages.push(message), close: () => {}, error: (message) => { failure = message; } });
  return {
    tab, transport, messages,
    connected: () => wait(() => { if (failure) throw new Error(failure); return opened; }, 'Realtime subscription'),
    send: (message: ClientMessage) => assert.equal(transport.send(message), true),
    state: (predicate: (room: AnyRoomView) => boolean = () => true) => wait(() => messages.filter((m) => m.t === 'state').reverse().find((m) => m.t === 'state' && predicate(m.room)) as Extract<ServerMessage, { t: 'state' }> | undefined, 'game state'),
  };
}

try {
  const a = client(), b = client();
  await Promise.all([a.connected(), b.connected()]);
  a.send({ t: 'create', name: 'Ada', token: 'qa-token-player-a-123' });
  const initial = await a.state(); const code = initial.room.code;
  b.send({ t: 'join', name: 'Max', token: 'qa-token-player-b-123', code });
  await Promise.all([a.state((r) => r.players.length === 2), b.state((r) => r.players.length === 2)]);
  a.send({ t: 'emote', emote: 'nice' });
  await Promise.all([wait(() => a.messages.find((m) => m.t === 'emote'), 'sender emote'), wait(() => b.messages.find((m) => m.t === 'emote' && m.emote === 'nice'), 'opponent emote')]);
  a.send({ t: 'emote', emote: 'gg' });
  await wait(() => a.messages.find((m) => m.t === 'error' && m.code === 'rate-limited'), 'server emote cooldown');
  a.send({ t: 'start' });
  const [aStart, bStart] = await Promise.all([a.state((r) => r.status === 'playing'), b.state((r) => r.status === 'playing')]);
  assert.equal(aStart.room.game!.myHand!.length, 4);
  assert.equal(bStart.room.game!.myHand!.length, 4);
  for (const card of bStart.room.game!.myHand!) assert.ok(!JSON.stringify(aStart).includes(`"${card.id}"`), 'No opponent hand leaks');

  // Repeat the actual action HTTP request concurrently; its UUID must make it idempotent.
  const originalFetch = globalThis.fetch;
  let duplicate: Promise<void> | null = null;
  globalThis.fetch = async (input, init) => {
    if (!duplicate && String(input).endsWith('/functions/v1/game') && typeof init?.body === 'string' && JSON.parse(init.body).message.t === 'act') {
      const requests = Promise.all([originalFetch(input, init), originalFetch(input, init)]);
      duplicate = requests.then(async ([first, second]) => {
        assert.equal(first.status, 200); assert.equal(second.status, 200);
        assert.deepEqual(await first.clone().json(), await second.json());
      });
      return (await requests)[0];
    }
    return originalFetch(input, init);
  };
  a.send({ t: 'act', baseSeq: aStart.room.seq, action: { type: 'draw' } });
  const [aDraw, bDraw] = await Promise.all([a.state((r) => r.seq > aStart.room.seq), b.state((r) => r.seq > bStart.room.seq)]);
  await duplicate; globalThis.fetch = originalFetch;
  assert.equal(aDraw.room.game!.myHand!.length, 5);
  const otherDraw = bDraw.events.find((e) => e.type === 'cardsDrawn');
  assert.ok(otherDraw && !('cards' in otherDraw), 'Hidden draw is filtered');

  a.transport.close();
  const resumed = client(a.tab); await resumed.connected();
  resumed.send({ t: 'join', name: 'Ada', token: 'qa-token-player-a-123', code });
  const snapshot = await resumed.state();
  assert.equal(snapshot.room.you, aStart.room.you);
  assert.deepEqual(snapshot.room.game!.myHand, aDraw.room.game!.myHand);
  assert.equal(snapshot.reset, true); assert.deepEqual(snapshot.events, []);
  assert.equal(resumed.messages.some((m) => m.t === 'emote'), false, 'Reconnect does not replay old emotes');

  // A separate authenticated outsider can read neither raw rooms nor somebody else's journal.
  const auth = await anon.auth.signInAnonymously(); assert.ifError(auth.error);
  const raw = await anon.from('balik_rooms').select('*'); assert.ok(raw.error);
  const inbox = await anon.from('balik_player_messages').select('*').eq('code', code); assert.ifError(inbox.error); assert.deepEqual(inbox.data, []);
  const forged = await anon.from('balik_player_messages').insert({ code, user_id: auth.data.user!.id, revision: 999, frame: {} }); assert.ok(forged.error);
  const rpc = await anon.rpc('balik_allow_request', { p_user_id: auth.data.user!.id }); assert.ok(rpc.error);

  resumed.send({ t: 'leave' }); b.send({ t: 'leave' });
  await wait(() => resumed.messages.find((m) => m.t === 'left'), 'leave acknowledgment');
  resumed.send({ t: 'create', name: 'Ada', token: 'qa-token-player-a-123', bots: 1 });
  const solo = await resumed.state((r) => r.code !== code && r.status === 'playing');
  resumed.send({ t: 'act', baseSeq: solo.room.seq, action: { type: 'draw' } });
  const drawn = await resumed.state((r) => r.code === solo.room.code && r.seq > solo.room.seq);
  resumed.send({ t: 'act', baseSeq: drawn.room.seq, action: { type: 'pass' } });
  const botTurn = await resumed.state((r) => r.code === solo.room.code && r.game!.currentPlayerId !== r.you);
  const botMove = await resumed.state((r) => r.code === solo.room.code && r.seq > botTurn.room.seq);
  assert.ok(botMove.events.length > 0);
  resumed.send({ t: 'leave' });
  await wait(() => resumed.messages.filter((m) => m.t === 'left').length >= 2, 'final leave acknowledgment');
  // Entire Sedma games through the actual frontend adapter, Auth, Edge and recipient journal.
  for (const count of [2, 4]) {
    const seats = Array.from({ length: count }, () => client());
    await Promise.all(seats.map((seat) => seat.connected()));
    seats[0]!.send({ t: 'create', name: 'Sedma host', token: 'qa-sedma-token-123456', gameId: 'sedma', sedmaBonus: count === 2 ? 0 : 10 });
    const created = await seats[0]!.state((r) => r.gameId === 'sedma');
    const sedmaCode = created.room.code;
    for (const seat of seats.slice(1)) seat.send({ t: 'join', code: sedmaCode, name: 'Sedma player', token: 'qa-sedma-token-123456' });
    await seats[0]!.state((r) => r.players.length === count);
    seats[0]!.send({ t: 'start' });
    let snapshots = await Promise.all(seats.map((seat) => seat.state((r) => r.status === 'playing')));
    const viewerIds = snapshots.map((frame) => frame.room.you);
    let reconnected = false;
    for (let step = 0; step < 70 && snapshots[0]!.room.status === 'playing'; step++) {
      const index = viewerIds.indexOf(snapshots[0]!.room.game!.currentPlayerId);
      let seat = seats[index]!;
      if (step === 1) {
        const before = snapshots[index]!; seat.transport.close();
        seat = client(seat.tab); seats[index] = seat; await seat.connected();
        seat.send({ t: 'join', code: sedmaCode, name: 'Sedma resumed', token: 'qa-sedma-token-123456' });
        const restored = await seat.state();
        assert.equal(restored.reset, true); assert.deepEqual(restored.events, []);
        assert.deepEqual(restored.room.game, before.room.game); reconnected = true;
      }
      const room = snapshots[index]!.room;
      assert.equal(room.gameId, 'sedma'); if (room.gameId !== 'sedma') throw new Error('Expected Sedma');
      const action = chooseSedmaBotFromView(room.game!, room.you);
      seat.send({ t: 'act', baseSeq: room.seq, action });
      snapshots = await Promise.all(seats.map((p) => p.state((r) => r.seq > room.seq)));
      for (const [i, snapshot] of snapshots.entries()) {
        assert.ok(!('drawPile' in snapshot.room.game!));
        for (const other of snapshots.filter((_, j) => j !== i)) for (const card of other.room.game!.myHand!) {
          assert.ok(!JSON.stringify(snapshot).includes(`"${card.id}"`), 'Sedma opponent hand stays private');
        }
      }
    }
    assert.ok(reconnected); const final = snapshots[0]!.room;
    assert.equal(final.status, 'finished'); if (final.gameId !== 'sedma') throw new Error('Expected Sedma');
    assert.equal(final.game!.scores.reduce((a,b) => a+b), count === 2 ? 80 : 90);
    assert.deepEqual(final.players.map((p) => p.wins), final.players.map((p) => final.game!.result!.winnerIds.includes(p.id) ? 1 : 0));
    seats[0]!.send({ t: 'rematch' });
    await Promise.all(seats.map((p) => p.state((r) => r.round === 2 && r.status === 'playing')));
    for (const seat of seats) seat.send({ t: 'leave' });
    await Promise.all(seats.map((p) => wait(() => p.messages.find((m) => m.t === 'left'), 'Sedma leave')));
  }
  console.log('PASS: Supabase Auth, JWT, idempotency, RLS, emotes, reconnect, bots; complete Sedma 1v1 and 2v2 with private hands, reconnect mid-trick, scores and rematches.');
} finally {
  transports.forEach((transport) => transport.close());
  await anon.removeAllChannels(); anon.auth.stopAutoRefresh();
}
