import { useColorMode } from '../themes/colorMode';
import { AppearancePicker } from '../themes/AppearancePicker';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CardView } from '../cards/Card';
import type { DeckId } from '../cards/skin';
import { FactionIcon } from './stormpunk/FactionIcon';
import { STORMPUNK_CARDS, type StormpunkCard } from './stormpunk/manifest';
import { FACTIONS, FACTION_IDS, type FactionId } from './stormpunk/tokens';
import './gallery.css';

function Arrow({ back = false }: { back?: boolean }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden style={back ? { transform: 'rotate(180deg)' } : undefined}><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function DeckGallery() {
  const mode = useColorMode(p => p.mode);
  const [faction, setFaction] = useState<FactionId | 'all'>('all');
  const [small, setSmall] = useState(false);
  const [lightPreview, setLightPreview] = useState<{ base: typeof mode; light: boolean } | null>(null);
  const light = lightPreview?.base === mode ? lightPreview.light : mode === 'light';
  useEffect(() => setLightPreview(null), [mode]);
  const toggleLight = () => setLightPreview({ base: mode, light: !light });
  const [back, setBack] = useState(false);
  const [deck, setDeck] = useState<DeckId>('stormpunk');
  const [demo, setDemo] = useState(0);
  const [selected, setSelected] = useState<StormpunkCard | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const visible = STORMPUNK_CARDS.filter((entry) => faction === 'all' || entry.faction === faction);
  const heroCards = FACTION_IDS.map((f) => STORMPUNK_CARDS.find((entry) => entry.faction === f && entry.rank === 'J')!);

  useEffect(() => {
    document.title = 'Stormpunk — sbírka karet · BALÍK';
    return () => { document.title = 'BALÍK'; };
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (selected && el && !el.open) el.showModal();
    else if (!selected && el?.open) el.close();
  }, [selected]);

  const animateStickers = () => setDemo((n) => n + 1);

  return (
    <main className={`deck-gallery${light ? ' gallery-light' : ''}`}>
      <header className="gallery-nav">
        <a className="gallery-brand" href="/">BALÍK<span className="gallery-brand-dot" /></a>
        <AppearancePicker compact /><span className="gallery-nav-label">Vlastní svět. Vlastní karty.</span>
        <a className="gallery-play" href="/?deck=stormpunk">Zahrát Prší <Arrow /></a>
      </header>

      <section className="gallery-hero" aria-labelledby="gallery-title">
        <div className="gallery-hero-copy">
          <p className="gallery-eyebrow"><span /> ORIGINÁLNÍ EDICE 001</p>
          <h1 id="gallery-title">Město žije.<br /><span>Karty taky.</span></h1>
          <p className="gallery-intro">Čtyři frakce. Třicet dva příběhů. Jeden balík.<br />Vítej ve světě Stormpunk.</p>
          <div className="gallery-hero-bottom"><a href="#collection" className="gallery-explore">Prohlédnout balíček <span>↘</span></a><span className="gallery-edition">STORMPUNK<br /><b>32 KARET / 4 FRAKCE</b></span></div>
        </div>
        <div className="gallery-hero-art" aria-hidden="true">
          <div className="gallery-orbit" /><span className="gallery-spark spark-one">✳</span><span className="gallery-spark spark-two">+</span>
          {heroCards.map((entry, i) => <div className={`gallery-hero-card hero-card-${i}`} key={entry.id}><CardView card={entry.card} faceUp deck="stormpunk" /></div>)}
          <span className="gallery-art-note">MALÝ STICKER.<br />VELKÝ CHARAKTER.</span>
        </div>
      </section>

      <div className="gallery-faction-strip" aria-label="Čtyři frakce">
        {FACTION_IDS.map((id, i) => <button key={id} onClick={() => { setFaction(id); document.getElementById('collection')?.scrollIntoView({ behavior: 'instant' }); }} style={{ '--faction': FACTIONS[id].color } as CSSProperties}>
          <span className="faction-strip-icon"><FactionIcon faction={id} /></span><span><b>{FACTIONS[id].name}</b><small>{FACTIONS[id].world}</small></span><span className="faction-strip-num">0{i + 1}</span>
        </button>)}
      </div>

      <section id="collection" className="gallery-collection" aria-labelledby="collection-title">
        <div className="gallery-section-head"><div><p className="gallery-eyebrow">SBÍRKA / STORMPUNK</p><h2 id="collection-title">Celý příběh v ruce<span>.</span></h2></div><span className="gallery-count" role="status">{visible.length} / 32 karet</span></div>
        <div className="gallery-toolbar">
          <div className="gallery-filters" role="group" aria-label="Filtrovat podle frakce">
            <button aria-pressed={faction === 'all'} onClick={() => setFaction('all')}>Všechny <span>32</span></button>
            {FACTION_IDS.map((id) => <button key={id} aria-pressed={faction === id} onClick={() => setFaction(id)} style={{ '--faction': FACTIONS[id].color } as CSSProperties}><FactionIcon faction={id} />{FACTIONS[id].name}</button>)}
          </div>
          <div className="gallery-view-controls" role="group" aria-label="Nastavení náhledu">
            <button aria-pressed={small} onClick={() => setSmall((v) => !v)} title="Velikost jako v mobilní ruce"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><rect x="6" y="2" width="12" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M10 18h4" stroke="currentColor" strokeWidth="1.7" /></svg>Mobil</button>
            <button aria-pressed={light} onClick={toggleLight}>{light ? '◐ Tmavý stůl' : '◑ Světlý stůl'}</button>
            <button aria-pressed={back} onClick={() => setBack((v) => !v)}>{back ? 'Líc' : 'Rub'}</button>
            <button onClick={() => setDeck((v) => v === 'classic' ? 'stormpunk' : 'classic')} aria-pressed={deck === 'classic'}>Klasika</button>
          </div>
        </div>
        <div className="gallery-table-label"><span><i /> {light ? 'SVĚTLÝ' : 'TMAVÝ'} HERNÍ STŮL</span><button onClick={animateStickers}>Rozhýbat stickery <span aria-hidden>↗</span></button></div>
        <div key={`${small}-${deck}-${faction}`} className={`gallery-grid${small ? ' gallery-grid-small' : ''}`}>
          {visible.map((entry, i) => <button className="gallery-card-item" key={entry.id} onClick={() => setSelected(entry)} aria-label={`${entry.rank} · ${FACTIONS[entry.faction].name} · ${entry.name}`}>
            <div className={`gallery-card-frame${demo ? ' sticker-demo-active' : ''}`} key={demo}><CardView card={entry.card} faceUp={!back} deck={deck} /></div>
            <div className="gallery-card-caption"><span className="gallery-card-number">{String(i + 1).padStart(2, '0')}</span><span><b>{entry.name}</b><small>{FACTIONS[entry.faction].name} / {entry.archetype}</small></span><span className="gallery-card-open" aria-hidden>↗</span></div>
          </button>)}
        </div>
        {small && <section className="gallery-hand-section" aria-labelledby="hand-title"><div><p className="gallery-eyebrow">TEST ČITELNOSTI</p><h3 id="hand-title">Připravené do ruky.</h3><p>Hodnoty zůstávají viditelné i při překryvu karet.</p></div><div className="gallery-hand">{heroCards.map((entry) => <div className="gallery-hand-card" key={entry.id}><CardView card={entry.card} faceUp deck={deck} /></div>)}</div></section>}
        <div className="gallery-collection-foot"><span>Ilustrace mají vlastní vrstvu. Každá karta má vlastní charakter.</span><span>001 — STORMPUNK</span></div>
      </section>
      <footer className="gallery-footer"><a href="/" className="gallery-brand">BALÍK<span className="gallery-brand-dot" /></a><a href="/dev/game-feel">Vyzkoušet herní efekty <Arrow /></a><a href="/?deck=classic">Hrát s klasickými kartami <Arrow /></a></footer>

      <dialog className={`gallery-dialog${light ? ' gallery-dialog-light' : ''}`} ref={dialog} onCancel={() => setSelected(null)} onClose={() => setSelected(null)} onClick={(e) => { if (e.target === dialog.current) setSelected(null); }} aria-labelledby="card-detail-title">
        {selected && <div className="gallery-detail"><button className="gallery-detail-close" autoFocus onClick={() => setSelected(null)} aria-label="Zavřít detail">×</button><div className="gallery-detail-stage"><div className={`gallery-detail-card${demo ? ' sticker-demo-active' : ''}`} key={demo}><CardView card={selected.card} faceUp={!back} deck={deck} /></div></div><div className="gallery-detail-copy"><p className="gallery-eyebrow">{FACTIONS[selected.faction].name} / {selected.rank} / {selected.archetype}</p><h2 id="card-detail-title">{selected.name}</h2><p>{FACTIONS[selected.faction].world}</p><button className="gallery-detail-animate" onClick={animateStickers}>Rozhýbat sticker <Arrow /></button><div className="gallery-detail-nav"><button onClick={() => setSelected(visible[(visible.findIndex((e) => e.id === selected.id) - 1 + visible.length) % visible.length]!)} aria-label="Předchozí karta"><Arrow back /></button><span>{visible.findIndex((e) => e.id === selected.id) + 1} / {visible.length}</span><button onClick={() => setSelected(visible[(visible.findIndex((e) => e.id === selected.id) + 1) % visible.length]!)} aria-label="Další karta"><Arrow /></button></div></div></div>}
      </dialog>
    </main>
  );
}
