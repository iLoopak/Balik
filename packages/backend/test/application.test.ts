import { describe, expect, it } from 'vitest';
import { chooseBotAction, mulberry32, type ClientMessage } from '@balik/shared';
import { RoomApplication, type Commit, type Frame, type Reply, type Room, type RoomRepository } from '../src/application';
import { gameHttpHandler } from '../src/adapters/http';

class MemoryRepository implements RoomRepository {
  rooms = new Map<string, Room>();
  receipts = new Map<string, Reply>();
  journal = new Map<string, Frame[]>();
  async load(code: string) { return structuredClone(this.rooms.get(code) ?? null); }
  async membership(id: string) { return [...this.rooms.values()].find((r) => r.players.some((p) => p.userId === id))?.code ?? null; }
  async receipt(id: string, request: string) { return structuredClone(this.receipts.get(`${id}:${request}`) ?? null); }
  async commit(value: Commit) {
    const key = `${value.userId}:${value.requestId}`;
    const receipt = this.receipts.get(key);
    if (receipt) return { status: 'replay' as const, reply: structuredClone(receipt) };
    if ((this.rooms.get(value.room.code)?.version ?? null) !== value.expectedVersion) return { status: 'conflict' as const };
    if (value.room.players.some((p) => !p.bot)) this.rooms.set(value.room.code, structuredClone(value.room));
    else this.rooms.delete(value.room.code);
    this.receipts.set(key, structuredClone(value.reply));
    for (const delivery of value.deliveries) {
      const list = this.journal.get(delivery.userId) ?? [];
      list.push(structuredClone(delivery.frame)); this.journal.set(delivery.userId, list);
    }
    return { status: 'ok' as const, reply: value.reply };
  }
}
function setup() {
  const repository = new MemoryRepository();
  let now = 1_000_000;
  const env = () => ({ now, rng: mulberry32(now), id: () => crypto.randomUUID() });
  let app = new RoomApplication(repository, env);
  const send = (user: string, message: ClientMessage | { t: 'tick' } | { t: 'sync' }, code?: string, id = crypto.randomUUID()) => app.handle(user, { id, code, message });
  const create = async (bots = 0) => (await send('a', { t: 'create', name: 'Ada', token: 'token-123456789012', bots })).code!;
  const join = (code: string, user = 'b') => send(user, { t: 'join', code, name: user, token: 'token-123456789012' });
  const last = (user = 'a') => repository.journal.get(user)!.at(-1)!;
  return { repository, send, create, join, last, advance: (ms: number) => { now += ms; }, restart: () => { app = new RoomApplication(repository, env); } };
}

