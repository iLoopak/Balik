import { useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { RANKS, SUITS, type Card, type GameId } from '@balik/shared';
import { CardView } from '../cards/Card';
import { GameTableTheme } from '../table/GameTableTheme';
import { computeGeometry } from '../table/layout';
import { DECK_THEMES, EDITIONS, TABLE_THEMES, type DeckId, type TableId } from '../themes/registry';
import { preloadDeck, useAppearance } from '../themes/preferences';
import { BrandMascot } from '../brand/BrandMascot';
import { EmoteBubble } from '../brand/Emotes';
import { EffectOrchestrator } from '../effects/EffectOrchestrator';
import './deckLab.css';
const CARDS: Card[] = RANKS.flatMap(rank => SUITS.map(suit => ({ id: `${suit}-${rank}`, suit, rank })));
/** Development-only, no game transport. Stable keys make theme changes inspectable. */
export default function DeckLab() {
  const initial = useAppearance.getState();
  const [deck, setDeck] = useState<DeckId>(initial.deck);
  const [table, setTable] = useState<TableId>(initial.table);
  const [small, setSmall] = useState(false), [light, setLight] = useState(false), [back, setBack] = useState(false);
  const [reduced, setReduced] = useState(false), [mobile, setMobile] = useState(false);
  const [demo, setDemo] = useState(0), [playing, setPlaying] = useState(false), [game, setGame] = useState<GameId>('prsi');
  useEffect(() => preloadDeck(deck), [deck]);
  useEffect(() => { if (!playing) return; const id = setTimeout(() => setPlaying(false), 850); return () => clearTimeout(id); }, [playing, demo]);
  const width = mobile ? 360 : 960, height = 580;
  const geo = computeGeometry(width, height, ['me','ada'], 'me', 4);
  const sample = CARDS.find(c => c.suit === 'hearts' && c.rank === 'J')!;
  const art = DECK_THEMES[deck].stickerFor(sample);
  return <MotionConfig reducedMotion={reduced ? 'always' : 'user'}><main className={`deck-lab${light ? ' lab-light' : ''}${reduced ? ' lab-reduced' : ''}`}>
    <header><a href="/" className="brand-word">BALÍK / DECK LAB</a><BrandMascot state="idle" size={48} reduced={reduced}/></header>
    <h1>Dva světy. Stejné karty.</h1><p>32 identit po hodnotách. Lokální náhled; bez připojení do místnosti.</p>
    <div className="lab-controls"><label>Edice <select value={deck} onChange={e => setDeck(e.target.value as DeckId)}>{Object.values(DECK_THEMES).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label>Stůl <select value={table} onChange={e => setTable(e.target.value as TableId)}>{Object.values(TABLE_THEMES).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label>Hra <select value={game} onChange={e=>setGame(e.target.value as GameId)}><option value="prsi">Prší</option><option value="sedma">Sedma</option><option value="lhar">Lhář</option></select></label>
      {([['Malé karty',small,setSmall],['Světlá deska',light,setLight],['Rub',back,setBack],['Mobilní stůl',mobile,setMobile],['Omezit pohyb',reduced,setReduced]] as const).map(([label,on,set]) => <label key={label}><input type="checkbox" checked={on} onChange={e=>set(e.target.checked)}/>{label}</label>)}
      <button disabled={playing} onClick={()=>{setDemo(n=>n+1);setPlaying(true);}}>Přehrát sticker</button>
    </div>
    <section className={`lab-grid${small ? ' lab-small' : ''}${playing ? ' lab-playing' : ''}`} aria-label="32 karet po hodnotách">{CARDS.map(card => <figure key={card.id} tabIndex={0}><div className="lab-card"><CardView card={card} faceUp={!back} deck={deck} game={game} flipTransition={reduced ? {duration:0} : undefined}/></div><figcaption>{card.id}</figcaption></figure>)}</section>
    <h2>Stejná identita, skutečný CardView</h2><div className="lab-comparison">{EDITIONS.map(theme=><figure key={theme.id}><div className="lab-card"><CardView card={sample} faceUp deck={theme.id} game={game} fx={{current:true}}/></div><figcaption>{theme.name} · hearts-J</figcaption></figure>)}{art && <figure><img className="lab-isolated-sticker" src={art.src} alt="Samostatná ilustrace bez indexů"/><figcaption>Samostatná vrstva</figcaption></figure>}</div>
    <h2>Stůl · {mobile?'360':'960'} px</h2><div className="lab-table-scroll"><div className="lab-table" style={{width,height}}>
      <GameTableTheme geo={geo} suit="hearts" reduced={reduced} lite={false} myTurn theme={table}/>
      <div className="lab-table-card" style={{left:geo.discard.x,top:geo.discard.y,width:geo.pileW,height:geo.pileH}}><CardView card={sample} faceUp deck={deck} game={game} fx={{current:true}}/></div>
      <div className="lab-table-card" style={{left:geo.deck.x,top:geo.deck.y,width:geo.deckW,height:geo.deckH}}><CardView card={null} faceUp={false} deck={deck}/></div>
      {CARDS.slice(0,4).map((c,i)=><div className="lab-table-card" key={c.id} style={{left:width/2+(i-1.5)*geo.cardW*.8,top:geo.handY,width:geo.cardW,height:geo.cardH}}><CardView card={c} faceUp deck={deck} game={game}/></div>)}
      <div className="lab-emote"><EmoteBubble author="Ada" message={{t:'emote',id:'lab',code:'DEMO',playerId:'ada',emote:'nice',at:0,expiresAt:Infinity}}/></div>
      <EffectOrchestrator items={[]} geo={geo} me="me" reduced={reduced}/>
    </div></div>
  </main></MotionConfig>;
}
