import { useState } from 'react';
import type { Card } from '@balik/shared';
import { CardView } from '../cards/Card';
import { DECK_THEMES, type DeckId } from '../themes/registry';
import manifest from '../decks/art-poc/manifest.json';
import './artProofs.css';

interface ProofEntry { id:string; deck:DeckId; card:Card; name:string; stickerAsset:string; previousStickerAsset?:string; version:string; styleStatus:string }
const proofs=manifest as readonly ProofEntry[];
const seriesDecks=['panelak-3000','chalupa','papirovy-cirkus'] as const;
const bioComplete=DECK_THEMES.biopunk.artStatus!=='study';

const notes: Record<string,{medium:string;improved:string;review:string}> = {
  biopunk:{medium:'Biomechanical comic / v2',improved:'Větší hlava a jasné oko, několik velkých zubů, silnější kořenové svazky a čtyři široké hrudní pláty. Omezena jemná vegetace a povrchový šum; zachovány materiály, objem a asymetrie.',review:'V2 je návrh zjednodušení k posouzení. Porovnej hlavně čitelnost hlavy a hrudníku v 64 px; silueta i hlavní biomechanické motivy mají zůstat stejně výrazné.'},
  'panelak-3000':{medium:'Collectible vinyl toy',improved:'Vlastní široké proporce, přísný výraz, mosazné klíče, textilní pantofle a modelovaný smalt.',review:'Ověřit, zda se liftová dvířka a třetí paže neztrácejí. Pro další postavy nepřebírat tuto stejnou siluetu robota.'},
  chalupa:{medium:'Letní situační komiks',improved:'Výraz, gestikulace, pohyb a konkrétní příhoda s kolečkem. Materiály mají opotřebení a vlastní stíny.',review:'Při 64 px ustupují sazenice do jedné masy. Pro sérii omezit množství listů a nechat hlavní tvář i gesto ještě větší.'},
  'papirovy-cirkus':{medium:'Fyzický vrstvený papercut',improved:'Viditelná tloušťka, vlákna papíru, kontaktní stíny, přeložená maska a odvážná loutková póza.',review:'Jemné schody a malá tvář jsou při 64 px křehké. V celé sérii udržet méně větších vrstev a podobnou tloušťku řezu.'},
};

/** Review history and BIO revision; uses the same concealed-card boundary as all galleries. */
export default function ArtProofs(){
 const [light,setLight]=useState(false),[back,setBack]=useState(false);
 return <main className={`art-proofs${light?' art-proofs-light':''}`}>
  <header><a href="/">BALÍK ↗</a><a href="/dev/decks">Deck Lab ↗</a><a href="/dev/art-backs">Ruby edic ↗</a><span>ART RESET / 4 POC</span></header>
  <h1>Čtyři světy.<br/>Nový výtvarný standard.</h1>
  <p className="art-proof-intro">BIO porovnává původní raster v1 a zjednodušenou v2. U ostatních edic zůstávají původní SVG studie vedle rastrového konceptu pro srovnání. Stejný CardView, stejné indexy a oddělený sticker. {bioComplete?'Všechny čtyři edice nyní používají kompletní rastrové sady: 128 samostatných ilustrací. Tato stránka zachovává historii výtvarného resetu.':seriesDecks.every(id=>DECK_THEMES[id].artStatus!=='study')?'Tři dokončené sady obsahují 96 rastrových ilustrací. Dokončení celé BIO série podle zjednodušené v2 právě probíhá.':'Kompletní rastrové sady se připravují.'}</p>
  <nav aria-label="Galerie edic">{(['biopunk',...seriesDecks] as const).map(id=><a key={id} href={`/decks/${id}`}>{DECK_THEMES[id].name} ↗ </a>)}</nav>
  <div className="art-proof-controls"><button aria-pressed={light} onClick={()=>setLight(v=>!v)}>Světlý podklad</button><button aria-pressed={back} onClick={()=>setBack(v=>!v)}>Rub · ověřit izolaci</button></div>
  <div className="art-proof-grid">{proofs.map(entry=>{
   const deck=entry.deck,card=entry.card,note=notes[deck]!;
   return <section className="art-proof" key={entry.id}>
    <p className="art-proof-eyebrow">{DECK_THEMES[deck].name} / {card.rank} / {note.medium}</p><h2>{entry.name}</h2>
    <p className="art-proof-status">{entry.deck==='biopunk'&&bioComplete?'BIO v2 · základ dokončené edice':entry.styleStatus==='style-approved'?'Výtvarný směr schválený':'BIO v2 · návrh zjednodušení'}</p>
    <div className="art-proof-comparison">
     <figure><figcaption>{entry.previousStickerAsset?'BIO v1 · původní detail':'Původní SVG studie'}</figcaption><div className="art-proof-card"><CardView card={card} faceUp={!back} deck={deck} stickerOverride={{src:entry.previousStickerAsset??`/decks/${deck}/stickers/${card.id.toLowerCase()}.svg`}} flipTransition={{duration:0}}/></div></figure>
     <figure><figcaption>{entry.previousStickerAsset?'BIO v2 · čitelnější plochy':'Rastrový koncept · schválený směr'}</figcaption><div className="art-proof-card"><CardView card={card} faceUp={!back} deck={deck} stickerOverride={{src:entry.stickerAsset}} flipTransition={{duration:0}}/></div></figure>
    </div>
    <div className="art-proof-thumbs">{entry.previousStickerAsset&&<><span>V1 / 64 px</span><img src={entry.previousStickerAsset} width="64" height="64" alt="BIO v1 v 64 px"/></>}<span>{entry.previousStickerAsset?'V2 / 64 px':'Sticker 64 px'}</span><img src={entry.stickerAsset} width="64" height="64" alt={`${entry.name} ${entry.version} v 64 px`} loading="lazy"/><span>Karta 76 px</span><div className="art-proof-mini"><CardView card={card} faceUp={!back} deck={deck} stickerOverride={{src:entry.stickerAsset}} flipTransition={{duration:0}}/></div></div>
    <p>{note.improved}</p><p className="art-proof-review"><b>K dalšímu posouzení:</b> {note.review}</p>
    <a href={entry.stickerAsset} target="_blank" rel="noreferrer">Transparentní WebP ↗</a>
   </section>;
  })}</div>
  <footer>Built-in image_gen · historie čtyř konceptů a BIO revize v2 · prompty a zdroje v docs/visual/premium-poc/ · dokončené rastrové série v docs/visual/premium-series/.</footer>
 </main>;
}
