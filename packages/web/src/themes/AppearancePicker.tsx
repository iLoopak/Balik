import { useEffect, useRef, useState } from 'react';
import { CardView } from '../cards/Card';
import { BrandSettings } from '../brand/BrandSettings';
import { DECK_THEMES, EDITIONS, TABLE_THEMES } from './registry';
import { setAppearance, useAppearance } from './preferences';
import './appearance.css';
import { AvatarPicker } from '../avatars/AvatarPicker';

/** Composition belongs to settings, keeping brand components edition-independent. */
export function AppSettings({ compact = false }: { compact?: boolean }) {
  return <div className="app-settings"><AvatarPicker compact={compact} /><BrandSettings compact={compact} /><AppearancePicker compact={compact} /></div>;
}
export function AppearancePicker({ compact = false }: { compact?: boolean }) {
  const pref = useAppearance();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
    else if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  return <>
    <button type="button" className="appearance-open" onClick={() => setOpen(true)} aria-label="Vzhled karet a stolu" aria-haspopup="dialog" title="Vzhled karet a stolu">
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><rect x="7" y="3" width="12" height="17" rx="2"/><path d="m6 6-3 1 3 14 10-2m-3-12v6m-3-3h6"/></svg>{!compact && <span>Vzhled</span>}
    </button>
    <dialog className="appearance-dialog" ref={dialog} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={e => { if (e.target === dialog.current) setOpen(false); }} aria-labelledby="appearance-title">
      <header><div><p>TVŮJ BALÍK. TVŮJ SVĚT.</p><h2 id="appearance-title">Vzhled u tvého stolu</h2></div><button type="button" className="appearance-close" onClick={() => setOpen(false)} aria-label="Zavřít vzhled">×</button></header>
      <p className="appearance-note">Karty i stůl vidíš podle sebe. Přepínej kdykoli, i během partie.</p>
      <fieldset><legend>Edice karet</legend><div className="edition-options">
        {EDITIONS.map(theme => <button type="button" key={theme.id} className="edition-option" aria-pressed={pref.deck === theme.id} onClick={() => setAppearance({ deck: theme.id })}>
          <span className="edition-preview" aria-hidden><span className="edition-preview-back"><CardView card={null} faceUp={false} deck={theme.id} /></span><span className="edition-preview-face"><CardView card={{ id: 'hearts-J', suit: 'hearts', rank: 'J' }} faceUp deck={theme.id} /></span></span>
          <strong>{theme.name}</strong><small>{theme.description}</small><span className="edition-selected">{pref.deck === theme.id ? 'Vybráno ✓' : 'Použít edici'}</span>
        </button>)}
      </div><button type="button" className="appearance-classic" aria-pressed={pref.deck === 'classic'} onClick={() => setAppearance({ deck: 'classic' })}>{pref.deck === 'classic' ? '✓ ' : ''}{DECK_THEMES.classic.name} · jednoduché symboly</button></fieldset>
      <fieldset><legend>Prostředí stolu</legend><div className="table-options">{Object.values(TABLE_THEMES).map(theme => { const p = theme.tones[pref.tone]; return <button type="button" key={theme.id} aria-pressed={pref.table === theme.id} onClick={() => setAppearance({ table: theme.id })}><span className={`table-swatch is-${theme.cut}`} style={{ background: p.bg, borderColor: p.frame }} aria-hidden><i style={{ background: p.faceTop, borderColor: p.edge }}><b style={{ background: p.wellTop }} /><em style={{ background: p.amber }} /><b style={{ background: p.wellTop, outlineColor: theme.colors.hearts }} /></i></span><strong>{theme.name}</strong><span>{pref.table === theme.id ? 'Vybráno ✓' : 'Použít stůl'}</span></button>; })}</div>
        <div className="tone-options" role="radiogroup" aria-label="Světlo stolu">{([['dark', 'Tmavý · aréna'], ['light', 'Světlý · konzole']] as const).map(([tone, label]) => <button type="button" role="radio" key={tone} aria-checked={pref.tone === tone} className={pref.tone === tone ? 'is-on' : ''} onClick={() => setAppearance({ tone })}><i className={`tone-dot is-${tone}`} aria-hidden />{label}</button>)}</div></fieldset>
      <p className="appearance-note">Volba se uloží v tomto prohlížeči. Pravidla, výsledky a společná parta zůstávají stejné.</p>
    </dialog>
  </>;
}
