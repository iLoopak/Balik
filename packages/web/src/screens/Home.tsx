import { motion, useReducedMotion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH, type Card } from '@balik/shared';
import { CardView } from '../cards/Card';
import { getName } from '../lib/identity';
import { createRoom } from '../net/client';
import { navigate, useApp } from '../net/store';
import './screens.css';

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
  const status = useApp((s) => s.status);
  const reduced = useReducedMotion();
  const busy = status === 'connecting';

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    createRoom(name.trim());
  };
  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length === ROOM_CODE_LENGTH) navigate(`/r/${c}`);
  };

  return (
    <main className="screen home">
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
          <span className="game-dot" /> Prší · 2–4 hráči
        </div>
        <form onSubmit={onCreate}>
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
              {[1, 2, 3].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={bots === n} className={bots === n ? 'is-on' : ''} onClick={() => setBots(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-secondary wide" type="button" disabled={!name.trim() || busy} onClick={() => createRoom(name.trim(), bots)}>
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
    </main>
  );
}
