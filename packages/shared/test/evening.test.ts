import { describe, expect, it } from 'vitest';
import { applyEveningCommand, beginEveningMatch, createEvening, createGameRound, eveningBallot, eveningSummary, eveningView,
  finishEveningMatch, reconcileEvening, ensureRoomEvening, mulberry32, isSedma, GAME_IDS, canStartGame,
  type EveningPerson, type EveningState, type GameId, type GameState } from '../src';
import { clientMessageSchema } from '../src/schema';
const people = (n=2): EveningPerson[] => Array.from({length:n},(_,i)=>({id:`p${i}`,name:`Hráč ${i}`,connected:true,bot:false}));
const command = (e:EveningState, action:'between'|'openVote'|'close'|'confirm',gameId?:GameId) => ({t:'evening' as const,baseRevision:e.revision,action,gameId});
function vote(e:EveningState, roster:EveningPerson[],id:string,gameId:GameId) { return applyEveningCommand(e,roster,'p0',id,{t:'vote',ballotId:e.ballotId,gameId},100); }
function setup(n=2) { const e=createEvening(1); const roster=people(n); reconcileEvening(e,roster); return {e,roster}; }
function finished(id:GameId,n=2):GameState {
  const game=createGameRound(id,people(n).map(p=>p.id),0,mulberry32(1)).state;
  game.phase='finished'; game.winnerId='p0';
  if(isSedma(game)) { game.scores=[50,40]; game.result={scores:[50,40],winnerTeam:0,winnerIds:game.players.filter(p=>p.team===0).map(p=>p.id),reason:'points'}; }
  return game;
}
describe('Herní večer: shared session ledger and voting',()=>{
  it('waits for all votes without a majority; tied leaders require host confirmation',()=>{
    const {e,roster}=setup();
    applyEveningCommand(e,roster,'p0','p1',command(e,'openVote'),2);
    vote(e,roster,'p0','prsi'); expect(eveningBallot(e,roster).ready).toBe(false);
    vote(e,roster,'p1','sedma'); expect(eveningBallot(e,roster)).toMatchObject({ready:true,leaders:['prsi','sedma']});
    expect(()=>applyEveningCommand(e,roster,'p0','p1',command(e,'confirm','sedma'),3)).toThrow('hostitel');
    expect(applyEveningCommand(e,roster,'p0','p0',command(e,'confirm','sedma'),3)).toMatchObject({directive:'start',gameId:'sedma'});
  });
  it('uses a majority before everyone votes and prevents the host choosing the loser',()=>{
    const {e,roster}=setup(4); applyEveningCommand(e,roster,'p0','p0',command(e,'openVote'),2);
    vote(e,roster,'p0','sedma'); vote(e,roster,'p1','prsi'); vote(e,roster,'p2','sedma');
    expect(eveningBallot(e,roster).ready).toBe(false);
    vote(e,roster,'p1','sedma'); expect(eveningBallot(e,roster)).toMatchObject({ready:true,leaders:['sedma']});
    expect(()=>applyEveningCommand(e,roster,'p0','p0',command(e,'confirm','prsi'),3)).toThrow('dohoda');
  });
  it('accepts concurrent votes within a ballot, idempotent repeated votes, rejects stale confirmations/ballots',()=>{
    const {e,roster}=setup(); applyEveningCommand(e,roster,'p0','p0',command(e,'openVote'),2);
    const ballot=e.ballotId; const revision=e.revision;
    vote(e,roster,'p0','prsi'); vote(e,roster,'p1','prsi');
    const before=e.revision; expect(vote(e,roster,'p1','prsi').changed).toBe(false); expect(e.revision).toBe(before);
    expect(()=>applyEveningCommand(e,roster,'p0','p0',{t:'evening',baseRevision:revision,action:'confirm',gameId:'prsi'},3)).toThrow('mezitím');
    applyEveningCommand(e,roster,'p0','p0',command(e,'between'),4); applyEveningCommand(e,roster,'p0','p0',command(e,'openVote'),5);
    expect(()=>applyEveningCommand(e,roster,'p0','p1',{t:'vote',ballotId:ballot,gameId:'sedma'},6)).toThrow('aktuální');
  });
  it('removes disconnected votes, invalid Sedma votes and waits for reserved seats; returning people vote again',()=>{
    const {e,roster}=setup(4); applyEveningCommand(e,roster,'p0','p0',command(e,'openVote'),2);
    vote(e,roster,'p0','sedma'); vote(e,roster,'p1','sedma'); vote(e,roster,'p2','sedma');
    const revision=e.revision; roster[3]!.connected=false; reconcileEvening(e,roster);
    expect(e.revision).toBeGreaterThan(revision); expect(e.votes).toEqual({});
    expect(eveningBallot(e,roster)).toMatchObject({available:GAME_IDS.filter((id)=>canStartGame(id,3)),allPresent:false,ready:false});
    expect(()=>vote(e,roster,'p0','sedma')).toThrow('2 nebo 4');
    roster[3]!.connected=true; reconcileEvening(e,roster); expect(e.votes).toEqual({});
    roster[1]!.bot=true; reconcileEvening(e,roster);
    expect(()=>vote(e,roster,'p1','prsi')).toThrow('připojený');
  });
  it('new voters join an ongoing ballot; bots provide seats but never extra votes',()=>{
    const {e,roster}=setup(2); roster[1]!.bot=true; reconcileEvening(e,roster);
    applyEveningCommand(e,roster,'p0','p0',command(e,'openVote'),2);
    vote(e,roster,'p0','sedma'); expect(eveningBallot(e,roster)).toMatchObject({ready:true,voters:['p0']});
    roster[1]!.bot=false; reconcileEvening(e,roster); expect(eveningBallot(e,roster).ready).toBe(false);
    vote(e,roster,'p1','prsi'); expect(eveningBallot(e,roster).leaders).toEqual(['prsi','sedma']);
  });
  it('records Prší → Sedma → Prší exactly once, keeping game points out of combined wins',()=>{
    const {e,roster}=setup();
    for(const [i,id] of (['prsi','sedma','prsi'] as const).entries()) {
      const game=finished(id); beginEveningMatch(e,i+1,id,game,roster,10+i);
      expect(finishEveningMatch(e,game,20+i)).toBe(true);
      const before=structuredClone(e); expect(finishEveningMatch(e,game,20+i)).toBe(false); expect(e).toEqual(before);
    }
    expect(e.completedMatches).toBe(3); expect(e.history.map(m=>m.gameId)).toEqual(['prsi','sedma','prsi']);
    expect(e.stats.p0).toMatchObject({wins:3,played:3,streak:3,bestStreak:3,teamWins:0});
    expect(e.stats.p1).toMatchObject({wins:0,played:3,streak:0});
    expect(e.history[1]!.scores).toEqual([50,40]); expect(eveningSummary(e)).toMatchObject({winners:['p0'],mostPlayed:['prsi'],played:3,bestStreak:3});
  });
  it('counts both winning partners, draws break streaks, and preserves departed participants',()=>{
    const {e,roster}=setup(4); const game=finished('sedma',4);
    beginEveningMatch(e,1,'sedma',game,roster,10); finishEveningMatch(e,game,20);
    expect(e.stats.p0).toMatchObject({wins:1,played:1,teamWins:1}); expect(e.stats.p2).toMatchObject({wins:1,played:1,teamWins:1});
    expect(e.stats.p1).toMatchObject({wins:0,played:1,teamWins:0});
    if(!isSedma(game)) throw Error(); game.result={winnerTeam:null,winnerIds:[],scores:[40,40],reason:'points'};game.scores=[40,40];
    beginEveningMatch(e,2,'sedma',game,roster,30); finishEveningMatch(e,game,40);
    expect(e.stats.p0).toMatchObject({wins:1,played:2,streak:0,bestStreak:1});
    reconcileEvening(e,roster.slice(1)); expect(e.stats.p0).toBeDefined(); expect(e.history[0]!.players[0]!.name).toBe('Hráč 0');
    expect(eveningSummary(e).winners).toEqual(['p0','p2']);
  });
  it('keeps exact aggregates after the 100-match timeline window',()=>{
    const {e,roster}=setup(); const game=finished('prsi');
    for(let id=1;id<=105;id++){beginEveningMatch(e,id,'prsi',game,roster,id);finishEveningMatch(e,game,id+1);}
    expect(e.history).toHaveLength(100);expect(e.completedMatches).toBe(105);expect(e.gameCounts.prsi).toBe(105);expect(e.stats.p0!.wins).toBe(105);
    expect(finishEveningMatch(e,game,999)).toBe(false);
  });
  it('keeps a closed summary immutable to game commands and never leaks active/private state',()=>{
    const {e,roster}=setup(); applyEveningCommand(e,roster,'p0','p0',command(e,'close'),30);
    expect(e.closedAt).toBe(30); expect(()=>applyEveningCommand(e,roster,'p0','p0',command(e,'openVote'),31)).toThrow('skončil');
    const view=eveningView(e); expect(view).not.toHaveProperty('active'); expect(view).not.toHaveProperty('rosterSignature'); expect(view).not.toHaveProperty('lastRecordedId');
  });
  it('adopts legacy active matches with unknown start time, never fabricates past matches',()=>{
    const roster=people(); const room={status:'playing' as const,round:8,gameId:'prsi' as const,game:createGameRound('prsi',['p0','p1'],0,mulberry32(2)).state};
    const e=ensureRoomEvening(room,roster,100); expect(e.active).toMatchObject({id:8,startedAt:null});expect(e.history).toEqual([]);
    const oldFinished={status:'finished' as const,round:8,gameId:'prsi' as const,game:room.game}; const finishedSession=ensureRoomEvening(oldFinished,roster,100); expect(finishedSession.completedMatches).toBe(0);
  });
  it('validates election identifiers and retains backwards-compatible start messages',()=>{
    expect(clientMessageSchema.safeParse({t:'vote',ballotId:-1,gameId:'prsi'}).success).toBe(false);
    expect(clientMessageSchema.safeParse({t:'evening',baseRevision:1,action:'confirm'}).success).toBe(false);
    expect(clientMessageSchema.safeParse({t:'evening',baseRevision:1,action:'confirm',gameId:'fake'}).success).toBe(false);
    expect(clientMessageSchema.safeParse({t:'start'}).success).toBe(true);
    expect(clientMessageSchema.safeParse({t:'start',round:2}).success).toBe(true);
  });
});

