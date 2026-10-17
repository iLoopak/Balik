import { brandAudio } from './audio';
import { setBrandPreferences, useBrandPreferences } from './preferences';
import './brand.css';
export function BrandOptions() {
  const pref = useBrandPreferences();
  return <div className="brand-options">
    <label>Hlasitost <input aria-label="Hlasitost efektů" type="range" min="0" max="1" step=".05" value={pref.volume} onChange={(event) => setBrandPreferences({ volume: Number(event.target.value) })} /></label>
    <label><input type="checkbox" checked={pref.mascot} onChange={(event) => setBrandPreferences({ mascot: event.target.checked })} /> Zobrazit BLIKa</label>
  </div>;
}
export function BrandSettings({ compact = false }: { compact?: boolean }) {
  const muted = useBrandPreferences((p) => p.muted);
  return <div className="brand-settings">
    <button className="brand-sound-toggle" aria-label={muted ? 'Zapnout zvuk' : 'Vypnout zvuk'} aria-pressed={!muted} title={muted ? 'Zapnout zvuk' : 'Vypnout zvuk'} onClick={() => {
      setBrandPreferences({ muted: !muted });
      if (!muted) brandAudio.cancel(); else void brandAudio.unlock().then(() => brandAudio.play('select'));
    }}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M4 9v6h4l5 4V5L8 9Z" />{muted ? <path d="m17 9 5 6m0-6-5 6" /> : <path d="M17 8q5 4 0 8m2-11q8 7 0 14" />}</svg></button>
    {!compact && <details><summary>Nastavení</summary><BrandOptions /></details>}
  </div>;
}
