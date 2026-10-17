import { describe, expect, it } from 'vitest';
import { chooseGameBotAction, mulberry32, type ClientMessage } from '@balik/shared';
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
  it('stores reaction cooldown across workers but does not replay reactions in a reconnect snapshot', async () => {
    const s = setup(); const code = await s.create(); await s.join(code);
    const seq = s.last().message.room.seq;
    await s.send('a', { t: 'emote', emote: 'nice' }, code);
    expect(s.last('b').signals?.[0]).toMatchObject({ t: 'emote', emote: 'nice', playerId: 'a' });
    expect(s.last().message.room.seq).toBe(seq);
    s.restart(); expect((await s.send('a', { t: 'emote', emote: 'gg' }, code)).message).toMatchObject({ code: 'rate-limited' });
    const joined = await s.join(code, 'a'); expect(joined.frame?.signals).toBeUndefined();
    s.advance(2500); expect((await s.send('a', { t: 'emote', emote: 'gg' }, code)).message).toBeUndefined();
  });

  it('returns to lobby only after completion and preserves the authoritative winner score', async () => {
    const s = setup(); const code = await s.create(); await s.join(code); await s.send('a', { t: 'start' }, code);
    expect((await s.send('a', { t: 'lobby' }, code)).message).toMatchObject({ code: 'game-in-progress' });
    for (let i = 0; i < 3000; i++) {
      const room = (await s.repository.load(code))!;
      if (room.status === 'finished') break;
      const user = room.game!.players[room.game!.currentIndex]!.id;
      await s.send(user, { t: 'act', baseSeq: room.seq, action: chooseGameBotAction(room.game!, mulberry32(i + 5)) }, code);
    }
    const before = (await s.repository.load(code))!; expect(before.status).toBe('finished');
    expect((await s.send('b', { t: 'lobby' }, code)).message).toMatchObject({ code: 'not-host' });
    await s.send('a', { t: 'lobby' }, code);
    const after = (await s.repository.load(code))!;
    expect(after.status).toBe('lobby'); expect(after.game).toBeNull();
    expect(after.players.map((p) => p.wins)).toEqual(before.players.map((p) => p.wins));
  });
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
    const action = chooseGameBotAction(initial.game!, mulberry32(5));
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