it('adds Lhář to a three-seat ballot and records its verified win without card points',()=>{
  const {e,roster}=setup(3);applyEveningCommand(e,roster,'p0','p0',command(e,'openVote'),2);
  expect(eveningBallot(e,roster).available).toEqual(GAME_IDS.filter((id)=>canStartGame(id,3)));expect(eveningBallot(e,roster).available).toContain('lhar');vote(e,roster,'p0','lhar');vote(e,roster,'p1','lhar');
  expect(applyEveningCommand(e,roster,'p0','p0',command(e,'confirm','lhar'),3)).toMatchObject({directive:'start',gameId:'lhar'});
  const game=createGameRound('lhar',roster.map(p=>p.id),0,mulberry32(3)).state;
  if(!('kind' in game)||game.kind!=='lhar')throw Error();game.phase='finished';game.winnerId='p1';game.result={winnerIds:['p1'],reason:'cards'};
  beginEveningMatch(e,1,'lhar',game,roster,4);expect(finishEveningMatch(e,game,10)).toBe(true);expect(finishEveningMatch(e,game,11)).toBe(false);
  expect(e.gameCounts.lhar).toBe(1);expect(e.stats.p1).toMatchObject({wins:1,played:1,teamWins:0});expect(e.history[0]).not.toHaveProperty('scores');expect(eveningSummary(e).mostPlayed).toEqual(['lhar']);
});
it('upgrades pre-W5 game counts without fabricating Lhář history or changing prior stats',()=>{
  const {e,roster}=setup();Object.assign(e,{gameCounts:{prsi:2,sedma:1}});
  const room={status:'lobby' as const,round:3,gameId:'prsi' as const,game:null,evening:e};
  const upgraded=ensureRoomEvening(room,roster,100);expect(upgraded.gameCounts).toEqual({...Object.fromEntries(GAME_IDS.map((id)=>[id,0])),prsi:2,sedma:1});expect(upgraded.history).toEqual([]);
});