describe('portable persisted multiplayer', () => {
  it('creates, joins, restricts host actions and survives an application restart', async () => {
    const s = setup(); const code = await s.create();
    await s.join(code);
    expect((await s.send('b', { t: 'start' }, code)).message).toMatchObject({ code: 'not-host' });
    await s.send('a', { t: 'start' }, code);
    const before = s.last('b');
    expect(before.message.room.game!.myHand).toHaveLength(4);
    s.restart();
    const rejoined = await s.join(code);
    expect(rejoined.frame!.message.reset).toBe(true);
    expect(rejoined.frame!.message.events).toEqual([]);
    expect(rejoined.frame!.message.room.game!.myHand).toEqual(before.message.room.game!.myHand);
  });

  it('commits one move across parallel workers and returns receipts for lost responses', async () => {
    const s = setup(); const code = await s.create(); await s.join(code); await s.send('a', { t: 'start' }, code);
    const seq = s.last().message.room.seq;
    const id = crypto.randomUUID();
    const command = { t: 'act', baseSeq: seq, action: { type: 'draw' } } as const;
    const replies = await Promise.all([s.send('a', command, code, id), s.send('a', command, code, id)]);
    expect(replies[0]).toEqual(replies[1]);
    const after = await s.repository.load(code);
    expect(after!.seq).toBeGreaterThan(seq);
    expect(s.repository.journal.get('a')!.filter((f) => f.message.events.some((e) => e.type === 'cardsDrawn'))).toHaveLength(1);
    expect((await s.send('a', command, code)).message).toMatchObject({ code: 'stale' });
    expect((await s.repository.load(code))!.seq).toBe(after!.seq);
  });

  it('makes duplicate room creation idempotent even when both requests arrive together', async () => {
    const s = setup(); const id = crypto.randomUUID();
    const command = { t: 'create', name: 'Ada', token: 'token-123456789012' } as const;
    const result = await Promise.all([s.send('a', command, undefined, id), s.send('a', command, undefined, id)]);
    expect(result[0].code).toBe(result[1].code);
    expect(s.repository.rooms.size).toBe(1);
  });

  it('rejects competing distinct moves and supersedes an older connection lease', async () => {
    const s = setup(); const code = await s.create(); await s.join(code); await s.send('a', { t: 'start' }, code);
    const seq = s.last().message.room.seq;
    const results = await Promise.all([s.send('a', { t: 'act', baseSeq: seq, action: { type: 'draw' } }, code), s.send('a', { t: 'act', baseSeq: seq, action: { type: 'draw' } }, code)]);
    expect(results.filter((r) => r.message?.t === 'error' && r.message.code === 'stale')).toHaveLength(1);
    const app = new RoomApplication(s.repository, () => ({ now: 1_000_001, rng: mulberry32(1), id: () => crypto.randomUUID() }));
    await app.handle('a', { id: crypto.randomUUID(), connectionId: 'fresh', message: { t: 'join', code, name: 'Ada', token: 'token-123456789012' } });
    expect((await app.handle('a', { id: crypto.randomUUID(), code, connectionId: 'old', message: { t: 'ping' } })).message).toEqual({ t: 'replaced' });
  });

  it('filters every journal entry and refuses an outsider who knows the room code', async () => {
    const s = setup(); const code = await s.create(); await s.join(code); await s.send('a', { t: 'start' }, code);
    const raw = (await s.repository.load(code))!;
    const bHand = raw.game!.players.find((p) => p.id === 'b')!.hand;
    const aPayload = JSON.stringify(s.last('a'));
    for (const card of bHand) expect(aPayload).not.toContain(`"${card.id}"`);
    expect(aPayload).not.toContain('drawPile');
    expect(s.last('a').message.events[0]).toHaveProperty('myCards');
    expect(s.last('a').message.events[0]).not.toHaveProperty('hands');
    expect((await s.send('intruder', { t: 'sync' }, code)).message).toMatchObject({ code: 'not-in-room' });
    expect((await s.send('intruder', { t: 'tick' }, code)).message).toMatchObject({ code: 'not-in-room' });
  });

  it('persists bot deadlines and allows only one bot move across simultaneous wakeups', async () => {
    const s = setup(); const code = await s.create(3);
    const initial = (await s.repository.load(code))!;
    const action = chooseBotAction(initial.game!, mulberry32(5));
    await s.send('a', { t: 'act', baseSeq: initial.seq, action }, code);
    const before = (await s.repository.load(code))!;
    expect(before.botDueAt).not.toBeNull();
    await s.send('a', { t: 'tick' }, code);
    expect((await s.repository.load(code))!.seq).toBe(before.seq);
    s.advance(60_000); s.restart();
    await s.join(code, 'a');
    await Promise.all([s.send('a', { t: 'tick' }, code), s.send('a', { t: 'tick' }, code)]);
    const changes = s.repository.journal.get('a')!.filter((f) => f.message.room.seq > before.seq);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.message.reset).toBe(false);
  });

  it('expires a disconnected player, transfers host and removes a leaver from the engine', async () => {
    const s = setup(); const code = await s.create(); await s.join(code); await s.join(code, 'c');
    await s.send('a', { t: 'start' }, code);
    s.advance(180_000);
    await s.send('b', { t: 'ping' }, code);
    const room = (await s.repository.load(code))!;
    expect(room.players.map((p) => p.id)).toEqual(['b']);
    expect(room.hostId).toBe('b');
    expect(room.game!.players.map((p) => p.id)).toEqual(['b']);
    await s.send('b', { t: 'leave' }, code);
    expect(await s.repository.load(code)).toBeNull();
  });
});

describe('HTTP authentication boundary', () => {
  it('requires verified identity, validates payloads, CORS and server-side rate limiting', async () => {
    const s = setup(); const app = new RoomApplication(s.repository, () => ({ now: 1, rng: mulberry32(1), id: () => crypto.randomUUID() }));
    let identity: string | null = null; let allowed = true;
    const handler = gameHttpHandler({ app, origins: ['https://balik.example'], authenticate: async () => identity, allowRequest: async () => allowed });
    const request = (body: unknown, origin = 'https://balik.example') => new Request('https://api.example/game', { method: 'POST', headers: { Origin: origin }, body: JSON.stringify(body) });
    expect((await handler(request({}))).status).toBe(401);
    identity = 'a';
    expect((await handler(request({}, 'https://outsider.example'))).status).toBe(403);
    expect((await handler(request({}))).status).toBe(400);
    allowed = false;
    expect((await handler(request({}))).status).toBe(429);
    allowed = true;
    const response = await handler(request({ id: crypto.randomUUID(), connectionId: crypto.randomUUID(), userId: 'intruder', message: { t: 'create', name: 'Ada', token: 'token-123456789012' } }));
    expect(response.status).toBe(200);
    expect((await response.json()).frame.message.room.you).toBe('a');
    expect(response.headers.get('access-control-allow-origin')).toBe('https://balik.example');
  });
});
