import { useState } from 'react';
import { EMOTES, EMOTE_IDS } from '@balik/shared';
import { BrandMascot, MASCOT_STATES } from '../brand/BrandMascot';
import { BrandSettings } from '../brand/BrandSettings';
import { EmoteBubble, EmotePicker } from '../brand/Emotes';
import { brandAudio } from '../brand/audio';
import { SOUND_RECIPES, type SoundKind } from '../brand/tokens';
import { GameFeelPlayground } from '../effects/GameFeelPlayground';
/** Loaded only behind import.meta.env.DEV; previews never touch the game transport. */
export default function BrandPlayground() {
  const [reduced, setReduced] = useState(false);
  const [emote, setEmote] = useState<(typeof EMOTE_IDS)[number]>('gg');
  const [ritual, setRitual] = useState(0);
  return <main className="brand-playground">
    <header><a href="/" className="brand-word">BALÍK / LAB 01</a><BrandSettings /></header>
    <h1>Osobnost patří BALÍKu.</h1><p>BLIK, originální syntetické zvuky a reakce. Bez připojení k místnosti.</p>
    <label><input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} /> Náhled bez pohybu</label>
    <section className="brand-mascot-grid" aria-label="Stavy BLIKa" key={ritual}>{MASCOT_STATES.map((state) => <figure key={state}><BrandMascot state={state} size={88} reduced={reduced} decorative={false} /><figcaption>{state}</figcaption></figure>)}</section>
    <button className="btn btn-secondary" onClick={() => setRitual((n) => n + 1)}>Přehrát stavy znovu</button>
    <h2>Zvukový podpis</h2><p>Přehrávání se aktivuje až kliknutím. Mute a hlasitost platí i tady.</p>
    <div className="brand-sound-grid">{(Object.keys(SOUND_RECIPES) as SoundKind[]).map((kind) => <button className="btn btn-secondary" key={kind} onClick={() => { void brandAudio.unlock().then(() => brandAudio.play(kind)); }}>{kind}</button>)}</div>
    <h2>Rychlé reakce</h2><EmotePicker send={(id) => { setEmote(id); return true; }} /><div className="brand-emote-demo"><EmoteBubble key={emote} author="Náhled" message={{ t: 'emote', id: 'preview', code: 'DEMO', playerId: 'preview', emote, at: Date.now(), expiresAt: Infinity }} /></div>
    <p>{EMOTES[emote]} · reakce v tomto náhledu se neposílá do sítě.</p>
    <GameFeelPlayground />
  </main>;
}
