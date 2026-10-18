import { useState } from 'react';
import type { Card } from '@balik/shared';
import { CardView } from '../cards/Card';
import type { DeckId } from '../themes/registry';
import manifest from '../decks/art-backs/manifest.json';
import './artProofs.css';
import './artBackProofs.css';

interface BackProof { deck:DeckId; name:string; direction:string; asset:string; bytes:number }
const entries = manifest as readonly BackProof[];
const descriptions: Record<string,string> = {
  biopunk:'Trnový živý zámek: lesklé listové krunýře, jantarové jádro, kořeny a tmavá keramika. Fialové houby a tyrkysové membrány propojují čtyři biologické světy.',
  'panelak-3000':'Noční domovní reliéf: oblé fasády, svítící balkony, smaltované potrubí a skutečně tkané prádlo. Plastika a teplé světlo odpovídají sběratelským figurkám na lících.',
  chalupa:'Letní věnec ze slunečnic, hřibů, vln a provazu s červenou konvicí. Výrazná komiksová kresba, teplé odlesky a lesní zelená propojují zahradu, les, vodu i výpravy.',
  'papirovy-cirkus':'Malé papírové divadlo: přeložený prapor, vrstvené masky, lví hříva a loutkářský kříž. Vlákna, tloušťka řezů a kontaktní stíny drží stejný fyzický svět jako ilustrace.',
  stormpunk:'Srdce živého města spojuje čtyři frakce v průmyslovém dynamu. Výheň, zlatá dopravní křídla, zelený podrost a modré výboje drží komiksový materiálový jazyk původního decku.',
};
const representatives: Record<string,Card> = {
  biopunk:{id:'hearts-K',suit:'hearts',rank:'K'},
  'panelak-3000':{id:'hearts-Q',suit:'hearts',rank:'Q'},
  chalupa:{id:'hearts-J',suit:'hearts',rank:'J'},
  'papirovy-cirkus':{id:'spades-Q',suit:'spades',rank:'Q'},
  stormpunk:{id:'spades-Q',suit:'spades',rank:'Q'},
};

/** Released backs through the real renderer, with archived SVGs for comparison. */
export default function ArtBackProofs(){
  const [light,setLight] = useState(false);
  return <main className={`art-proofs back-proofs${light?' art-proofs-light':''}`}>
    <header><a href="/">BALÍK ↗</a><a href="/dev/art-poc">Historie ilustrací ↗</a><a href="/dev/decks">Deck Lab ↗</a><span>IMAGEGEN / 5 RUBŮ</span></header>
    <h1>Pět světů.<br/>Pět nových rubů.</h1>
    <p className="art-proof-intro">Aktivní rastrové ruby vedle skutečných líců a archivovaných SVG. Společný výrazný nápis BALÍK, vlastní materiály a kompozice každé edice. Stejné ruby se zobrazují ve hrách, veřejných galeriích i výběru vzhledu.</p>
    <nav aria-label="Ruby edic">{entries.map(entry=><a key={entry.deck} href={`#${entry.deck}`}>{entry.name}</a>)}</nav>
    <div className="art-proof-controls"><button aria-pressed={light} onClick={()=>setLight(v=>!v)}>Světlý podklad</button></div>
    <div className="art-proof-grid">{entries.map(entry=><section className="art-proof back-proof" key={entry.deck} id={entry.deck}>
      <p className="art-proof-eyebrow">{entry.name} / AKTIVNÍ RUB</p><h2>{entry.direction}</h2>
      <div className="back-proof-comparison">
        <figure><figcaption>Současný líc</figcaption><div className="back-proof-card"><CardView card={representatives[entry.deck]!} faceUp deck={entry.deck} flipTransition={{duration:0}}/></div></figure>
        <figure><figcaption>Ve hře · imagegen</figcaption><div className="back-proof-card"><CardView card={null} faceUp={false} deck={entry.deck} flipTransition={{duration:0}}/></div></figure>
        <figure><figcaption>Archivovaný SVG rub</figcaption><img className="back-proof-art" src={`/decks/${entry.deck}/back.svg`} width="200" height="280" alt={`${entry.name}, původní SVG rub`}/></figure>
      </div>
      <div className="art-proof-thumbs"><span>Rub / 76 px</span><img className="back-proof-art back-proof-mini" src={entry.asset} width="76" height="106" alt={`${entry.name}, rub v malé velikosti`}/><span>WebP · 640 × 896 · {Math.round(entry.bytes/1024)} KiB</span></div>
      <p>{descriptions[entry.deck]}</p>
      <a href={entry.asset} target="_blank" rel="noreferrer">Otevřít aktivní rub v plné velikosti ↗</a>
    </section>)}</div>
    <footer>Built-in image_gen · pět samostatně generovaných rubů · prompty, zdroje a exportní parametry: docs/visual/premium-backs/ · WebP bez dodatečné kresby či skládání textu.</footer>
  </main>;
}
