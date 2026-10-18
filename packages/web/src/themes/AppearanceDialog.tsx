import { useEffect, useRef } from 'react';
import { GAME_INFO, type GameId } from '@balik/shared';
import { useMotionPref } from '../lib/motionPref';
import { editionHref } from '../decks/editions';
import { DECK_THEMES, TABLE_THEMES } from './registry';
import { preloadDeck, setAppearance, useAppearance } from './preferences';
import { ColorModePicker } from './ColorModePicker';
import { closeAppearance, useAppearanceDialog } from './appearanceStore';
import { DeckFan, TableStage, deckTraits, showroomDecks, showroomTables } from './Showroom';
import './appearance.css';

/**
 * The appearance showroom: a live table at the top, then cards, table and app mode as
 * three separate choices. Everything is local to this browser and applies immediately,
 * mid-game included, without touching the round or anybody else's view.
 */
export function AppearanceDialog() {
  const { open, game } = useAppearanceDialog();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
    else if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  return (
    <dialog className="appearance-dialog" ref={dialog} onCancel={closeAppearance} onClose={closeAppearance}
      onClick={(e) => { if (e.target === dialog.current) closeAppearance(); }} aria-labelledby="appearance-title">
      {open && <ShowroomContent game={game} />}
    </dialog>
  );
}

export function ShowroomContent({ game }: { game: GameId | null }) {
  const pref = useAppearance();
  const { reduced } = useMotionPref();
  const decks = showroomDecks();
  const galleries = decks.filter((t) => editionHref(t.id));
  return (
    <>
      <header>
        <div>
          <p>TVŮJ BALÍK. TVŮJ SVĚT.</p>
          <h2 id="appearance-title">Vzhled u tvého stolu</h2>
        </div>
        <button type="button" className="appearance-close" onClick={closeAppearance} aria-label="Zavřít vzhled" autoFocus>×</button>
      </header>

      <figure className="showroom-preview">
        <TableStage deck={pref.deck} table={pref.table} game={game ?? 'prsi'} ratio={0.5} reduced={reduced} />
        <figcaption>
          <b>{DECK_THEMES[pref.deck].name}</b> na stole <b>{TABLE_THEMES[pref.table].name}</b>
          <span className="showroom-local">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden><path d="M8 1.5a3 3 0 0 1 3 3v2h.5A1.5 1.5 0 0 1 13 8v5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 13V8a1.5 1.5 0 0 1 1.5-1.5H5v-2a3 3 0 0 1 3-3Zm0 1.5A1.5 1.5 0 0 0 6.5 4.5v2h3v-2A1.5 1.5 0 0 0 8 3Z" fill="currentColor" /></svg>
            Vidíš jen ty. Ostatní u stolu mají svůj vzhled{game ? `, ${GAME_INFO[game].name} běží dál beze změny` : ''}.
          </span>
        </figcaption>
      </figure>

      <fieldset>
        <legend>Karty <small>mění líc, rub a znaky. Pravidla zůstávají.</small></legend>
        <div className="edition-options">
          {decks.map((theme) => {
            const on = pref.deck === theme.id;
            return (
              <button type="button" key={theme.id} className={`edition-option is-${theme.id}`} aria-pressed={on}
                onPointerEnter={() => preloadDeck(theme.id)} onFocus={() => preloadDeck(theme.id)}
                onClick={() => setAppearance({ deck: theme.id })}>
                <span className="edition-preview"><DeckFan deck={theme.id} /></span>
                <strong>{theme.name}</strong>
                <small>{theme.description}</small>
                {deckTraits(theme).length > 0 && (
                  <span className="edition-traits">{deckTraits(theme).map((t) => <em key={t}>{t}</em>)}</span>
                )}
                <span className="edition-selected">{on ? 'U tvého stolu ✓' : 'Použít karty'}</span>
              </button>
            );
          })}
        </div>
        {galleries.length > 0 && (
          <p className="edition-galleries">
            Celé sbírky: {galleries.map((t, i) => (
              <span key={t.id}>{i > 0 && ' · '}<a href={editionHref(t.id)!}>{t.name} ↗</a></span>
            ))}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend>Stůl <small>prostředí kolem karet. Karty si nechají tvou edici.</small></legend>
        <div className="table-options">
          {showroomTables().map((theme) => {
            const on = pref.table === theme.id;
            return (
              <button type="button" key={theme.id} aria-pressed={on} onClick={() => setAppearance({ table: theme.id })}>
                <TableStage deck={pref.deck} table={theme.id} game={game ?? 'prsi'} ratio={0.56} reduced={reduced} animate={false} />
                <strong>{theme.name}</strong>
                <span>{on ? 'U tvého stolu ✓' : 'Použít stůl'}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <ColorModePicker />
      <p className="appearance-note">Uloží se v tomto prohlížeči. Bez účtu, bez vlivu na partii, výsledky nebo spoluhráče.</p>
    </>
  );
}
