import { eveningSummary, gameName, type AnyRoomView, type EveningMatch, type EveningView } from '@balik/shared';
import { avatarColor } from '../lib/format';
import './evening.css';

export function EveningScores({ room, compact = false }: { room: AnyRoomView; compact?: boolean }) {
  const evening = room.evening;
  if (!evening) return null;
  const stats = new Map(Object.values(evening.stats).map((p) => [p.id, p]));
  for (const p of room.players) if (!stats.has(p.id)) stats.set(p.id, {id:p.id,name:p.name,played:0,wins:0,teamWins:0,streak:0,bestStreak:0});
  const rows = [...stats.values()].sort((a,b) => b.wins-a.wins || a.name.localeCompare(b.name,'cs'));
  return <section className={`evening-scoreboard${compact ? ' is-compact' : ''}`} aria-label="Skóre večera">
    <h2>Společné skóre <small>{evening.completedMatches} odehraných partií</small></h2>
    <ol tabIndex={0} aria-label="Výsledky hráčů">{rows.map((p) => <li key={p.id}>
      <span className="avatar sm" style={{background:avatarColor(p.id)}} aria-hidden>{p.name.slice(0,1)}</span>
      <span className="evening-score-name"><b>{p.name}{p.id === room.you ? ' (ty)' : ''}</b><small>{room.players.some((seat) => seat.id === p.id) ? '' : 'Mimo stůl · '}{p.played} partií{p.teamWins ? ` · ${p.teamWins} týmových výher` : ''}{p.streak > 1 ? ` · série ${p.streak}` : ''}</small></span>
      <strong>{p.wins}<small>výher</small></strong>
    </li>)}</ol>
    {room.round > evening.completedMatches + (room.status === 'playing' ? 1 : 0) && <p className="evening-fine">Historie se zaznamenává od aktualizace. Starší partie se nedopočítávají.</p>}
    {!compact && <p className="evening-fine">Vítězství se počítají napříč hrami. Ve 2v2 získá výhru každý vítězný spoluhráč; remíza ji nepřidává.</p>}
  </section>;
}
export function MatchDetail({ match }: { match: EveningMatch }) {
  const winners = match.players.filter((p) => match.winnerIds.includes(p.id)).map((p) => p.name);
  return <details className="evening-match">
    <summary><span className={`evening-game-mark is-${match.gameId}`} aria-hidden>{match.gameId === 'prsi' ? 'P' : match.gameId === 'sedma' ? '7' : 'L'}</span><span><b>{gameName(match.gameId)} · partie {match.id}</b><small>{winners.length ? `Výhra: ${winners.join(' + ')}` : match.reason === 'forfeit' ? 'Bez vítěze' : 'Remíza'}{match.reason === 'forfeit' ? ' · kontumace' : ''}</small></span><time dateTime={new Date(match.endedAt).toISOString()}>{new Date(match.endedAt).toLocaleString('cs-CZ',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})}</time></summary>
    <div className="evening-match-detail">
      {match.scores ? ([0,1] as const).map((team) => <p key={team}><b>Tým {team+1}: {match.scores![team]} bodů</b><span>{match.players.filter((p) => p.team === team).map((p) => p.name).join(' + ')}</span></p>) : <p>{match.players.map((p) => p.name).join(' · ')}<span>{match.gameId==='lhar'?'Lhář rozhoduje zbavení ruky po uzavření výzvy; body se k večeru nepřičítají.':'Prší rozhoduje zbavení ruky; body se k večeru nepřičítají.'}</span></p>}
      <small>{match.startedAt === null ? 'Čas začátku převzaté partie není známý.' : `Začátek ${new Date(match.startedAt).toLocaleTimeString('cs-CZ')}`}</small>
    </div>
  </details>;
}
export function EveningHistory({ evening }: { evening: EveningView }) {
  return <section className="evening-history" aria-label="Historie večera"><h2>Jak šel večer</h2>
    {!evening.history.length ? <p className="evening-fine">První příběh se napíše po dohrání partie.</p> : [...evening.history].reverse().map((match) => <MatchDetail key={match.id} match={match} />)}
    {evening.completedMatches > evening.history.length && <p className="evening-fine">Zobrazeno posledních {evening.history.length} partií. Součty zahrnují celý večer.</p>}
  </section>;
}
export function EveningSummary({ evening }: { evening: EveningView }) {
  const summary = eveningSummary(evening);
  return <div className="evening-summary-stats">
    <p><b>{summary.played}</b><span>odehraných partií</span></p>
    <p><b>{summary.mostPlayed.length ? summary.mostPlayed.map(gameName).join(' + ') : '—'}</b><span>nejhranější hra{summary.mostPlayed.length > 1 ? ' · shoda' : ''}</span></p>
    <p><b>{summary.bestStreak}</b><span>nejdelší série výher</span></p>
  </div>;
}
