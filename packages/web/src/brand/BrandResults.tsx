import { useEffect, useRef } from 'react';
import { canStartGame, type AnyRoomView } from '@balik/shared';
import { BrandMascot } from './BrandMascot';
import './brand.css';
export function BrandResults({ room, winnerId, pending, onRematch, onLobby, onLeave, reduced }: {
  room: AnyRoomView; winnerId: string | null; pending: boolean;
  onRematch: () => void; onLobby: () => void; onLeave: () => void; reduced: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const winner = room.players.find((p) => p.id === winnerId);
  const result = room.gameId === 'sedma' ? room.game?.result : null;
  const winningIds = result?.winnerIds ?? (winnerId ? [winnerId] : []);
  const draw = !!result && result.winnerTeam === null;
  const won = winningIds.includes(room.you);
  const host = room.hostId === room.you;
  useEffect(() => {
    const before = document.activeElement;
    root.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    return () => { if (before instanceof HTMLElement && before.isConnected) before.focus(); };
  }, []);
  return <div className="brand-results" role="dialog" aria-modal="true" aria-labelledby="brand-result-title" ref={root} onKeyDown={(event) => {
    if (event.key !== 'Tab') return;
    const buttons = root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
    const first = buttons?.[0], last = buttons?.[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <div className="brand-result-signature"><span>BALÍK</span><i aria-hidden /><span>JEŠTĚ JEDNU?</span></div>
    <BrandMascot state={draw ? 'idle' : won ? 'celebrate' : 'sad'} size={88} reduced={reduced} />
    <p className="win-kicker">Konec partie · kolo {room.round}</p>
    <h2 id="brand-result-title" className="win-title brand-word">{draw ? 'Dělíte se o balík.' : result ? `Tým ${(result.winnerTeam ?? 0) + 1} bere výhru.` : won ? 'Tenhle balík je tvůj.' : `${winner?.name ?? 'Hráč'} bere výhru.`}</h2>
    <p className="brand-result-note">{result ? (result.reason === 'forfeit' ? 'Kontumace po odchodu hráče.' : `Sedma · ${result.scores[0]} : ${result.scores[1]} bodů`) : won ? `${winner?.name ?? 'Ty'} vítězí. Dobrá ruka, dobré načasování.` : 'Další rozdání, nová šance.'}</p>
    {room.gameId === 'sedma' && result && <div className="sedma-result-teams">{([0, 1] as const).map((team) => <p key={team}><b>Tým {team + 1} · {result.scores[team]} bodů</b><span>{room.game?.players.filter((p) => p.team === team).map((p) => room.players.find((r) => r.id === p.id)?.name ?? 'Odpojený hráč').join(' + ')}</span></p>)}</div>}
    <ol className="brand-scoreboard">{[...room.players].sort((a, b) => b.wins - a.wins).map((player) => <li key={player.id} className={winningIds.includes(player.id) ? 'is-winner' : ''}><span>{player.name}{player.id === room.you ? ' (ty)' : ''}</span><b>{player.wins}×</b></li>)}</ol>
    {host ? <div className="brand-result-actions"><button className="btn btn-primary" onClick={onRematch} disabled={pending || !canStartGame(room.gameId, room.players.filter((p) => p.connected).length)}>Odveta</button><button className="btn btn-secondary" onClick={onLobby} disabled={pending}>Zpět do lobby</button></div> : <p className="win-wait">Hostitel vybírá odvetu nebo návrat do lobby.</p>}
    <button className="btn btn-ghost" onClick={onLeave}>Odejít z místnosti</button>
  </div>;
}