describe('Sedma persisted rooms', () => {
  for (const count of [2, 4]) it(`plays ${count} seats across worker restarts, reconnects, idempotent moves and a rematch`, async () => {
    const s = setup();
    const code = (await s.send('a', { t: 'create', token: 'token-123456789012', name: 'Ada', gameId: 'sedma', sedmaBonus: 0 })).code!;
    const users = ['a','b','c','d'].slice(0, count);
    for (const user of users.slice(1)) await s.join(code, user);
    if (count === 4) { const room = (await s.repository.load(code))!; expect(room.gameId).toBe('sedma'); }
    await s.send('a', { t: 'start' }, code);
    let reconnected = false;
    for (let i = 0; i < 70; i++) {
      const raw = (await s.repository.load(code))!;
      if (raw.status === 'finished') break;
      const id = raw.game!.players[raw.game!.currentIndex]!.id;
      if (!reconnected && i === 1) {
        const before = s.last(id); s.restart();
        const joined = await s.join(code, id);
        expect(joined.frame!.message.reset).toBe(true);
        expect(joined.frame!.message.events).toEqual([]);
        expect(joined.frame!.message.room.game).toEqual(before.message.room.game); reconnected = true;
      }
      const action = chooseGameBotAction(raw.game!, mulberry32(i));
      const requestId = crypto.randomUUID();
      const replies = await Promise.all([s.send(id, { t: 'act', baseSeq: raw.seq, action }, code, requestId), s.send(id, { t: 'act', baseSeq: raw.seq, action }, code, requestId)]);
      expect(replies[0]).toEqual(replies[1]);
      for (const viewer of users) {
        const frame = s.last(viewer);
        expect(frame.message.room.gameId).toBe('sedma');
        expect(frame.message.room.game).not.toHaveProperty('drawPile');
        for (const e of frame.message.events) expect(e).not.toHaveProperty('hands');
        const latest = (await s.repository.load(code))!;
        for (const opponent of latest.game!.players.filter((p) => p.id !== viewer)) for (const card of opponent.hand) expect(JSON.stringify(frame)).not.toContain(`"${card.id}"`);
      }
    }
    const final = (await s.repository.load(code))!;
    expect(final.status).toBe('finished');
    if (!final.game || !('result' in final.game)) throw new Error('Expected Sedma');
    const winners = final.game.result!.winnerIds;
    expect(final.players.map((p) => p.wins)).toEqual(final.players.map((p) => winners.includes(p.id) ? 1 : 0));
    await s.send('a', { t: 'rematch' }, code);
    const next = (await s.repository.load(code))!;
    expect(next.round).toBe(2); expect(next.gameId).toBe('sedma'); expect(next.status).toBe('playing');
    expect(next.players.map((p) => p.wins)).toEqual(final.players.map((p) => p.wins));
  });
  it('refuses three seats, invalid Prší actions, and resolves departure as a team forfeit', async () => {
    const s = setup();
    const code = (await s.send('a', { t: 'create', token: 'token-123456789012', name: 'Ada', gameId: 'sedma' })).code!;
    const invalid = await s.send('a', { t: 'create', token: 'token-123456789012', name: 'Ada', gameId: 'sedma', bots: 2 });
    expect(invalid.message).toMatchObject({ code: 'not-enough-players' });
    expect(await s.repository.membership('a')).toBe(code);
    await s.join(code); await s.join(code, 'c');
    expect((await s.send('a', { t: 'start' }, code)).message).toMatchObject({ code: 'not-enough-players' });
    await s.join(code, 'd'); await s.send('a', { t: 'start' }, code);
    const seq = s.last().message.room.seq;
    expect((await s.send('a', { t: 'act', baseSeq: seq, action: { type: 'draw' } }, code)).message).toMatchObject({ code: 'illegal' });
    await s.send('c', { t: 'leave' }, code);
    const room = s.last('b').message.room;
    expect(room.status).toBe('finished');
    expect(room.game).toMatchObject({ result: { reason: 'forfeit', winnerIds: ['b','d'] } });
  });
  for (const bots of [1, 3]) it(`runs a full Sedma game with ${bots} durable scheduled bots`, async () => {
    const s = setup();
    const code = (await s.send('a', { t: 'create', token: 'token-123456789012', name: 'Ada', gameId: 'sedma', bots })).code!;
    for (let i = 0; i < 80; i++) {
      const raw = (await s.repository.load(code))!;
      if (raw.status === 'finished') break;
      const id = raw.game!.players[raw.game!.currentIndex]!.id;
      if (id === 'a') await s.send('a', { t: 'act', baseSeq: raw.seq, action: chooseGameBotAction(raw.game!, mulberry32(i)) }, code);
      else {
        expect(raw.botDueAt).not.toBeNull();
        s.advance(15000); s.restart();
        await s.send('a', { t: 'tick' }, code);
      }
    }
    expect((await s.repository.load(code))!.status).toBe('finished');
  });
  it('preserves a Sedma seat while disconnected and forfeits after the original grace', async () => {
    const s = setup();
    const code = (await s.send('a', { t: 'create', token: 'token-123456789012', name: 'Ada', gameId: 'sedma' })).code!;
    await s.join(code); await s.send('a', { t: 'start' }, code);
    s.advance(50000); await s.send('a', { t: 'ping' }, code);
    expect((await s.repository.load(code))!.status).toBe('playing');
    s.advance(116000); await s.send('a', { t: 'ping' }, code);
    expect(s.last('a').message.room.game).toMatchObject({ result: { reason: 'forfeit', winnerIds: ['a'] } });
  });
  it('reads pre-W2 stored rooms with no game id as Prší', async () => {
    const s = setup(); const code = await s.create(); await s.join(code);
    const raw = (await s.repository.load(code))!; delete raw.gameId; delete raw.sedmaBonus; s.repository.rooms.set(code, raw);
    await s.send('a', { t: 'start' }, code); expect(s.last().message.room.gameId).toBe('prsi');
    expect(s.last().message.room.game).toHaveProperty('discardTop');
  });
});

