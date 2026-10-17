import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createEvening, beginEveningMatch, finishEveningMatch, createGameRound, eveningView, reconcileEvening, mulberry32, type AnyRoomView } from '@balik/shared';
import { EveningScores, EveningHistory, EveningSummary } from '../src/evening/EveningScores';
import { BrandResults } from '../src/brand/BrandResults';
// Stub only the browser/network boundary: render the real screen composition and controls.
vi.mock('../src/net/client',()=>({addBot:()=>{},eveningAction:()=>{},leaveRoom:()=>{},rematch:()=>{},removeBot:()=>{},voteGame:()=>{},onEmote:()=>()=>{},sendEmote:()=>true}));
vi.mock('../src/net/store',()=>({showToast:()=>{},useApp:(selector:(s:unknown)=>unknown)=>selector({pending:false,status:'open'})}));
vi.mock('../src/lib/motionPref',()=>({useMotionPref:()=>({reduced:true})}));
import { EveningScreen } from '../src/evening/EveningScreen';
function fixture(){
  const players=['a','b'].map((id)=>({id,name:id==='a'?'Anna':'Bára',bot:false,connected:true,wins:0}));
  const e=createEvening(100);reconcileEvening(e,players);
  const game=createGameRound('prsi',['a','b'],0,mulberry32(2)).state;game.phase='finished';game.winnerId='a';
  beginEveningMatch(e,1,'prsi',game,players,100);finishEveningMatch(e,game,200);
  const room:AnyRoomView={code:'ABCD',gameId:'prsi',you:'a',hostId:'a',status:'lobby',round:1,seq:100,players,game:null,evening:eveningView(e)};
  return {room,e};
}
describe('Evening shared UI',()=>{
  it('renders match-result metrics as accessible lists without mixing game points',()=>{
    const {room}=fixture();const html=renderToStaticMarkup(createElement(EveningScores,{room}));
    expect(html).toContain('Skóre večera');expect(html).toContain('<ol tabindex="0"');expect(html).toContain('1 odehraných partií');expect(html).toContain('Anna (ty)');expect(html).not.toContain('<table');
    const history=renderToStaticMarkup(createElement(EveningHistory,{evening:room.evening!}));expect(history).toContain('<details');expect(history).toContain('<time');expect(history).toContain('Prší');expect(history).toContain('Výhra: Anna');
  });
  it('renders intermission, live ballots, unavailable Sedma and the final summary on the same room code',()=>{
    const {room,e}=fixture();let html=renderToStaticMarkup(createElement(EveningScreen,{room}));
    expect(html).toContain('Ještě jednu?');expect(html).toContain('ABCD');expect(html).toContain('Změnit hru');expect(html).toContain('Odveta');
    e.phase='voting';e.ballotId=1;e.votes={a:'prsi'};room.evening=eveningView(e);
    html=renderToStaticMarkup(createElement(EveningScreen,{room}));expect(html).toContain('Co dáme dál?');expect(html).toContain('aria-pressed="true"');expect(html).toContain('Jak vybíráme hru?');
    room.players.push({id:'c',name:'Cyril',bot:false,connected:true,wins:0});
    html=renderToStaticMarkup(createElement(EveningScreen,{room}));expect(html).toContain('Sedma ve třech nejde.');
    e.phase='closed';e.closedAt=300;room.evening=eveningView(e);
    html=renderToStaticMarkup(createElement(EveningScreen,{room}));expect(html).toContain('To byl večer.');expect(html).toContain('Večer vyhrává Anna.');expect(html).toContain('Zpět na úvod');expect(html).not.toContain('Rozdat Prší');
  });
  it('uses existing brand results with evening CTA and a visible reactions slot',()=>{
    const {room}=fixture();const html=renderToStaticMarkup(createElement(BrandResults,{room,winnerId:'a',pending:false,reduced:true,onRematch:()=>{},onLobby:()=>{},onLeave:()=>{},onChangeGame:()=>{},onCloseEvening:()=>{},reactions:createElement('span',null,'Reakce u výsledků')}));
    expect(html).toContain('Přehled večera');expect(html).toContain('Změnit hru');expect(html).toContain('Konec večera');expect(html).toContain('Reakce u výsledků');expect(html).toContain('aria-modal="true"');
  });
  it('shows honest zero-game and tied-game summaries',()=>{
    const e=createEvening(1);let html=renderToStaticMarkup(createElement(EveningSummary,{evening:eveningView(e)}));expect(html).toContain('>0<');expect(html).toContain('—');
    e.gameCounts={prsi:1,sedma:1};e.completedMatches=2;
    html=renderToStaticMarkup(createElement(EveningSummary,{evening:eveningView(e)}));expect(html).toContain('Prší + Sedma');expect(html).toContain('shoda');
  });
});
