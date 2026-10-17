import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type { RoomView } from '@balik/shared';
import { leaveRoom } from '../net/client';
import { useApp } from '../net/store';
import { useMotionPref } from '../lib/motionPref';
import { Table } from '../table/Table';
import './screens.css';

export function GameScreen({ room }: { room: RoomView }) {
  const status = useApp((s) => s.status);
  const [menu, setMenu] = useState(false);
  const { pref, setPref, reduced } = useMotionPref();

  return (
    <main className="game-screen">
      <header className="topbar">
        <span className="brand-word topbar-brand">BALÍK</span>
        <span className="topbar-room">
          Prší · <b>{room.code}</b>
        </span>
        <AnimatePresence>
          {status !== 'open' && (
            <motion.span className="conn-pill" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <span className="spinner tiny" /> Obnovuji spojení…
            </motion.span>
          )}
        </AnimatePresence>
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
      <Table key={`${room.code}:${room.you}`} room={room} reducedMotion={reduced} />
    </main>
  );
}
