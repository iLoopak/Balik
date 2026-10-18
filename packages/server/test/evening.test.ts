import { afterEach, expect, it, vi } from 'vitest';
import { chooseLharBotFromView, chooseSedmaBotFromView, legalMovesFromView, mulberry32, type AnyRoomView, type ClientMessage, type RoomView, type ServerMessage } from '@balik/shared';
import { RoomManager, type Conn } from '../src/rooms';
class Seat implements Conn {
  messages: ServerMessage[]=[];
  send(message:ServerMessage){this.messages.push(structuredClone(message));}
  get room():AnyRoomView{return this.messages.filter(m=>m.t==='state').at(-1)!.room;}
  get error(){return this.messages.filter(m=>m.t==='error').at(-1);}
}
const token=(i:number)=>`evening-test-token-${i}`;
function setup(n=2,opts={}) {
  const rooms=new RoomManager({rng:mulberry32(11),...opts}); const seats=Array.from({length:n},()=>new Seat());
  rooms.handle(seats[0]!,{t:'create',token:token(0),name:'Host'}); const code=seats[0]!.room.code;
  for(let i=1;i<n;i++)rooms.handle(seats[i]!,{t:'join',code,token:token(i),name:`Hráč ${i}`});
  return {rooms,seats,code};
}
function legal(room:AnyRoomView):Extract<ClientMessage,{t:'act'}> {
  if(room.gameId==='lhar')return {t:'act',baseSeq:room.seq,action:chooseLharBotFromView(room.game!,room.you,mulberry32(room.seq))};
  if(room.gameId==='sedma')return {t:'act',baseSeq:room.seq,action:chooseSedmaBotFromView(room.game!,room.you)};
  const moves=legalMovesFromView((room as RoomView<'prsi'>).game!,room.you),id=moves.playable[0];
  return {t:'act',baseSeq:room.seq,action:id?{type:'play',cardId:id,chosenSuit:id.endsWith('-Q')?'hearts':undefined}:moves.canPass?{type:'pass'}:{type:'draw'}};
}
function finish(s:ReturnType<typeof setup>){for(let i=0;i<3000;i++){const room=s.seats[0]!.room;if(room.status==='finished')return;const seat=s.seats.find(p=>p.room.you===room.game!.currentPlayerId)!;s.rooms.handle(seat,legal(seat.room));}throw Error('unfinished');}
function action(s:ReturnType<typeof setup>,type:'between'|'openVote'|'confirm'|'close',gameId?:'prsi'|'sedma',seat=s.seats[0]!) {s.rooms.handle(seat,{t:'evening',baseRevision:seat.room.evening!.revision,action:type,gameId});}
afterEach(()=>vi.useRealTimers());
it('Node: three alternating matches, public ledger, ties, same room and closing summary',()=>{
  const s=setup(),ids=s.seats[0]!.room.players.map(p=>p.id);
  s.rooms.handle(s.seats[0]!,{t:'start',round:0});const oldSeq=s.seats[0]!.room.seq;
  finish(s);expect(s.seats[0]!.room.evening!.completedMatches).toBe(1);
  for(const id of ['sedma','prsi'] as const){
    action(s,'openVote',undefined,s.seats[1]!);expect(s.seats[0]!.room.game).toBeNull();
    const ballotId=s.seats[0]!.room.evening!.ballotId;
    s.rooms.handle(s.seats[0]!,{t:'vote',ballotId,gameId:id});s.rooms.handle(s.seats[1]!,{t:'vote',ballotId,gameId:id==='prsi'?'sedma':'sedma'});
    action(s,'confirm',id);
    const before=s.seats[0]!.room.seq;s.rooms.handle(s.seats[0]!,{t:'act',baseSeq:oldSeq,action:{type:'draw'}});expect(s.seats[0]!.error!.code).toBe('stale');expect(s.seats[0]!.room.seq).toBe(before);
    finish(s);
  }
  const room=s.seats[0]!.room;expect(room.code).toBe(s.code);expect(room.players.map(p=>p.id)).toEqual(ids);
  expect(room.evening!.history.map(m=>m.gameId)).toEqual(['prsi','sedma','prsi']);expect(Object.values(room.evening!.stats).map(p=>p.played)).toEqual([3,3]);
  expect(room.evening).not.toHaveProperty('active');expect(JSON.stringify(room.evening)).not.toContain('hand');
  action(s,'close');expect(s.seats[0]!.room.evening!.phase).toBe('closed');
  s.rooms.handle(s.seats[0]!,{t:'rematch',round:3});expect(s.seats[0]!.error!.code).toBe('illegal');
  const stranger=new Seat();s.rooms.handle(stranger,{t:'join',code:s.code,token:'new-evening-guest-123',name:'Nový'});expect(stranger.error!.code).toBe('game-in-progress');
});
it('Node: disconnect clears the vote, reconnect keeps the seat, expired host transfers authority',()=>{
  let now=1000;const s=setup(2,{now:()=>now,lobbyGraceMs:100}); action(s,'openVote');const ballotId=s.seats[0]!.room.evening!.ballotId;
  s.rooms.handle(s.seats[0]!,{t:'vote',ballotId,gameId:'prsi'});s.rooms.disconnect(s.seats[0]!);
  expect(s.seats[1]!.room.evening!.votes).toEqual({});
  const fresh=new Seat();s.rooms.handle(fresh,{t:'join',code:s.code,token:token(0),name:'Host'});expect(fresh.room.you).toBe(s.seats[0]!.room.you);expect(fresh.messages[0]).toMatchObject({reset:true,events:[]});
  s.rooms.disconnect(fresh);now+=101;s.rooms.sweep();expect(s.seats[1]!.room.hostId).toBe(s.seats[1]!.room.you);
  expect(s.seats[1]!.room.evening!.phase).toBe('voting');action(s,'close',undefined,s.seats[1]!);expect(s.seats[1]!.room.evening!.phase).toBe('closed');
});
it('Node: result and game switch cancel the previous bot timer; no stale callback changes the session',()=>{
  vi.useFakeTimers();const rooms=new RoomManager({rng:mulberry32(1),botPace:1});const host=new Seat(),other=new Seat();
  rooms.handle(host,{t:'create',token:token(0),name:'Host'});rooms.handle(other,{t:'join',token:token(1),code:host.room.code,name:'Jana'});rooms.handle(host,{t:'addBot'});rooms.handle(host,{t:'addBot'});
  const command=(action:'openVote'|'confirm'|'close',gameId?:'sedma')=>rooms.handle(host,{t:'evening',baseRevision:host.room.evening!.revision,action,gameId});
  command('openVote');const ballotId=host.room.evening!.ballotId;rooms.handle(host,{t:'vote',ballotId,gameId:'sedma'});rooms.handle(other,{t:'vote',ballotId,gameId:'sedma'});command('confirm','sedma');
  rooms.handle(host,legal(host.room));rooms.handle(other,{t:'leave'});expect(host.room.status).toBe('finished');const seq=host.room.seq;
  command('openVote');command('close');vi.advanceTimersByTime(120000);
  expect(host.room.seq).toBe(seq);expect(host.room.game).toBeNull();expect(host.room.evening!.completedMatches).toBe(1);expect(host.room.evening!.phase).toBe('closed');
});

it('Node: explicit leave and rejoin restores the room identity and statistics, without restoring host privileges',()=>{
  const s=setup();s.rooms.handle(s.seats[0]!,{t:'start'});finish(s);
  const before=s.seats[0]!.room,stats=before.evening!.stats[before.you];
  s.rooms.handle(s.seats[0]!,{t:'leave'});const returned=new Seat();
  s.rooms.handle(returned,{t:'join',code:s.code,token:token(0),name:'Host'});
  expect(returned.room.you).toBe(before.you);expect(returned.room.evening!.stats[before.you]).toEqual(stats);expect(returned.room.hostId).toBe(s.seats[1]!.room.you);
  expect(JSON.stringify(returned.room)).not.toContain(token(0));
});
