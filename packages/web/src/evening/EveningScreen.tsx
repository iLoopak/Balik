import { canStartGame, GAME_IDS, GAME_INFO, eveningBallot, eveningSummary, gameName, type AnyRoomView } from '@balik/shared';
import { BrandMascot } from '../brand/BrandMascot';
import { AppSettings } from '../themes/AppearancePicker';
import { EmoteBubble, EmotePicker, useEmotes } from '../brand/Emotes';
import { useMotionPref } from '../lib/motionPref';
import { Avatar } from '../avatars/Avatar';
import { addBot, eveningAction, leaveRoom, rematch, removeBot, voteGame } from '../net/client';
import { showToast, useApp } from '../net/store';
import { EveningHistory, EveningScores, EveningSummary, MatchDetail } from './EveningScores';
import { GameMotif } from '../library/GameMotif';
import '../library/library.css';
import './evening.css';

export function EveningScreen({room}: {room: AnyRoomView}) {
  const e = room.evening!;
  const closed = e.phase === 'closed', voting = e.phase === 'voting';
  const host = room.hostId === room.you;
  const pending = useApp((s) => s.pending), connection = useApp((s) => s.status);
  const disabled = pending || connection !== 'open';
  const { reduced } = useMotionPref();
  const emotes = useEmotes(room.code);
  const ballot = eveningBallot(e,room.players);
  const summary = eveningSummary(e);
  const winnerNames = summary.winners.map((id) => e.stats[id]!.name).join(' + ');
  const streak = e.stats[room.you]?.streak ?? 0;
  const last = e.history.at(-1);
  const canRematch = canStartGame(room.gameId,room.players.length) && room.players.every((p) => p.connected);
  return <main className="evening-screen">
    <header className="evening-header"><span className="brand-word">BALÍK</span><span>Herní večer · <b>{room.code}</b></span><EmotePicker/><AppSettings compact game={room.gameId}/><button className="btn btn-ghost" onClick={leaveRoom}>Odejít</button></header>
    {connection !== 'open' && <p className="evening-connection" role="status">Obnovuji spojení se stolem…</p>}
    <div className="evening-layout">
      <section className={`evening-feature${closed ? ' is-closed' : ''}`} aria-labelledby="evening-title">
        <div className="evening-welcome"><BrandMascot state={closed ? summary.winners.includes(room.you) ? 'celebrate' : 'idle' : voting ? 'thinking' : streak >= 2 ? 'celebrate' : 'deal'} size={88} reduced={reduced}/><div><p className="evening-kicker">JEDNA PARTA. JEDEN BALÍK.</p><h1 id="evening-title" className="brand-word">{closed ? 'To byl večer.' : voting ? 'Co dáme dál?' : 'Ještě jednu?'}</h1><p>{closed ? winnerNames ? `Večer vyhrává ${winnerNames}.` : 'Díky za společnou hru.' : streak >= 2 ? `Tvoje série: ${streak} výher. Balík je v pohybu.` : 'Stejná parta, stejný kód. Další hra může začít.'}</p></div></div>
        <div className="evening-party" aria-label="Parta u stolu">{room.players.map((p) => <div key={p.id} className={p.connected ? '' : 'is-offline'}><Avatar player={p} size={44} winner={closed && summary.winners.includes(p.id)} ready={!closed && p.connected} reduced={reduced} /><span>{p.name}{p.id === room.you ? ' (ty)' : ''}<small>{p.id === room.hostId ? 'Hostitel · ' : ''}{p.bot ? 'Počítač' : p.connected ? 'Připojeno' : 'Místo čeká na návrat'}</small></span>{host && p.bot && !closed && <button className="evening-remove-bot" onClick={()=>removeBot(p.id)} disabled={disabled} aria-label={`Odebrat ${p.name}`}>×</button>}</div>)}</div>
        {!closed && room.players.length < 4 && host && <button className="btn btn-ghost" disabled={disabled} onClick={addBot}>+ Přidat počítač</button>}
        <div className="evening-emotes">{emotes.map((m) => <div key={m.id}><b>{room.players.find((p)=>p.id===m.playerId)?.name}</b><EmoteBubble message={m} author={room.players.find((p)=>p.id===m.playerId)?.name ?? 'Hráč'}/></div>)}</div>
        {closed ? <><EveningSummary evening={e}/><button className="btn btn-primary wide" onClick={leaveRoom}>Zpět na úvod</button></> : voting ? <>
          <div className="evening-game-choices">{GAME_IDS.map((id) => {
            const available = ballot.available.includes(id), selected = e.votes[room.you] === id;
            return <div key={id} className={`evening-game-option${selected ? ' is-selected' : ''}`}>
              <button type="button" aria-pressed={selected} disabled={!available || disabled} onClick={()=>voteGame(id)}><span className={`evening-game-art library-art motif-host is-${id}${selected ? ' is-on' : ''}`} aria-hidden><GameMotif id={id} /></span><b>{gameName(id)}</b><small>{GAME_INFO[id].playersLabel}</small><strong>{ballot.counts[id]} hlasů{selected ? ' · tvůj hlas' : ''}</strong></button>
              <p>{available ? room.players.filter((p)=>p.connected && e.votes[p.id]===id).map((p)=>p.name).join(', ') || 'Zatím bez hlasu' : `${GAME_INFO[id].needPlayers} Upravte počet botů nebo vyberte jinou hru.`}</p>
              {host && <button className="btn btn-primary" disabled={disabled || !ballot.ready || !ballot.leaders.includes(id)} onClick={()=>eveningAction('confirm',id)}>Rozdat {gameName(id)}</button>}
            </div>;
          })}</div>
          <p className="evening-ballot-status" role="status">{!ballot.allPresent ? 'Čekáme na návrat nebo uvolnění odpojeného místa.' : ballot.ready ? ballot.leaders.length>1 ? 'Shoda hlasů. Hostitel vybírá jednu z vedoucích her.' : `Dohoda: ${gameName(ballot.leaders[0]!)}. Potvrdí hostitel.` : `Hlasovalo ${ballot.cast} z ${ballot.voters.length} lidí.`}</p>
          <details className="evening-vote-rules"><summary>Jak vybíráme hru?</summary><p>Každý připojený člověk má jeden měnitelný hlas, boti nehlasují. Nadpoloviční většina určí hru. Bez většiny čekáme na všechny hlasy; vyhrává nejvyšší počet a při shodě vybírá hostitel. Ten vždy potvrdí rozdání.</p></details>
          {host && <button className="btn btn-ghost" disabled={disabled} onClick={()=>eveningAction('between')}>Zrušit volbu</button>}
        </> : <div className="evening-next-actions">{host && <button className="btn btn-primary" disabled={disabled || !canRematch} onClick={rematch}>{e.completedMatches ? `Odveta · ${gameName(room.gameId)}` : `Rozdat ${gameName(room.gameId)}`}</button>}<button className="btn btn-secondary" disabled={disabled} onClick={()=>eveningAction('openVote')}>Změnit hru</button>{!canRematch && <p className="evening-fine">{room.players.some((p)=>!p.connected) ? 'Čekáme na návrat nebo uvolnění odpojeného místa.' : `${GAME_INFO[room.gameId].needPlayers} Vyberte jinou hru nebo upravte počet botů.`}</p>}</div>}
        {!closed && host && <details className="evening-close"><summary>Konec večera</summary><p>Zachováme společný souhrn. Tento večer už pak nepůjde rozehrát.</p><button className="btn btn-secondary" disabled={disabled} onClick={()=>eveningAction('close')}>Zakončit večer</button></details>}
        {!closed && <button className="btn btn-ghost evening-invite" onClick={async()=>{try{await navigator.clipboard.writeText(`${window.location.origin}/r/${room.code}`);showToast('Pozvánka zkopírována');}catch{showToast(`Kód místnosti: ${room.code}`);}}}>Pozvat ke stejnému stolu · {room.code}</button>}
        <p className="evening-fine">Výsledky patří k této místnosti. Po odchodu celé party nebo zániku místnosti se nemusí zachovat.</p>
      </section>
      <aside className="evening-side"><EveningScores room={room}/>{last && !closed && <section className="evening-last"><h2>Poslední partie</h2><MatchDetail match={last}/></section>}<EveningHistory evening={e}/></aside>
    </div>
  </main>;
}
