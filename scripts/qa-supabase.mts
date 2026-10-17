/** Real local Auth + Edge + Postgres/RLS + Realtime + browser transport, without a browser. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chooseLharBotFromView, mulberry32, chooseSedmaBotFromView, legalMovesFromView, type ClientMessage, type AnyRoomView, type ServerMessage } from '@balik/shared';
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
    state: (predicate: (room: AnyRoomView) => boolean = () => true) => wait(() => { if (failure) throw new Error(failure); const error = messages.find((m) => m.t === 'error' && m.code !== 'rate-limited'); if (error?.t === 'error') throw new Error(`${error.code}: ${error.message}`); return messages.filter((m) => m.t === 'state').reverse().find((m) => m.t === 'state' && predicate(m.room)) as Extract<ServerMessage, { t: 'state' }> | undefined; }, 'game state'),
  };
}

try {
  const a = client(), b = client();
  await Promise.all([a.connected(), b.connected()]);
  a.send({ t: 'create', name: 'Ada', token: 'qa-token-player-a-123', avatarId: 'vega' });
  const initial = await a.state(); const code = initial.room.code;
  b.send({ t: 'join', name: 'Max', token: 'qa-token-player-b-123', code, avatarId: 'sova' });
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

  b.send({ t: 'profile', avatarId: 'gambit' });
  const [profileA, profileB] = await Promise.all([a.state(r => r.players.find(p => p.id === bStart.room.you)?.avatarId === 'gambit'), b.state(r => r.players.find(p => p.id === bStart.room.you)?.avatarId === 'gambit')]);
  assert.equal(profileA.room.seq, aStart.room.seq);
  assert.deepEqual(profileA.room.game, aStart.room.game);
  assert.deepEqual(profileB.room.game, bStart.room.game);
  assert.deepEqual(profileA.room.evening, aStart.room.evening);
  assert.deepEqual(profileA.events, []);
  assert.equal(profileA.reset, false);
  a.send({ t: 'profile', avatarId: 'mina' });
  await Promise.all([a.state(r => r.players.find(p => p.id === aStart.room.you)?.avatarId === 'mina'), b.state(r => r.players.find(p => p.id === aStart.room.you)?.avatarId === 'mina')]);

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
  assert.equal(snapshot.room.players.find(p => p.id === snapshot.room.you)?.avatarId, 'mina');
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
  // An unplayable drawn card already passes the turn in Prší.
  if (drawn.room.gameId === 'prsi' && drawn.room.game!.currentPlayerId === drawn.room.you && drawn.room.game!.drawnCardId) {
    resumed.send({ t: 'act', baseSeq: drawn.room.seq, action: { type: 'pass' } });
  }
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
  // W3: one persistent room and exactly one ledger entry per alternating match.
  const eveningSeats = [client(),client()];
  await Promise.all(eveningSeats.map((p)=>p.connected()));
  eveningSeats[0]!.send({t:'create',name:'Host večera',token:'qa-evening-token-host'});
  const eveningCode=(await eveningSeats[0]!.state()).room.code;
  eveningSeats[1]!.send({t:'join',name:'Jana',token:'qa-evening-token-guest',code:eveningCode});
  await eveningSeats[0]!.state((r)=>r.players.length===2);
  eveningSeats[0]!.send({t:'start',round:0});
  let eveningFrames=await Promise.all(eveningSeats.map((p)=>p.state((r)=>r.status==='playing')));
  const eveningIds=eveningFrames[0]!.room.players.map((p)=>p.id);
  for(let match=1;match<=3;match++){
    for(let step=0;step<3000 && eveningFrames[0]!.room.status==='playing';step++){
      const seatIndex=eveningFrames.findIndex((f)=>f.room.you===eveningFrames[0]!.room.game!.currentPlayerId);
      const room=eveningFrames[seatIndex]!.room;
      let message:ClientMessage;
      if(room.gameId==='lhar')message={t:'act',baseSeq:room.seq,action:chooseLharBotFromView(room.game!,room.you,mulberry32(step+78))};
      else if(room.gameId==='sedma')message={t:'act',baseSeq:room.seq,action:chooseSedmaBotFromView(room.game!,room.you)};
      else { const moves=legalMovesFromView(room.game!,room.you),id=moves.playable[0]; message={t:'act',baseSeq:room.seq,action:id?{type:'play',cardId:id,chosenSuit:id.endsWith('-Q')?'hearts':undefined}:moves.canPass?{type:'pass'}:{type:'draw'}}; }
      eveningSeats[seatIndex]!.send(message);
      eveningFrames=await Promise.all(eveningSeats.map((p)=>p.state((r)=>r.seq>room.seq)));
      for(const [viewer,frame] of eveningFrames.entries()) for(const other of eveningFrames.filter((_,i)=>i!==viewer)) for(const card of other.room.game!.myHand!) assert.ok(!JSON.stringify(frame).includes(`"${card.id}"`));
    }
    const final=eveningFrames[0]!.room;
    assert.equal(final.status,'finished');assert.equal(final.evening!.completedMatches,match);
    assert.deepEqual(final.players.map((p)=>p.id),eveningIds);assert.equal(final.code,eveningCode);
    console.log(`PASS: evening match ${match}, ${final.gameId}, same room and identities, exact ledger.`);
    if(match===3)break;
    const gameId=match===1?'sedma':'prsi';
    eveningSeats[0]!.send({t:'evening',baseRevision:final.evening!.revision,action:'openVote'});
    let voting=(await eveningSeats[0]!.state((r)=>r.evening?.phase==='voting'&&r.evening.ballotId===match)).room;
    // Bot ids are UUIDs on this adapter; exercise the validated HTTP remove command.
    if(match===1){
      const revision=voting.evening!.revision;eveningSeats[0]!.send({t:'addBot',round:match});
      const added=(await eveningSeats[0]!.state((r)=>r.players.length===3&&(r.evening?.revision??0)>revision)).room;
      const bot=added.players.find((p)=>p.bot)!;assert.equal(bot.id.length,36);
      eveningSeats[0]!.send({t:'removeBot',playerId:bot.id,round:match});
      voting=(await eveningSeats[0]!.state((r)=>r.players.length===2&&(r.evening?.revision??0)>added.evening!.revision)).room;
    }
    const ballotId=voting.evening!.ballotId;
    eveningSeats.forEach((p)=>p.send({t:'vote',ballotId,gameId}));
    voting=(await eveningSeats[0]!.state((r)=>r.evening?.phase==='voting'&&r.evening.ballotId===ballotId&&Object.keys(r.evening.votes).length===2)).room;
    if(match===1){
      const old=eveningSeats[0]!;old.transport.close();const restored=client(old.tab);eveningSeats[0]=restored;await restored.connected();
      restored.send({t:'join',name:'Host večera',token:'qa-evening-token-host',code:eveningCode});
      const snapshot=await restored.state();assert.equal(snapshot.reset,true);assert.deepEqual(snapshot.events,[]);assert.deepEqual(snapshot.room.evening!.votes,voting.evening!.votes);voting=snapshot.room;
    }
    eveningSeats[0]!.send({t:'evening',baseRevision:voting.evening!.revision,action:'confirm',gameId});
    eveningFrames=await Promise.all(eveningSeats.map((p)=>p.state((r)=>r.round===match+1&&r.status==='playing')));
  }
  const finalEvening=eveningFrames[0]!.room;
  assert.deepEqual(finalEvening.evening!.history.map((m)=>m.gameId),['prsi','sedma','prsi']);
  assert.deepEqual(Object.values(finalEvening.evening!.stats).map((p)=>p.played),[3,3]);
  assert.ok(!('active' in finalEvening.evening!));
  eveningSeats[0]!.send({t:'evening',baseRevision:finalEvening.evening!.revision,action:'close'});
  const closedEvening=(await eveningSeats[0]!.state((r)=>r.evening?.phase==='closed')).room;
  assert.equal(closedEvening.game,null);assert.deepEqual(closedEvening.evening!.stats,finalEvening.evening!.stats);
  eveningSeats.forEach((p)=>p.send({t:'leave'}));
  await Promise.all(eveningSeats.map((p)=>wait(()=>p.messages.find((m)=>m.t==='left'),'evening leave')));
  // W5: the real filtered journal, reconnect and a full game at 2/3 seats.
  for(const count of [2,3]) {
    const seats=Array.from({length:count},()=>client());await Promise.all(seats.map(p=>p.connected()));
    seats[0]!.send({t:'create',name:'Lhář host',token:'qa-lhar-host-1234567',gameId:'lhar'});
    const code=(await seats[0]!.state()).room.code;
    for(let i=1;i<count;i++)seats[i]!.send({t:'join',code,name:`Lhář ${i}`,token:'qa-lhar-guest-1234567'});
    await seats[0]!.state(r=>r.players.length===count);seats[0]!.send({t:'start'});
    let frames=await Promise.all(seats.map(p=>p.state(r=>r.status==='playing'))),resolved=0;
    for(let turn=0;turn<1000&&frames[0]!.room.status==='playing';turn++) {
      const index=frames.findIndex(f=>f.room.you===frames[0]!.room.game!.currentPlayerId),room=frames[index]!.room;
      if(room.gameId!=='lhar')throw Error('Expected Lhar');
      if(turn===1) {
        const old=seats[index]!;old.transport.close();const next=client(old.tab);seats[index]=next;await next.connected();
        next.send({t:'join',code,name:'Lhář resumed',token:'qa-lhar-guest-1234567'});
        const snapshot=await next.state();assert.equal(snapshot.reset,true);assert.deepEqual(snapshot.events,[]);assert.deepEqual(snapshot.room.game,room.game);
      }
      let action=chooseLharBotFromView(room.game!,room.you,mulberry32(turn+count*55));
      if(turn===0)action={type:'lharPlay',cardIds:[room.game!.myHand!.find(c=>c.rank!=='7')!.id],declaredRank:'7'};
      if(turn===1)action={type:'lharChallenge',claimId:room.game!.lastClaim!.id};
      seats[index]!.send({t:'act',baseSeq:room.seq,action});frames=await Promise.all(seats.map(p=>p.state(r=>r.seq>room.seq)));
      resolved+=frames[0]!.events.filter(e=>e.type==='lharResolved').length;
      for(const [i,frame] of frames.entries()) {
        if(frame.room.gameId!=='lhar')throw Error('Expected Lhar');
        const view=frame.room.game!;assert.ok(!('pile' in view));assert.ok(!view.lastClaim||!('cards' in view.lastClaim));
        for(const p of view.players)assert.ok(!('hand' in p));
        const revealed=new Set([...(view.lastResolution?.revealed.map(c=>c.id)??[]),...frame.events.flatMap(e=>e.type==='lharResolved'?e.resolution.revealed.map(c=>c.id):[])]);
        for(const other of frames.filter((_,j)=>j!==i))for(const c of other.room.game!.myHand??[])if(!revealed.has(c.id))assert.ok(!JSON.stringify(frame).includes(`"${c.id}"`),'Lhar private hand never leaks');
      }
    }
    const final=frames[0]!.room;assert.equal(final.status,'finished');assert.ok(resolved>0);assert.equal(final.evening!.gameCounts.lhar,1);assert.equal(final.evening!.history[0]!.winnerIds.length,1);
    const ids=final.players.map(p=>p.id);seats[0]!.send({t:'evening',baseRevision:final.evening!.revision,action:'openVote'});
    let voting=(await seats[0]!.state(r=>r.evening?.phase==='voting')).room;const ballotId=voting.evening!.ballotId;
    seats.forEach(p=>p.send({t:'vote',ballotId,gameId:'prsi'}));voting=(await seats[0]!.state(r=>Object.keys(r.evening?.votes??{}).length===count)).room;
    seats[0]!.send({t:'evening',baseRevision:voting.evening!.revision,action:'confirm',gameId:'prsi'});
    const switched=await seats[0]!.state(r=>r.gameId==='prsi'&&r.round===2&&r.status==='playing');assert.deepEqual(switched.room.players.map(p=>p.id),ids);
    console.log(`PASS: Lhář ${count} real Supabase clients, private hidden plays, challenge, reconnect, complete game, Lhář → Prší in same room.`);
    seats.forEach(p=>p.send({t:'leave'}));await Promise.all(seats.map(p=>wait(()=>p.messages.find(m=>m.t==='left'),'Lhar leave')));
    seats.forEach(p=>p.transport.close());
  }
  console.log('PASS: Supabase Auth/JWT/RLS, idempotency, cosmetic profile propagation/reconnect, emotes, bots; Sedma 1v1/2v2; full Prší → Sedma → Prší evening, concurrent votes, reconnect, exact history/stats and closing summary.');
} finally {
  transports.forEach((transport) => transport.close());
  await anon.removeAllChannels(); anon.auth.stopAutoRefresh();
}
