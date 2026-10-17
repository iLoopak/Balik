import { motion, useReducedMotion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { GAME_IDS, gameName, MAX_NAME_LENGTH, ROOM_CODE_LENGTH, type Card, type GameId } from '@balik/shared';
import { CardView } from '../cards/Card';
import { getName } from '../lib/identity';
import { createRoom } from '../net/client';
import { navigate, useApp } from '../net/store';
import './screens.css';
import '../sedma/sedma.css';
import { BrandMascot } from '../brand/BrandMascot';
import { AppSettings } from '../themes/AppearancePicker';

const HERO: Card[] = [
  { id: 'hearts-Q', suit: 'hearts', rank: 'Q' },
  { id: 'spades-7', suit: 'spades', rank: '7' },
  { id: 'diamonds-A', suit: 'diamonds', rank: 'A' },
];

export function Home() {
  const [name, setName] = useState(getName);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [bots, setBots] = useState(1);
  const [gameId, setGameId] = useState<GameId>('prsi');
  const [bonus, setBonus] = useState<0 | 10>(10);
  const status = useApp((s) => s.status);
  const reduced = useReducedMotion();
  const busy = status === 'connecting';

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    createRoom(name.trim(), 0, gameId, bonus);
  };
  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length === ROOM_CODE_LENGTH) navigate(`/r/${c}`);
  };

  return (
    <main className="screen home">
      <AppSettings />
      <div className="hero">
        <div className="hero-cards" aria-hidden>
          {HERO.map((card, i) => (
            <motion.div
              key={card.id}
              className="hero-card"
              initial={reduced ? false : { y: 80, opacity: 0, rotate: 0 }}
              animate={{ y: [0, 0], opacity: 1, rotate: (i - 1) * 12, x: (i - 1) * 46 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.1 + i * 0.09 }}
            >
              <CardView card={card} faceUp initialFaceUp={!!reduced} flipTransition={{ duration: 0.5, delay: 0.35 + i * 0.09 }} />
            </motion.div>
          ))}
        </div>
        <motion.h1
          className="brand-word home-title"
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          BALÍK
        </motion.h1>
        <p className="home-tagline">Karetní hry s přáteli. Pošli odkaz, sedněte ke stolu, hrajte. Bez registrace.</p>
      </div>

      <motion.div
        className="panel"
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
      >
        <div className="game-tag">
          <span className="game-dot" /> {gameName(gameId)} · {gameId === 'sedma' ? '2 nebo 4 hráči' : '2–4 hráči'}
        </div>
        <div className="segmented game-choice" role="radiogroup" aria-label="Hra">
          {GAME_IDS.map((id) => <button type="button" key={id} role="radio" aria-checked={gameId === id} className={gameId === id ? 'is-on' : ''} onClick={() => { setGameId(id); if (id === 'sedma' && bots === 2) setBots(1); }}>{gameName(id)}</button>)}
        </div>
        {gameId === 'sedma' && <label className="sedma-variant"><input type="checkbox" checked={bonus === 10} onChange={(e) => setBonus(e.target.checked ? 10 : 0)} /> Poslední štych +10 bodů (výchozí)</label>}
        <form onSubmit={onCreate}>
          <div className="brand-welcome"><BrandMascot state={busy ? 'thinking' : 'idle'} size={56} /><span className="brand-welcome-copy"><strong>Celý stůl v jednom BALÍKu.</strong>Rozdej přátelům dobrý večer.</span></div>
          <label className="label" htmlFor="name">
            Tvoje jméno
          </label>
          <input
            id="name"
            className="field"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
            enterKeyHint="go"
          />
          <button className="btn btn-primary wide" type="submit" disabled={!name.trim() || busy}>
            {busy ? 'Připojuji…' : 'Vytvořit hru s přáteli'}
          </button>
        </form>

        <div className="solo">
          <div className="solo-row">
            <span className="solo-label">Soupeři</span>
            <div className="segmented" role="radiogroup" aria-label="Počet počítačových soupeřů">
              {(gameId === 'sedma' ? [1, 3] : [1, 2, 3]).map((n) => (
                <button key={n} type="button" role="radio" aria-checked={bots === n} className={bots === n ? 'is-on' : ''} onClick={() => setBots(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-secondary wide" type="button" disabled={!name.trim() || busy} onClick={() => createRoom(name.trim(), bots, gameId, bonus)}>
            Hrát proti počítači
          </button>
        </div>

        {joining ? (
          <form className="join-row" onSubmit={onJoin}>
            <input
              className="field code-field"
              placeholder="KÓD"
              value={code}
              maxLength={ROOM_CODE_LENGTH}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              enterKeyHint="go"
              aria-label="Kód místnosti"
            />
            <button className="btn btn-secondary" type="submit" disabled={code.length !== ROOM_CODE_LENGTH}>
              Připojit
            </button>
          </form>
        ) : (
          <button className="btn btn-ghost wide" onClick={() => setJoining(true)}>
            Připojit se kódem
          </button>
        )}
      </motion.div>
      <p className="home-foot">Máš odkaz od kamaráda? Stačí ho otevřít.</p>
      <a className="btn btn-ghost" href="/dev/deck-stormpunk">Prohlédnout balíček Stormpunk ↗</a>
      <a className="btn btn-ghost" href="/decks/retro-arcade">Prohlédnout balíček Retro Arcade ↗</a>
      {import.meta.env.DEV && <a className="btn btn-ghost" href="/dev/avatars">Postavy · avatar playground ↗</a>}
      {import.meta.env.DEV && <a className="btn btn-ghost" href="/dev/brand">BLIK · brand & game feel lab ↗</a>}
    </main>
  );
}
