import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { GAME_INFO, LEARN_LABEL, MAX_NAME_LENGTH, ROOM_CODE_LENGTH, type GameId } from '@balik/shared';
import { RulesButton } from '../rules/RulesPanel';
import { getName } from '../lib/identity';
import { createRoom } from '../net/client';
import { navigate, useApp } from '../net/store';
import './screens.css';
import '../sedma/sedma.css';
import { BrandMascot } from '../brand/BrandMascot';
import { AppSettings } from '../themes/AppearancePicker';
import { GameLibrary, SeatFilter, defaultBots, fitsSeats } from '../library/GameLibrary';
import { GameMotif } from '../library/GameMotif';
import { ShowroomTeaser } from '../themes/Showroom';

const LAST_GAME = 'balik.lastGame';
const lastGame = (): GameId => {
  try {
    const id = localStorage.getItem(LAST_GAME);
    return id && Object.hasOwn(GAME_INFO, id) ? (id as GameId) : 'prsi';
  } catch {
    return 'prsi';
  }
};

/** Choose a game → play solo or invite → appearance only if you want to. */
export function Home() {
  const [name, setName] = useState(getName);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [gameId, setGameId] = useState<GameId>(lastGame);
  const [seats, setSeats] = useState<number | null>(null);
  const [bots, setBots] = useState(() => defaultBots(lastGame(), null));
  const [bonus, setBonus] = useState<0 | 10>(10);
  const status = useApp((s) => s.status);
  const reduced = useReducedMotion() ?? false;
  const busy = status === 'connecting';
  const info = GAME_INFO[gameId];
  const fits = fitsSeats(gameId, seats);
  const player = name.trim();
  const detail = useRef<HTMLElement>(null);
  const [detailInView, setDetailInView] = useState(false);
  useEffect(() => {
    const el = detail.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setDetailInView(!!entry?.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const select = (id: GameId) => {
    setGameId(id);
    setBots((b) => defaultBots(id, seats, b));
    try { localStorage.setItem(LAST_GAME, id); } catch { /* only a convenience */ }
  };
  const filter = (n: number | null) => {
    setSeats(n);
    setBots((b) => defaultBots(gameId, n, b));
  };
  const solo = () => { if (player && !busy) createRoom(player, bots, gameId, bonus); };
  const friends = (e?: FormEvent) => {
    e?.preventDefault();
    if (player && !busy) createRoom(player, 0, gameId, bonus);
  };
  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length === ROOM_CODE_LENGTH) navigate(`/r/${c}`);
  };

  return (
    <main className="home2">
      <header className="home-bar">
        <span className="brand-word home-mark">BALÍK</span>
        <button type="button" className={`home-code-open${joining ? ' is-on' : ''}`} aria-expanded={joining} onClick={() => setJoining((v) => !v)}>
          Mám kód
        </button>
        <AppSettings compact />
      </header>
      <AnimatePresence initial={false}>
        {joining && (
          <motion.form className="home-join" onSubmit={onJoin} initial={reduced ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <label className="home-join-label" htmlFor="room-code">Kód od kamaráda</label>
            <input id="room-code" className="field code-field" placeholder="KÓD" value={code} maxLength={ROOM_CODE_LENGTH}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} autoFocus autoCapitalize="characters" autoComplete="off" enterKeyHint="go" />
            <button className="btn btn-secondary" type="submit" disabled={code.length !== ROOM_CODE_LENGTH}>Připojit</button>
          </motion.form>
        )}
      </AnimatePresence>

      <section className="home-intro">
        <BrandMascot state={busy ? 'thinking' : 'deal'} size={58} reduced={reduced} />
        <div>
          <h1 className="brand-word home-headline">Co rozdáme?</h1>
          <p className="home-lede">Devět karetních her pro partu i pro jednoho. Pošli odkaz, nebo hraj hned proti počítači. Bez registrace.</p>
        </div>
      </section>

      <div className="home-stage">
        <section className="home-library" aria-label="Knihovna her">
          <SeatFilter seats={seats} onChange={filter} />
          <GameLibrary selected={gameId} onSelect={select} seats={seats} reduced={reduced} />
        </section>

        <aside ref={detail} className={`game-detail motif-host is-on is-${gameId}`} aria-live="polite" aria-labelledby="game-detail-name">
          <div className="game-detail-art" aria-hidden>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={gameId} initial={reduced ? false : { opacity: 0, y: 14, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
                <GameMotif id={gameId} />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="game-detail-body">
            <p className="game-detail-kicker type-machine">{info.family} · {info.playersLabel}</p>
            <h2 id="game-detail-name" className="game-detail-name">{info.name}</h2>
            <p className="game-detail-pitch">{info.pitch}</p>
            <div className="game-detail-facts">
              <span className={`learn-meter is-${info.learn}`} title="Kolik rozhodnutí hra během tahu chce">
                <i /><i /><i /> {LEARN_LABEL[info.learn]}
              </span>
              <RulesButton gameId={gameId} />
            </div>
            {!fits && <p className="game-detail-warn" role="note">{info.needPlayers} Proti počítači doplníme správný počet.</p>}
            {gameId === 'sedma' && (
              <label className="sedma-variant"><input type="checkbox" checked={bonus === 10} onChange={(e) => setBonus(e.target.checked ? 10 : 0)} /> Poslední štych +10 bodů (výchozí)</label>
            )}
            <label className="home-name">
              <span>Hraješ jako</span>
              <input className="field" value={name} maxLength={MAX_NAME_LENGTH} onChange={(e) => setName(e.target.value)} autoComplete="nickname" enterKeyHint="done" aria-label="Tvoje jméno" />
            </label>
            <div className="game-detail-cta">
              <div className="game-detail-solo">
                <div className="segmented" role="radiogroup" aria-label="Počet počítačových soupeřů">
                  {info.botCounts.map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={bots === n} className={bots === n ? 'is-on' : ''} onClick={() => setBots(n)}
                      aria-label={`${n} ${n === 1 ? 'soupeř' : 'soupeři'}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary" type="button" disabled={!player || busy} onClick={solo}>
                  {busy ? 'Rozdávám…' : 'Proti počítači'}
                </button>
              </div>
              <button className="btn btn-secondary" type="button" disabled={!player || busy} onClick={() => friends()}>
                Hrát s přáteli
              </button>
            </div>
            <p className="game-detail-fine">
              {bots === 1 ? '1 soupeř' : `${bots} soupeři`} za počítač · s přáteli dostaneš odkaz a kód.
            </p>
          </div>
        </aside>
      </div>

      {/* Phones: the decision stays under the thumb until the full detail scrolls into view. */}
      <div className={`home-dock${detailInView ? ' is-hidden' : ''}`} aria-hidden={detailInView || undefined}>
        <span className="home-dock-art" aria-hidden><GameMotif id={gameId} /></span>
        <b className="home-dock-name">{info.name}</b>
        <button className="btn btn-primary" type="button" disabled={!player || busy} onClick={solo} tabIndex={detailInView ? -1 : 0}>Proti počítači</button>
        <button className="btn btn-secondary" type="button" disabled={!player || busy} onClick={() => friends()} tabIndex={detailInView ? -1 : 0}>S přáteli</button>
      </div>

      <ShowroomTeaser />
      {import.meta.env.DEV && (
        <nav className="home-dev">
          <a className="btn btn-ghost" href="/dev/avatars">Postavy · avatar playground ↗</a>
          <a className="btn btn-ghost" href="/dev/brand">BLIK · brand & game feel lab ↗</a>
        </nav>
      )}
    </main>
  );
}
