import { useEffect, useState } from 'react';
import { gameName, type AnyRoomView } from '@balik/shared';
import { BrandMascot } from '../brand/BrandMascot';
import { getLastStateMessage } from '../net/client';
import './evening.css';
/** A cancellable presentation beat. Server play/dealing starts independently. */
export function GameTransition({room, reduced}: {room: AnyRoomView; reduced: boolean}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const last = getLastStateMessage();
    if (reduced || !room.evening?.completedMatches || room.status !== 'playing' || last?.reset || last?.room.round !== room.round || document.hidden) { setShow(false); return; }
    setShow(true);
    const timer = setTimeout(()=>setShow(false),650);
    const hide = ()=>{if(document.hidden)setShow(false);};
    document.addEventListener('visibilitychange',hide);
    return ()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',hide);};
  },[room.code,room.round,reduced]);
  if (!show || reduced) return null;
  return <div className="game-transition" role="region" aria-label="Přechod do další hry"><BrandMascot state="deal" size={100}/><p>Stejná parta. Nové rozdání.</p><h2>{gameName(room.gameId)}</h2><button className="btn btn-ghost" onClick={()=>setShow(false)}>Přeskočit animaci</button></div>;
}
