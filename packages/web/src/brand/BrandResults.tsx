import { useEffect, useRef } from 'react';
import type { RoomView } from '@balik/shared';
import { BrandMascot } from './BrandMascot';
import './brand.css';
export function BrandResults({ room, winnerId, pending, onRematch, onLobby, onLeave, reduced }: {
  room: RoomView; winnerId: string | null; pending: boolean;
  onRematch: () => void; onLobby: () => void; onLeave: () => void; reduced: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const winner = room.players.find((p) => p.id === winnerId);
  const won = winnerId === room.you;
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
    <BrandMascot state={won ? 'celebrate' : 'sad'} size={88} reduced={reduced} />
    <p className="win-kicker">Konec partie · kolo {room.round}</p>
    <h2 id="brand-result-title" className="win-title brand-word">{won ? 'Tenhle balík je tvůj.' : `${winner?.name ?? 'Hráč'} bere výhru.`}</h2>
    <p className="brand-result-note">{won ? `${winner?.name ?? 'Ty'} vítězí. Dobrá ruka, dobré načasování.` : 'Další rozdání, nová šance.'}</p>
    <ol className="brand-scoreboard">{[...room.players].sort((a, b) => b.wins - a.wins).map((player) => <li key={player.id} className={player.id === winnerId ? 'is-winner' : ''}><span>{player.name}{player.id === room.you ? ' (ty)' : ''}</span><b>{player.wins}×</b></li>)}</ol>
    {host ? <div className="brand-result-actions"><button className="btn btn-primary" onClick={onRematch} disabled={pending || room.players.filter((p) => p.connected).length < 2}>Odveta</button><button className="btn btn-secondary" onClick={onLobby} disabled={pending}>Zpět do lobby</button></div> : <p className="win-wait">Hostitel vybírá odvetu nebo návrat do lobby.</p>}
    <button className="btn btn-ghost" onClick={onLeave}>Odejít z místnosti</button>
  </div>;
}
