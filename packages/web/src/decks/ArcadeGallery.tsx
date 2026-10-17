import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { RANKS, SUITS, type Suit } from '@balik/shared';
import { CardView } from '../cards/Card';
import { SuitIcon } from '../cards/SuitIcon';
import { DECK_THEMES } from '../themes/registry';
import { setAppearance } from '../themes/preferences';
import { RETRO_ARCADE_CARDS, type RetroArcadeCard } from '../themes/decks/retro-arcade/manifest';
import './gallery.css';

const theme = DECK_THEMES['retro-arcade'];
const cards = RANKS.flatMap((rank) =>
  SUITS.map((suit) => RETRO_ARCADE_CARDS.find((e) => e.card.suit === suit && e.card.rank === rank)!),
);
const hero = SUITS.map((suit) => cards.find((e) => e.card.suit === suit && e.card.rank === 'J')!);
const selectEdition = () => setAppearance({ deck: 'retro-arcade', table: 'retro-arcade' });

/** Public collection uses the same CardView and assets as the table. */
export default function ArcadeGallery() {
  const [suit, setSuit] = useState<Suit | 'all'>('all');
  const [small, setSmall] = useState(false);
  const [light, setLight] = useState(false);
  const [back, setBack] = useState(false);
  const [demo, setDemo] = useState(0);
  const [selected, setSelected] = useState<RetroArcadeCard | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const visible = cards.filter((e) => suit === 'all' || e.card.suit === suit);
  useEffect(() => {
    document.title = 'Retro Arcade — sbírka karet · BALÍK';
    return () => {
      document.title = 'BALÍK';
    };
  }, []);
  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) dialog.current.showModal();
    else if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);
  return (
    <main className={`deck-gallery${light ? ' gallery-light' : ''}`}>
      <header className="gallery-nav">
        <a className="gallery-brand" href="/">
          BALÍK
          <span className="gallery-brand-dot" />
        </a>
        <span className="gallery-nav-label">Další svět v jednom balíku.</span>
        <a className="gallery-play" href="/?deck=retro-arcade&table=retro-arcade" onClick={selectEdition}>
          Hrát s touto edicí ↗
        </a>
      </header>
      <section className="gallery-hero" aria-labelledby="gallery-title">
        <div className="gallery-hero-copy">
          <p className="gallery-eyebrow">
            <span /> ORIGINÁLNÍ EDICE 002
          </p>
          <h1 id="gallery-title">
            Ještě jednu
            <br />
            <span>partii.</span>
          </h1>
          <p className="gallery-intro">
            Retro Arcade. Čtyři barvy, třicet dva charakterů.
            <br />
            Od prvního glitchu až po posledního bosse.
          </p>
          <div className="gallery-hero-bottom">
            <a href="#collection" className="gallery-explore">
              Prohlédnout balíček ↘
            </a>
            <span className="gallery-edition">
              RETRO ARCADE
              <br />
              <b>32 KARET / 4 BARVY</b>
            </span>
          </div>
        </div>
        <div className="gallery-hero-art" aria-hidden="true">
          <div className="gallery-orbit" />
          {hero.map((e, i) => (
            <div className={`gallery-hero-card hero-card-${i}`} key={e.card.id}>
              <CardView card={e.card} faceUp deck="retro-arcade" />
            </div>
          ))}
          <span className="gallery-art-note">
            MALÝ STICKER.
            <br />
            VELKÝ CHARAKTER.
          </span>
        </div>
      </section>
      <section id="collection" className="gallery-collection" aria-labelledby="collection-title">
        <div className="gallery-section-head">
          <div>
            <p className="gallery-eyebrow">SBÍRKA / RETRO ARCADE</p>
            <h2 id="collection-title">
              Celá herna v ruce<span>.</span>
            </h2>
          </div>
          <span className="gallery-count" role="status">
            {visible.length} / 32 karet
          </span>
        </div>
        <div className="gallery-toolbar">
          <div className="gallery-filters" role="group" aria-label="Filtrovat podle barvy">
            <button aria-pressed={suit === 'all'} onClick={() => setSuit('all')}>
              Všechny <span>32</span>
            </button>
            {SUITS.map((s) => (
              <button
                key={s}
                style={{ '--faction': theme.suits[s].color } as CSSProperties}
                aria-pressed={suit === s}
                onClick={() => setSuit(s)}
              >
                <SuitIcon suit={s} deck="retro-arcade" />
                {theme.suits[s].name}
              </button>
            ))}
          </div>
          <div className="gallery-view-controls" role="group" aria-label="Nastavení náhledu">
            <button aria-pressed={small} onClick={() => setSmall((v) => !v)}>
              Malé karty
            </button>
            <button aria-pressed={light} onClick={() => setLight((v) => !v)}>
              {light ? 'Tmavý stůl' : 'Světlý stůl'}
            </button>
            <button aria-pressed={back} onClick={() => setBack((v) => !v)}>
              {back ? 'Líc' : 'Rub'}
            </button>
          </div>
        </div>
        <div className="gallery-table-label">
          <span>
            <i /> {light ? 'SVĚTLÝ' : 'TMAVÝ'} HERNÍ STŮL
          </span>
          <button onClick={() => setDemo((n) => n + 1)}>Rozhýbat stickery ↗</button>
        </div>
        <div className={`gallery-grid${small ? ' gallery-grid-small' : ''}`}>
          {visible.map((e) => (
            <button
              className="gallery-card-item"
              key={e.card.id}
              onClick={() => setSelected(e)}
              aria-label={`${e.card.rank} · ${theme.suits[e.card.suit].name} · ${e.name}`}
            >
              <div key={demo} className={`gallery-card-frame${demo ? ' sticker-demo-active' : ''}`}>
                <CardView card={e.card} faceUp={!back} deck="retro-arcade" />
              </div>
              <div className="gallery-card-caption">
                <span className="gallery-card-number">{e.card.rank}</span>
                <span>
                  <b>{e.name}</b>
                  <small>{e.archetype}</small>
                </span>
                <span className="gallery-card-open" aria-hidden>
                  ↗
                </span>
              </div>
            </button>
          ))}
        </div>
        <div className="gallery-collection-foot">
          <span>Stejné karty jako ve hře. Edice funguje v Prší, Sedmě i Lháři.</span>
          <span>002 — RETRO ARCADE</span>
        </div>
      </section>
      <footer className="gallery-footer">
        <a href="/" className="gallery-brand">
          BALÍK
          <span className="gallery-brand-dot" />
        </a>
        <a href="/dev/deck-stormpunk">Prohlédnout Stormpunk ↗</a>
        <a href="/?deck=retro-arcade&table=retro-arcade" onClick={selectEdition}>
          Hrát s Retro Arcade ↗
        </a>
      </footer>
      <dialog
        className={`gallery-dialog${light ? ' gallery-dialog-light' : ''}`}
        ref={dialog}
        onCancel={() => setSelected(null)}
        onClose={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setSelected(null);
        }}
        aria-labelledby="card-detail-title"
      >
        {selected && (
          <div className="gallery-detail">
            <button
              className="gallery-detail-close"
              autoFocus
              onClick={() => setSelected(null)}
              aria-label="Zavřít detail"
            >
              ×
            </button>
            <div className="gallery-detail-stage">
              <div key={demo} className={`gallery-detail-card${demo ? ' sticker-demo-active' : ''}`}>
                <CardView card={selected.card} faceUp={!back} deck="retro-arcade" />
              </div>
            </div>
            <div className="gallery-detail-copy">
              <p className="gallery-eyebrow">
                {theme.suits[selected.card.suit].name} / {selected.card.rank} / {selected.archetype}
              </p>
              <h2 id="card-detail-title">{selected.name}</h2>
              <p>{selected.meaning}</p>
              <button className="gallery-detail-animate" onClick={() => setDemo((n) => n + 1)}>
                Rozhýbat sticker ↗
              </button>
              <div className="gallery-detail-nav">
                <button
                  aria-label="Předchozí karta"
                  onClick={() =>
                    setSelected(visible[(visible.indexOf(selected) - 1 + visible.length) % visible.length]!)
                  }
                >
                  ←
                </button>
                <span>
                  {visible.indexOf(selected) + 1} / {visible.length}
                </span>
                <button
                  aria-label="Další karta"
                  onClick={() => setSelected(visible[(visible.indexOf(selected) + 1) % visible.length]!)}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
