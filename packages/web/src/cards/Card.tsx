import { motion, type Transition } from 'motion/react';
import { memo } from 'react';
import { SUIT_NAME_CS, type Card } from '@balik/shared';
import { RANK_HINT, STICKER_DEMO, SUIT_COLOR, stickerFor, type GameId } from './skin';
import { SuitIcon } from './SuitIcon';
import './cards.css';

export interface CardFx {
  playable?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  pending?: boolean;
  /** One-shot flash; a new id replays it. */
  flash?: { kind: 'penalty' | 'drawn'; id: number } | null;
}

interface CardViewProps {
  card: Card | null;
  faceUp: boolean;
  /** Face state on first render (e.g. a card leaving the deck face down). */
  initialFaceUp?: boolean;
  flipTransition?: Transition;
  fx?: CardFx;
  game?: GameId;
}

const DEFAULT_FLIP: Transition = { type: 'spring', stiffness: 260, damping: 26 };

/**
 * A card is a stack of independent layers:
 * CardBase → CardIndices → CardCenter → CardStickerLayer → CardFxLayer, plus a CardBack.
 * Only the outer motion wrapper (owned by the table) moves the card; layers animate on their own.
 */
export const CardView = memo(function CardView({
  card,
  faceUp,
  initialFaceUp,
  flipTransition = DEFAULT_FLIP,
  fx,
  game = 'prsi',
}: CardViewProps) {
  const showFace = !!card && faceUp;
  const label = card ? `${card.rank} ${SUIT_NAME_CS[card.suit]}` : 'rub karty';
  return (
    <div className="card" role="img" aria-label={showFace ? label : 'rub karty'}>
      <motion.div
        className="card-flipper"
        initial={{ rotateY: (initialFaceUp ?? faceUp) && card ? 0 : 180 }}
        animate={{ rotateY: showFace ? 0 : 180 }}
        transition={flipTransition}
      >
        {card && (
          <div className="card-face card-front" style={{ color: SUIT_COLOR[card.suit] }}>
            <CardBase />
            <CardCenter card={card} />
            <CardIndices card={card} />
            <CardStickerLayer card={card} game={game} />
            <CardFxLayer fx={fx} />
          </div>
        )}
        <div className="card-face card-back-face">
          <CardBack />
          {!showFace && <CardFxLayer fx={fx} />}
        </div>
      </motion.div>
    </div>
  );
});

export function CardBase() {
  return <div className="card-base" />;
}

export function CardIndices({ card }: { card: Card }) {
  const index = (
    <>
      <span className="card-rank">{card.rank}</span>
      <SuitIcon suit={card.suit} className="card-index-suit" />
    </>
  );
  return (
    <>
      <div className="card-index card-index-tl">{index}</div>
      <div className="card-index card-index-br">{index}</div>
    </>
  );
}

function CardCenter({ card }: { card: Card }) {
  const hint = RANK_HINT[card.rank];
  const isFace = card.rank === 'J' || card.rank === 'Q' || card.rank === 'K';
  return (
    <div className="card-center">
      {isFace ? (
        <div className="card-court">
          <span className="card-court-rank">{card.rank}</span>
          <SuitIcon suit={card.suit} className="card-court-suit" />
        </div>
      ) : (
        <SuitIcon suit={card.suit} className={card.rank === 'A' ? 'card-pip card-pip-ace' : 'card-pip'} />
      )}
      {hint && <span className="card-hint">{hint}</span>}
    </div>
  );
}

/**
 * Separate, individually transformable layer for future transparent sticker art.
 * Never baked into the card face.
 */
export function CardStickerLayer({ card, game }: { card: Card; game: GameId }) {
  const sticker = stickerFor(game, card);
  if (!sticker && !STICKER_DEMO) return null;
  const [ox, oy] = sticker?.offset ?? [0, 0];
  return (
    <motion.div
      className="card-sticker"
      data-layer="sticker"
      style={{
        x: `${ox}%`,
        y: `${oy}%`,
        rotate: sticker?.rotation ?? 0,
        scale: sticker?.scale ?? 1,
      }}
    >
      {sticker ? <img src={sticker.src} alt="" draggable={false} /> : <div className="card-sticker-demo">sticker</div>}
    </motion.div>
  );
}

export function CardFxLayer({ fx }: { fx?: CardFx }) {
  if (!fx) return null;
  const cls = [
    'card-fx',
    fx.playable && 'is-playable',
    fx.dimmed && 'is-dimmed',
    fx.selected && 'is-selected',
    fx.pending && 'is-pending',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls}>
      {fx.flash && (
        <motion.div
          key={fx.flash.id}
          className={`card-flash card-flash-${fx.flash.kind}`}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: fx.flash.kind === 'penalty' ? 1.3 : 0.9, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}

export function CardBack() {
  return (
    <div className="card-back">
      <div className="card-back-inner">
        <div className="card-back-emblem">
          <span>B</span>
        </div>
      </div>
    </div>
  );
}
