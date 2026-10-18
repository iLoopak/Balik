import { useColorMode } from '../themes/colorMode';
import { AppearancePicker } from '../themes/AppearancePicker';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { RANKS, SUITS, type Suit } from '@balik/shared';
import { CardView } from '../cards/Card';
import { SuitIcon } from '../cards/SuitIcon';
import { DECK_THEMES, EDITIONS } from '../themes/registry';
import { setAppearance } from '../themes/preferences';
import { editionHref, GALLERY_EDITIONS, type EditionCard, type GalleryDeckId } from './editions';
import './gallery.css';

/** Public collection uses the same CardView and assets as the table. */
export default function EditionGallery({ deck }: { deck: GalleryDeckId }) {
  const theme = DECK_THEMES[deck];
  const edition = GALLERY_EDITIONS[deck];
  const cards = RANKS.flatMap((rank) =>
    SUITS.map((suit) => edition.cards.find((e) => e.card.suit === suit && e.card.rank === rank)!),
  );
  const hero = SUITS.map((suit) => cards.find((e) => e.card.suit === suit && e.card.rank === (edition.heroRank ?? 'J'))!);
  const playHref = `/?deck=${deck}${edition.table ? `&table=${edition.table}` : ''}`;
  const selectEdition = () => setAppearance({ deck, table: edition.table });
  const rankIndex = (e: EditionCard) => theme.ranks?.[e.card.rank]?.index ?? e.card.rank;
  const mode = useColorMode(p => p.mode);
  const [suit, setSuit] = useState<Suit | 'all'>('all');
  const [small, setSmall] = useState(false);
  const [lightPreview, setLightPreview] = useState<{ base: typeof mode; light: boolean } | null>(null);
  const light = lightPreview?.base === mode ? lightPreview.light : mode === 'light';
  useEffect(() => setLightPreview(null), [mode]);
  const toggleLight = () => setLightPreview({ base: mode, light: !light });
  const [back, setBack] = useState(false);
  const [demo, setDemo] = useState(0);
  const [selected, setSelected] = useState<EditionCard | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const visible = cards.filter((e) => suit === 'all' || e.card.suit === suit);
  useEffect(() => {
    document.title = `${theme.name} — sbírka karet · BALÍK`;
    return () => {
      document.title = 'BALÍK';
    };
  }, [theme.name]);
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
        <AppearancePicker compact /><span className="gallery-nav-label">Další svět v jednom balíku.</span>
        <a className="gallery-play" href={playHref} onClick={selectEdition}>
          Hrát s touto edicí ↗
        </a>
      </header>
      <section className="gallery-hero" aria-labelledby="gallery-title">
        <div className="gallery-hero-copy">
          <p className="gallery-eyebrow">
            <span /> ORIGINÁLNÍ EDICE {edition.number}
          </p>
          <h1 id="gallery-title">
            {edition.title[0]}
            <br />
            <span>{edition.title[1]}</span>
          </h1>
          <p className="gallery-intro">
            {edition.intro[0]}
            <br />
            {edition.intro[1]}
          </p>
          <div className="gallery-hero-bottom">
            <a href="#collection" className="gallery-explore">
              Prohlédnout balíček ↘
            </a>
            <span className="gallery-edition">
              {theme.name.toUpperCase()}
              <br />
              <b>32 KARET / 4 {edition.suitsLabel}</b>
            </span>
          </div>
        </div>
        <div className="gallery-hero-art" aria-hidden="true">
          <div className="gallery-orbit" />
          {hero.map((e, i) => (
            <div className={`gallery-hero-card hero-card-${i}`} key={e.card.id}>
              <CardView card={e.card} faceUp deck={deck} />
            </div>
          ))}
          <span className="gallery-art-note">
            {edition.artNote[0]}
            <br />
            {edition.artNote[1]}
          </span>
        </div>
      </section>
      <section id="collection" className="gallery-collection" aria-labelledby="collection-title">
        <div className="gallery-section-head">
          <div>
            <p className="gallery-eyebrow">SBÍRKA / {theme.name.toUpperCase()}</p>
            <h2 id="collection-title">
              {edition.collectionTitle}<span>.</span>
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
                <SuitIcon suit={s} deck={deck} />
                {theme.suits[s].name}
              </button>
            ))}
          </div>
          <div className="gallery-view-controls" role="group" aria-label="Nastavení náhledu">
            <button aria-pressed={small} onClick={() => setSmall((v) => !v)}>
              Malé karty
            </button>
            <button aria-pressed={light} onClick={toggleLight}>
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
              aria-label={`${rankIndex(e)} · ${theme.suits[e.card.suit].name} · ${e.name}`}
            >
              <div key={demo} className={`gallery-card-frame${demo ? ' sticker-demo-active' : ''}`}>
                <CardView card={e.card} faceUp={!back} deck={deck} />
              </div>
              <div className="gallery-card-caption">
                <span className="gallery-card-number">{rankIndex(e)}</span>
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
          <span>Stejné karty jako ve hře.</span>
          <span>
            {edition.number} — {theme.name.toUpperCase()}
          </span>
        </div>
      </section>
      <footer className="gallery-footer">
        <a href="/" className="gallery-brand">
          BALÍK
          <span className="gallery-brand-dot" />
        </a>
        {EDITIONS.filter((t) => t.id !== deck).map((t) => (
          <a key={t.id} href={editionHref(t.id)!}>
            Prohlédnout {t.name} ↗
          </a>
        ))}
        <a href={playHref} onClick={selectEdition}>
          Hrát s touto edicí ↗
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
                <CardView card={selected.card} faceUp={!back} deck={deck} />
              </div>
            </div>
            <div className="gallery-detail-copy">
              <p className="gallery-eyebrow">
                {theme.suits[selected.card.suit].name} / {rankIndex(selected)} / {selected.archetype}
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