describe('Herní večer across persisted workers', () => {
  async function playRound(s: ReturnType<typeof setup>, code: string) {
    for(let i=0;i<3000;i++) {
      const room=(await s.repository.load(code))!; if(room.status==='finished')return room;
      const user=room.game!.players[room.game!.currentIndex]!.id;
      const id=crypto.randomUUID(), message={t:'act' as const,baseSeq:room.seq,action:chooseGameBotAction(room.game!,mulberry32(i+8))};
      const replies=await Promise.all([s.send(user,message,code,id),s.send(user,message,code,id)]); expect(replies[0]).toEqual(replies[1]);
    }
    throw new Error('Round failed to finish');
  }
  async function action(s:ReturnType<typeof setup>,code:string,type:'openVote'|'confirm'|'close'|'between',gameId?:'prsi'|'sedma',user='a') {
    return s.send(user,{t:'evening',action:type,baseRevision:s.last(user).message.room.evening!.revision,gameId},code);
  }
  it('plays Prší → Sedma → Prší, votes concurrently, reconnects, preserves identities and closes with exact history',async()=>{
    const s=setup(),code=await s.create(); await s.join(code); const identities=s.last().message.room.players.map(p=>p.id);
    await s.send('a',{t:'start',round:0},code); const firstSeq=s.last().message.room.seq;
    await playRound(s,code);
    expect(s.last().message.room.evening!.completedMatches).toBe(1);
    await action(s,code,'openVote',undefined,'b'); expect(s.last().message.room.game).toBeNull();
    let ballot=s.last().message.room.evening!.ballotId;
    await Promise.all(['a','b'].map(user=>s.send(user,{t:'vote',ballotId:ballot,gameId:'sedma'},code)));
    expect(s.last().message.room.evening!.votes).toEqual({a:'sedma',b:'sedma'});
    s.restart(); const snapshot=await s.join(code);expect(snapshot.frame!.message.events).toEqual([]);expect(snapshot.frame!.message.room.evening!.votes).toEqual({a:'sedma',b:'sedma'});
    const oldRevision=s.last().message.room.evening!.revision;
    await action(s,code,'confirm','sedma');expect(s.last().message.room).toMatchObject({gameId:'sedma',round:2,code});
    const afterConfirm=s.last().message.room.seq;
    expect((await s.send('a',{t:'evening',baseRevision:oldRevision,action:'confirm',gameId:'sedma'},code)).message).toMatchObject({code:'game-in-progress'});
    expect((await s.repository.load(code))!.seq).toBe(afterConfirm);
    expect((await s.send('a',{t:'act',baseSeq:firstSeq,action:{type:'draw'}},code)).message).toMatchObject({code:'stale'});
    await playRound(s,code);await action(s,code,'openVote');
    const previousBallot=ballot; ballot=s.last().message.room.evening!.ballotId;
    expect((await s.send('b',{t:'vote',ballotId:previousBallot,gameId:'prsi'},code)).message).toMatchObject({code:'stale'});
    await s.send('a',{t:'vote',ballotId:ballot,gameId:'prsi'},code);await s.send('b',{t:'vote',ballotId:ballot,gameId:'sedma'},code);
    await action(s,code,'confirm','prsi');await playRound(s,code);
    let final=s.last().message.room;
    expect(final.code).toBe(code);expect(final.players.map(p=>p.id)).toEqual(identities);
    expect(final.evening!.history.map(m=>m.gameId)).toEqual(['prsi','sedma','prsi']);expect(final.evening!.completedMatches).toBe(3);
    expect(Object.values(final.evening!.stats).map(p=>p.played)).toEqual([3,3]);
    expect(final.evening).not.toHaveProperty('active');expect(JSON.stringify(final.evening)).not.toContain('hand');
    const before=structuredClone(final.evening);
    expect((await s.send('a',{t:'rematch',round:1},code)).message).toMatchObject({code:'stale'});
    await action(s,code,'close');final=s.last().message.room;expect(final.game).toBeNull();expect(final.evening!.phase).toBe('closed');
    expect(final.evening!.stats).toEqual(before!.stats);
    expect((await s.send('a',{t:'rematch',round:3},code)).message).toMatchObject({code:'illegal'});
    expect((await s.join(code,'new')).message).toMatchObject({code:'game-in-progress'});
    s.restart();const rejoined=await s.join(code,'a');expect(rejoined.frame!.message.room.evening!.phase).toBe('closed');
  });
  it('transfers host during a ballot, discards departed votes, preserves historical scores and blocks three-seat Sedma',async()=>{
    const s=setup(),code=await s.create();await s.join(code);await s.join(code,'c');await s.join(code,'d');
    await s.send('a',{t:'start'},code);await s.send('c',{t:'leave'},code); // Prší continues, participant remains in active ledger.
    await playRound(s,code);expect(s.last().message.room.evening!.stats.c!.played).toBe(1);
    await action(s,code,'openVote');const ballot=s.last().message.room.evening!.ballotId;
    expect((await s.send('a',{t:'vote',ballotId:ballot,gameId:'sedma'},code)).message).toMatchObject({code:'not-enough-players'});
    await s.send('a',{t:'vote',ballotId:ballot,gameId:'prsi'},code);await s.send('a',{t:'leave'},code);
    const room=s.last('b').message.room;expect(room.hostId).toBe('b');expect(room.evening!.votes.a).toBeUndefined();expect(room.evening!.stats.a).toBeDefined();
    await s.join(code,'new');expect(s.last('new').message.room.evening!.stats.new).toBeUndefined();
    await s.send('b',{t:'addBot'},code);const added=s.last('b').message.room;
    expect(added.players).toHaveLength(4);
    await Promise.all(['b','d','new'].map(user=>s.send(user,{t:'vote',ballotId:ballot,gameId:'sedma'},code)));
    await action(s,code,'confirm','sedma','b');const started=(await s.repository.load(code))!;expect(started.gameId).toBe('sedma');
    expect(started.players.find(p=>p.id==='new')!.wins).toBe(0);
    await s.send('new',{t:'leave'},code); // team forfeit still counts every initial participant exactly once.
    const ended=s.last('b').message.room.evening!;expect(ended.completedMatches).toBe(2);expect(ended.stats.new!.played).toBe(1);
    expect(ended.history.at(-1)!.reason).toBe('forfeit');
  });
  it('restores an explicit returning identity and starts a new identity at zero',async()=>{
    const s=setup(),code=await s.create();await s.join(code);await s.send('a',{t:'start'},code);await playRound(s,code);
    const before=s.last().message.room.evening!.stats.a;
    await s.send('a',{t:'leave'},code);await s.join(code,'a');
    expect(s.last('a').message.room.evening!.stats.a).toEqual({...before,name:'a'});expect(s.last('a').message.room.evening!.history[0]!.players[0]!.name).toBe('Ada');expect(s.last('a').message.room.you).toBe('a');expect(s.last('a').message.room.hostId).toBe('b');
    await s.join(code,'new');expect(s.last('new').message.room.evening!.stats.new).toBeUndefined();expect(s.last('new').message.room.players.find(p=>p.id==='new')!.wins).toBe(0);
  });
  it('cancels the durable bot deadline across result/vote/close and rejects stale epoch starts',async()=>{
    const s=setup(),code=await s.create(1);let raw=(await s.repository.load(code))!;
    await s.send('a',{t:'act',baseSeq:raw.seq,action:chooseGameBotAction(raw.game!,mulberry32(3))},code);
    // Finish via normal player departure is covered separately. Drive both bot and human through authoritative actions.
    for(let i=0;i<3000;i++){
      raw=(await s.repository.load(code))!;if(raw.status==='finished')break;
      const id=raw.game!.players[raw.game!.currentIndex]!.id;
      if(id==='a')await s.send('a',{t:'act',baseSeq:raw.seq,action:chooseGameBotAction(raw.game!,mulberry32(i+30))},code);
      else{s.advance(15000);await s.send('a',{t:'tick'},code);}
    }
    expect((await s.repository.load(code))!.status).toBe('finished');
    await action(s,code,'openVote');expect((await s.repository.load(code))!.botDueAt).toBeNull();
    const revision=s.last().message.room.evening!.revision;await s.send('a',{t:'tick'},code);expect(s.last().message.room.evening!.revision).toBe(revision);
    await action(s,code,'close');s.advance(30000);await s.send('a',{t:'tick'},code);
    expect((await s.repository.load(code))!.evening!.phase).toBe('closed');expect((await s.repository.load(code))!.botDueAt).toBeNull();
  });
});

