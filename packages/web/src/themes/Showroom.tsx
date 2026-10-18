import { AnimatePresence, motion } from 'motion/react';
import type { Card, GameId } from '@balik/shared';
import { CardView } from '../cards/Card';
import { GameTableTheme } from '../table/GameTableTheme';
import { computeGeometry } from '../table/layout';
import { useElementSize } from '../lib/useElementSize';
import { DECK_THEMES, EDITIONS, TABLE_THEMES, type DeckId, type DeckTheme, type TableId } from './registry';
import { useAppearance } from './preferences';
import { useColorMode } from './colorMode';
import { openAppearance } from './appearanceStore';
import './showroom.css';

/** The same three cards everywhere: a figure, a number card and an ace, plus the back. */
export const SHOWROOM_CARDS: readonly Card[] = [
  { id: 'hearts-Q', suit: 'hearts', rank: 'Q' },
  { id: 'clubs-7', suit: 'clubs', rank: '7' },
  { id: 'diamonds-A', suit: 'diamonds', rank: 'A' },
];

/**
 * Every deck in the registry: the curated editions first, then anything else registered
 * (Klasika, or a new edition), so the showroom never needs a second list of decks.
 */
export function showroomDecks(): DeckTheme[] {
  const curated: DeckTheme[] = [...EDITIONS];
  return [...curated, ...Object.values(DECK_THEMES).filter((t) => !curated.includes(t))];
}
export const showroomTables = () => Object.values(TABLE_THEMES);

/** Short, true facts about a deck, derived from its theme rather than written per edition. */
export function deckTraits(theme: DeckTheme): string[] {
  const traits: string[] = [];
  if (theme.id === 'kontrast') traits.push('Nejčitelnější', 'Vzory i pro barvoslepé');
  else if (theme.center === 'symbols') traits.push('Bez ilustrací');
  if (theme.ranks) traits.push(`Indexy ${theme.ranks.J?.index ?? 'J'} · ${theme.ranks.Q?.index ?? 'Q'} · ${theme.ranks.A?.index ?? 'A'}`);
  return traits;
}

/** A fan of real cards from one deck: the back, then the showroom cards. */
export function DeckFan({ deck, count = 3 }: { deck: DeckId; count?: number }) {
  return (
    <span className="deck-fan" data-deck={deck} aria-hidden>
      <span className="deck-fan-card is-back"><CardView card={null} faceUp={false} deck={deck} /></span>
      {SHOWROOM_CARDS.slice(0, count - 1).map((card) => (
        <span key={card.id} className="deck-fan-card"><CardView card={card} faceUp initialFaceUp deck={deck} /></span>
      ))}
    </span>
  );
}

/**
 * A real miniature table: the actual GameTableTheme with the chosen material, and real
 * CardViews of the chosen deck on it. Nothing is a screenshot, so it can never go stale.
 */
export function TableStage({ deck, table, game = 'prsi', ratio = 0.5, reduced = false, animate = true }: {
  deck: DeckId; table: TableId; game?: GameId; ratio?: number; reduced?: boolean; animate?: boolean;
}) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const mode = useColorMode((p) => p.mode);
  // Laid out at a real table size and scaled down as a whole, so it looks like the game.
  const width = STAGE_WIDTH, height = Math.round(STAGE_WIDTH * ratio);
  const scale = (size.width || 320) / width;
  const geo = computeGeometry(width, height, ['host'], 'me', SHOWROOM_CARDS.length);
  const [figure, ...hand] = SHOWROOM_CARDS;
  const enter = animate && !reduced;
  return (
    <div ref={ref} className="table-stage" aria-hidden style={{ height: height * scale }} data-table={table} data-deck={deck}>
      <div className="table-stage-inner" style={{ width, height, transform: `scale(${scale})` }}>
      <GameTableTheme game={game} geo={geo} suit={figure!.suit} reduced lite myTurn theme={table} colorMode={mode} drawCount={12} />
      <div className="table-stage-card" style={{ left: geo.deck.x, top: geo.deck.y, width: geo.deckW, height: geo.deckH }}>
        <CardView card={null} faceUp={false} deck={deck} />
      </div>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div key={`${deck}-pile`} className="table-stage-card" style={{ left: geo.discard.x, top: geo.discard.y, width: geo.pileW, height: geo.pileH }}
          initial={enter ? { y: -46, opacity: 0, rotate: -14 } : false} animate={{ y: 0, opacity: 1, rotate: -4 }} exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
          <CardView card={figure!} faceUp initialFaceUp deck={deck} />
        </motion.div>
        {hand.map((card, i) => (
          <motion.div key={`${deck}-${card.id}`} className="table-stage-card"
            style={{ left: width / 2 + (i - (hand.length - 1) / 2) * geo.cardW * 1.08, top: geo.handY, width: geo.cardW, height: geo.cardH }}
            initial={enter ? { y: 60, opacity: 0 } : false} animate={{ y: 0, opacity: 1, rotate: (i - (hand.length - 1) / 2) * 6 }} exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28, delay: enter ? 0.06 + i * 0.05 : 0 }}>
            <CardView card={card} faceUp initialFaceUp deck={deck} />
          </motion.div>
        ))}
      </AnimatePresence>
      </div>
    </div>
  );
}
const STAGE_WIDTH = 1200;

/** A quiet invitation on the home screen; appearance is never a step before playing. */
export function ShowroomTeaser() {
  const { deck, table } = useAppearance();
  return (
    <section className="showroom-teaser" aria-label="Vzhled karet a stolu">
      <button type="button" className="showroom-teaser-open" onClick={() => openAppearance()}>
        <DeckFan deck={deck} />
        <span className="showroom-teaser-copy">
          <span className="type-machine">Tvůj vzhled</span>
          <b>{DECK_THEMES[deck].name}</b>
          <small>{TABLE_THEMES[table].name} · vidíš jen ty</small>
        </span>
        <span className="showroom-teaser-cta">Změnit vzhled</span>
      </button>
    </section>
  );
}
