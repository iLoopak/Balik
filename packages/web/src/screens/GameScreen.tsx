import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type { AnyRoomView } from '@balik/shared';
import { leaveRoom } from '../net/client';
import { useApp } from '../net/store';
import { useMotionPref } from '../lib/motionPref';
import { gameName } from '@balik/shared';
import { LharTable } from '../lhar/LharTable';
import { SedmaTable } from '../sedma/SedmaTable';
import { Table } from '../table/Table';
import './screens.css';
import { BrandOptions } from '../brand/BrandSettings';
import { AppSettings } from '../themes/AppearancePicker';
import { GameTransition } from '../evening/GameTransition';
import { EmotePicker } from '../brand/Emotes';
import { RulesButton } from '../rules/RulesPanel';

export function GameScreen({ room }: { room: AnyRoomView }) {
  const status = useApp((s) => s.status);
  const [menu, setMenu] = useState(false);
  const { pref, setPref, reduced } = useMotionPref();

  return (
    <main className="game-screen">
      <header className="topbar">
        <span className="brand-word topbar-brand">BALÍK</span>
        <span className="topbar-room">
          {gameName(room.gameId)} · <b>{room.code}</b>
        </span>
        <AnimatePresence>
          {status !== 'open' && (
            <motion.span className="conn-pill" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <span className="spinner tiny" /> Obnovuji spojení…
            </motion.span>
          )}
        </AnimatePresence>
        <EmotePicker /><RulesButton gameId={room.gameId} compact note={room.gameId === 'sedma' ? `V této místnosti má poslední štych +${room.sedmaBonus ?? 10} bodů.` : undefined} /><AppSettings compact />
        <button className="btn btn-ghost topbar-menu" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Menu">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path fill="currentColor" d="M4 7h16v2H4zm0 4h16v2H4zm0 4h16v2H4z" />
          </svg>
        </button>
        <AnimatePresence>
          {menu && (
            <motion.div
              className="menu"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
            >
              <BrandOptions />
              <label className="menu-row">
                <input type="checkbox" checked={pref === 'reduced'} onChange={(e) => setPref(e.target.checked ? 'reduced' : 'system')} />
                Omezit animace
              </label>
              <button className="menu-row danger" onClick={leaveRoom}>
                Odejít ze hry
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      {room.gameId === 'lhar' ? <LharTable key={`${room.code}:${room.you}`} room={room} reducedMotion={reduced} /> : room.gameId === 'sedma' ? <SedmaTable key={`${room.code}:${room.you}`} room={room} reducedMotion={reduced} /> : <Table key={`${room.code}:${room.you}`} room={room} reducedMotion={reduced} />}
      <GameTransition room={room} reduced={reduced} />
    </main>
  );
}
