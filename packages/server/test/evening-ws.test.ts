import { expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { chooseLharBotFromView, chooseSedmaBotFromView, legalMovesFromView, mulberry32, type AnyRoomView, type ClientMessage, type RoomView, type ServerMessage } from '@balik/shared';
import { startServer } from '../src/server';
const pause=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function wait<T>(read:()=>T|false|undefined):Promise<T>{const end=Date.now()+4000;while(Date.now()<end){const value=read();if(value)return value as T;await pause(10);}throw Error('WS session timeout');}
function legal(room:AnyRoomView):Extract<ClientMessage,{t:'act'}>{
  if(room.gameId==='lhar')return {t:'act',baseSeq:room.seq,action:chooseLharBotFromView(room.game!,room.you,mulberry32(room.seq))};
  if(room.gameId==='sedma')return {t:'act',baseSeq:room.seq,action:chooseSedmaBotFromView(room.game!,room.you)};
  const moves=legalMovesFromView((room as RoomView<'prsi'>).game!,room.you),id=moves.playable[0];
  return {t:'act',baseSeq:room.seq,action:id?{type:'play',cardId:id,chosenSuit:id.endsWith('-Q')?'hearts':undefined}:moves.canPass?{type:'pass'}:{type:'draw'}};
}
it('real WS: one room, three alternating matches, voting reconnect, exact results and end summary',async()=>{
  const server=await startServer({port:0,host:'127.0.0.1'});const sockets:WebSocket[]=[];
  function client(){
    const socket=new WebSocket(`ws://127.0.0.1:${server.port}/ws`);sockets.push(socket);const messages:ServerMessage[]=[];
    socket.on('message',data=>messages.push(JSON.parse(data.toString())));
    return {socket,messages,send:(m:ClientMessage)=>socket.send(JSON.stringify(m)),open:()=>wait(()=>socket.readyState===socket.OPEN),
      state:(predicate:(r:AnyRoomView)=>boolean=()=>true)=>wait(()=>messages.filter(m=>m.t==='state'&&predicate(m.room)).at(-1) as Extract<ServerMessage,{t:'state'}>|undefined)};
  }
  try{
    const seats=[client(),client()];await Promise.all(seats.map(s=>s.open()));
    seats[0]!.send({t:'create',token:'evening-wire-host-1234',name:'Host'});const code=(await seats[0]!.state()).room.code;
    seats[1]!.send({t:'join',token:'evening-wire-guest-123',name:'Jana',code});await seats[0]!.state(r=>r.players.length===2);
    seats[0]!.send({t:'start',round:0});let frames=await Promise.all(seats.map(s=>s.state(r=>r.status==='playing')));
    const identities=frames[0]!.room.players.map(p=>p.id);
    for(let match=1;match<=3;match++){
      for(let move=0;move<3000&&frames[0]!.room.status==='playing';move++){
        const index=frames.findIndex(f=>f.room.you===frames[0]!.room.game!.currentPlayerId), room=frames[index]!.room;
        seats[index]!.send(legal(room));frames=await Promise.all(seats.map(s=>s.state(r=>r.seq>room.seq)));
        for(const [i,frame] of frames.entries()) for(const other of frames.filter((_,j)=>i!==j)) for(const card of other.room.game!.myHand!) expect(JSON.stringify(frame)).not.toContain(`"${card.id}"`);
        await pause(85); // exercise real production rate limiting rather than disabling it
      }
      expect(frames[0]!.room.status).toBe('finished');expect(frames[0]!.room.evening!.completedMatches).toBe(match);
      if(match===3)break;
      const gameId=match===1?'sedma':'prsi';let room=frames[0]!.room;
      seats[0]!.send({t:'evening',baseRevision:room.evening!.revision,action:'openVote'});
      room=(await seats[0]!.state(r=>r.evening?.phase==='voting'&&r.evening.ballotId===match)).room;
      if(match===1){
        seats[0]!.socket.terminate();seats[0]=client();await seats[0]!.open();seats[0]!.send({t:'join',token:'evening-wire-host-1234',name:'Host',code});
        const resumed=await seats[0]!.state();expect(resumed.reset).toBe(true);expect(resumed.events).toEqual([]);expect(resumed.room.you).toBe(identities[0]);
      }
      const ballotId=room.evening!.ballotId;
      for(const seat of seats)seat.send({t:'vote',ballotId,gameId});
      room=(await seats[0]!.state(r=>r.evening?.phase==='voting'&&r.evening.ballotId===ballotId&&Object.keys(r.evening.votes).length===2)).room;
      seats[0]!.send({t:'evening',baseRevision:room.evening!.revision,action:'confirm',gameId});
      frames=await Promise.all(seats.map(s=>s.state(r=>r.round===match+1&&r.status==='playing')));
      expect(frames[0]!.room.gameId).toBe(gameId);
    }
    const final=frames[0]!.room;expect(final.code).toBe(code);expect(final.players.map(p=>p.id)).toEqual(identities);
    expect(final.evening!.history.map(m=>m.gameId)).toEqual(['prsi','sedma','prsi']);expect(Object.values(final.evening!.stats).map(p=>p.played)).toEqual([3,3]);
    expect(JSON.stringify(final)).not.toContain('evening-wire-');expect(final.evening).not.toHaveProperty('active');
    seats[0]!.send({t:'evening',baseRevision:final.evening!.revision,action:'close'});
    const closed=(await seats[0]!.state(r=>r.evening?.phase==='closed')).room;
    expect(closed.game).toBeNull();expect(closed.code).toBe(code);expect(closed.evening!.stats).toEqual(final.evening!.stats);
  }finally{sockets.forEach(s=>s.terminate());await server.close();}
},90000);
