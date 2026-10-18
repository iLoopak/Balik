import { DECK_THEMES, EDITIONS } from './registry';
import { useAppearance } from './preferences';
import { editionHref } from '../decks/editions';

/** A quiet pointer to appearance on the home screen; never a step before playing. */
export function ShowroomTeaser() {
  const deck = useAppearance((p) => p.deck);
  return (
    <section className="showroom-teaser" aria-label="Vzhled karet">
      <p>Hraješ s kartami <b>{DECK_THEMES[deck].name}</b>. Vzhled změníš kdykoli tlačítkem Vzhled.</p>
      <nav>
        {EDITIONS.map((t) => editionHref(t.id) && (
          <a key={t.id} className="btn btn-ghost" href={editionHref(t.id)!}>{t.name} ↗</a>
        ))}
      </nav>
    </section>
  );
}
