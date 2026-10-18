import { AnimatePresence, motion } from 'motion/react';
import { GAME_INFO, ROOM_MAX_PLAYERS, canStartGame, gameName, type AnyRoomView } from '@balik/shared';
import { RulesContent } from '../rules/RulesPanel';
import { Avatar } from '../avatars/Avatar';
import { addBot, eveningAction, leaveRoom, removeBot, startGame } from '../net/client';
import { showToast, useApp } from '../net/store';
import './screens.css';
import { BrandMascot } from '../brand/BrandMascot';
import { AppSettings } from '../themes/AppearancePicker';
import { EmoteBubble, EmotePicker, useEmotes } from '../brand/Emotes';

export function Lobby({ room }: { room: AnyRoomView }) {
  const emotes = useEmotes(room.code);
  const pending = useApp((s) => s.pending);
  const isHost = room.hostId === room.you;
  const connected = room.players.filter((p) => p.connected).length;
  const link = `${window.location.origin}/r/${room.code}`;
  const host = room.players.find((p) => p.id === room.hostId);

  const share = async () => {
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: `BALÍK — ${gameName(room.gameId)}`, text: `Pojď hrát ${gameName(room.gameId)}! Kód: ${room.code}`, url: link });
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
            <span className="game-dot" /> {gameName(room.gameId)} · lobby
          </div>
          <button className="btn btn-ghost" onClick={leaveRoom}>
            Odejít
          </button>
        </div>

        <div className="code-block">
          <div className="brand-welcome"><BrandMascot state={connected < 2 ? 'thinking' : 'idle'} size={56} /><span className="brand-welcome-copy"><strong>{connected < 2 ? 'Držím místo u stolu.' : 'Balík čeká na rozdání.'}</strong>Pošli odkaz a hrajte spolu.</span><div className="lobby-options"><AppSettings compact /><EmotePicker /></div></div>
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
          Hráči ({room.players.length}/{ROOM_MAX_PLAYERS})
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
                <Avatar player={p} size={44} ready={p.connected} />
                <span className="seat-list-name">
                  {p.name}
                  {p.id === room.you && <em> (ty)</em>}
                </span>
                {room.gameId === 'sedma' && <span className={`pill sedma-team-${room.players.indexOf(p) % 2}`}>Tým {room.players.indexOf(p) % 2 + 1}</span>}
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
            {Array.from({ length: ROOM_MAX_PLAYERS - room.players.length }, (_, i) => (
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

        {room.evening && <button className="btn btn-secondary wide" onClick={()=>eveningAction('openVote')} disabled={pending}>Vybrat jinou hru společně</button>}
        <div className="lobby-emotes">{emotes.map((message) => <div className="lobby-emote" key={message.id}><b>{room.players.find((p) => p.id === message.playerId)?.name ?? 'Hráč'}</b><EmoteBubble message={message} author={room.players.find((p) => p.id === message.playerId)?.name ?? 'Hráč'} /></div>)}</div>
        {isHost ? (
          <button className="btn btn-primary wide" onClick={startGame} disabled={pending || !canStartGame(room.gameId, connected) || room.players.some((p)=>!p.connected)}>
            {!canStartGame(room.gameId, connected) ? GAME_INFO[room.gameId].needPlayers : `Rozdat karty (${connected} ${connected === 1 ? 'hráč' : 'hráči'})`}
          </button>
        ) : (
          <p className="lobby-wait">
            <span className="dot-pulse" /> Čekáme, až {host?.name ?? 'hostitel'} rozdá karty
          </p>
        )}
      </div>
      <details className="rules">
        <summary>Pravidla {gameName(room.gameId)}</summary>
        <RulesContent gameId={room.gameId} note={room.gameId === 'sedma' ? `V této místnosti má poslední štych +${room.sedmaBonus ?? 10} bodů.` : undefined} />
      </details>
    </main>
  );
}