describe('HTTP authentication boundary', () => {
  it('accepts durable bot UUIDs for removal through the validated HTTP boundary',async()=>{
    const s=setup(),code=await s.create();await s.send('a',{t:'addBot'},code);
    const bot=(await s.repository.load(code))!.players.find(p=>p.bot)!;expect(bot.id).toHaveLength(36);
    const app=new RoomApplication(s.repository,()=>({now:1000001,rng:mulberry32(1),id:()=>crypto.randomUUID()}));
    const handler=gameHttpHandler({app,origins:[],authenticate:async()=> 'a',allowRequest:async()=>true});
    const response=await handler(new Request('https://api.example/game',{method:'POST',body:JSON.stringify({id:crypto.randomUUID(),connectionId:'c0439cb3-b6fb-4f5a-b69b-dac08e5eb31a',code,message:{t:'join',name:'Ada',token:'token-123456789012',code}})}));
    expect(response.status).toBe(200);
    const removed=await handler(new Request('https://api.example/game',{method:'POST',body:JSON.stringify({id:crypto.randomUUID(),connectionId:'c0439cb3-b6fb-4f5a-b69b-dac08e5eb31a',code,message:{t:'removeBot',round:0,playerId:bot.id}})}));
    expect(removed.status).toBe(200);expect((await removed.json()).message).toBeUndefined();expect((await s.repository.load(code))!.players).toHaveLength(1);
  });
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
