import { AnimatePresence, motion } from 'motion/react';
import { PRSI_MAX_PLAYERS, PRSI_MIN_PLAYERS, type RoomView } from '@balik/shared';
import { avatarColor } from '../lib/format';
import { addBot, leaveRoom, removeBot, startGame } from '../net/client';
import { showToast, useApp } from '../net/store';
import './screens.css';

export function Lobby({ room }: { room: RoomView }) {
  const pending = useApp((s) => s.pending);
  const isHost = room.hostId === room.you;
  const connected = room.players.filter((p) => p.connected).length;
  const link = `${window.location.origin}/r/${room.code}`;
  const host = room.players.find((p) => p.id === room.hostId);

  const share = async () => {
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: 'BALÍK — Prší', text: `Pojď hrát Prší! Kód: ${room.code}`, url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      showToast('Odkaz zkopírován');
    } catch {
      // Share sheet dismissed or clipboard blocked — the code stays visible on screen.
    }
  };

  return (
    <main className="screen lobby">
      <div className="panel">
        <div className="lobby-head">
          <div className="game-tag">
            <span className="game-dot" /> Prší · lobby
          </div>
          <button className="btn btn-ghost" onClick={leaveRoom}>
            Odejít
          </button>
        </div>

        <div className="code-block">
          <span className="label">Kód místnosti</span>
          <div className="code-big brand-word" aria-label={`Kód ${room.code.split('').join(' ')}`}>
            {room.code.split('').map((ch, i) => (
              <motion.span key={i} initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 500, damping: 26 }}>
                {ch}
              </motion.span>
            ))}
          </div>
          <button className="btn btn-secondary wide" onClick={share}>
            Pozvat přátele
          </button>
        </div>

        <span className="label">
          Hráči ({room.players.length}/{PRSI_MAX_PLAYERS})
        </span>
        <ul className="seat-list">
          <AnimatePresence initial={false}>
            {room.players.map((p) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, x: -16, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className={p.connected ? '' : 'is-offline'}
              >
                <span className="avatar" style={{ background: avatarColor(p.id) }}>
                  {p.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="seat-list-name">
                  {p.name}
                  {p.id === room.you && <em> (ty)</em>}
                </span>
                {p.id === room.hostId && <span className="pill">hostitel</span>}
                {p.bot && <span className="pill bot">počítač</span>}
                {p.bot && isHost && (
                  <button className="seat-remove" onClick={() => removeBot(p.id)} aria-label={`Odebrat ${p.name}`} disabled={pending}>
                    ×
                  </button>
                )}
                {!p.connected && <span className="pill muted">odpojeno</span>}
              </motion.li>
            ))}
            {Array.from({ length: PRSI_MAX_PLAYERS - room.players.length }, (_, i) => (
              <motion.li key={`empty-${i}`} layout className="is-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="avatar empty" />
                <span className="seat-list-name">volné místo</span>
                {isHost && i === 0 && (
                  <button className="btn btn-ghost add-bot" onClick={addBot} disabled={pending}>
                    + přidat počítač
                  </button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {isHost ? (
          <button className="btn btn-primary wide" onClick={startGame} disabled={pending || connected < PRSI_MIN_PLAYERS}>
            {connected < PRSI_MIN_PLAYERS ? 'Čekáme na dalšího hráče…' : `Rozdat karty (${connected} hráči)`}
          </button>
        ) : (
          <p className="lobby-wait">
            <span className="dot-pulse" /> Čekáme, až {host?.name ?? 'hostitel'} rozdá karty
          </p>
        )}
      </div>
      <details className="rules">
        <summary>Pravidla Prší v kostce</summary>
        <ul>
          <li>Každý dostane 4 karty. Přikládáš stejnou barvu nebo hodnotu.</li>
          <li>
            <b>7</b> — další bere 2 karty, nebo přiloží svou sedmičku (trest se sčítá).
          </li>
          <li>
            <b>A</b> — další hráč stojí.
          </li>
          <li>
            <b>Q</b> (svršek) — jde na cokoli a určíš novou barvu.
          </li>
          <li>Nemáš co hrát? Lízni si. Pokud líznutá karta sedí, můžeš ji hned zahrát.</li>
          <li>Kdo se první zbaví všech karet, vyhrává.</li>
        </ul>
      </details>
    </main>
  );
}
