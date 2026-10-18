import { motion, type Transition } from 'motion/react';
import { memo, useState } from 'react';
import { SUIT_NAME_CS, type Card } from '@balik/shared';
import { RANK_HINT, rankLabel, rankName, suitColor, suitName, stickerFor, type DeckId, type GameId } from './skin';
import { SuitIcon } from './SuitIcon';
import { CardEffectLayer } from '../effects/CardEffectLayer';
import './cards.css';
import { DECK_THEMES } from '../themes/registry';
import { useAppearance } from '../themes/preferences';

export interface CardFx {
  current?: boolean;
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
  deck?: DeckId;
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
  deck: override,
}: CardViewProps) {
  const selected = useAppearance(p => p.deck);
  const deck = override ?? selected;
  const [failedAsset, setFailedAsset] = useState<string | null>(null);
  const showFace = !!card && faceUp;
  const asset = showFace ? stickerFor(game, card, deck) : null;
  const visibleDeck = showFace && deck !== 'classic' && (!asset || asset.src === failedAsset) ? 'classic' : deck;
  const label = card ? (DECK_THEMES[visibleDeck].ranks ? `${rankName(card.rank, visibleDeck)} · ${suitName(card.suit, visibleDeck)}` : `${card.rank} ${SUIT_NAME_CS[card.suit]}${visibleDeck === 'classic' ? '' : ` · ${suitName(card.suit, visibleDeck)}`}`) : 'rub karty';
  return (
    <div className={`card card-deck-${visibleDeck}`} data-deck={visibleDeck} role="img" aria-label={showFace ? label : 'rub karty'}>
      <motion.div
        className="card-flipper"
        initial={{ rotateY: (initialFaceUp ?? faceUp) && card ? 0 : 180 }}
        animate={{ rotateY: showFace ? 0 : 180 }}
        transition={flipTransition}
      >
        {showFace && (
          <div className="card-face card-front" style={{ color: suitColor(card.suit, visibleDeck) }}>
            <CardBase />
            {visibleDeck === 'classic' && <CardCenter card={card} game={game} />}
            <CardIndices card={card} deck={visibleDeck} />
            <CardStickerLayer card={card} game={game} deck={visibleDeck} onError={() => asset && setFailedAsset(asset.src)} />
            <CardEffectLayer current={fx?.current} suit={card.suit} deck={visibleDeck} />
            <CardFxLayer fx={fx} />
          </div>
        )}
        <div className="card-face card-back-face">
          <CardBack deck={deck} />
          {!showFace && <CardFxLayer fx={fx} />}
        </div>
      </motion.div>
    </div>
  );
});

export function CardBase() {
  return <div className="card-base" />;
}

export function CardIndices({ card, deck = useAppearance.getState().deck }: { card: Card; deck?: DeckId }) {
  const rank = rankLabel(card.rank, deck);
  if (DECK_THEMES[deck].indices === 'four-corners') return <>
    <div className="card-index card-index-tl"><span className="card-rank" data-len={rank.length}>{rank}</span><SuitIcon suit={card.suit} deck={deck} className="card-hand-suit" /></div>
    <div className="card-index card-index-tr"><SuitIcon suit={card.suit} deck={deck} className="card-index-suit" /></div>
    <div className="card-index card-index-br"><span className="card-rank" data-len={rank.length}>{rank}</span><SuitIcon suit={card.suit} deck={deck} className="card-hand-suit" /></div>
    <div className="card-index card-index-bl"><SuitIcon suit={card.suit} deck={deck} className="card-index-suit" /></div>
  </>;
  const index = (
    <>
      <span className="card-rank" data-len={rank.length}>{rank}</span>
      <SuitIcon suit={card.suit} deck={deck} className="card-index-suit" />
    </>
  );
  return (
    <>
      <div className="card-index card-index-tl">{index}</div>
      <div className="card-index card-index-br">{index}</div>
    </>
  );
}

function CardCenter({ card, game }: { card: Card; game: GameId }) {
  const hint = game === 'sedma' ? (card.rank === 'A' || card.rank === '10' ? '10 bodů' : card.rank === '7' ? 'bere' : undefined) : game === 'prsi' ? RANK_HINT[card.rank] : undefined;
  const isFace = card.rank === 'J' || card.rank === 'Q' || card.rank === 'K';
  return (
    <div className="card-center">
      {isFace ? (
        <div className="card-court">
          <span className="card-court-rank">{card.rank}</span>
          <SuitIcon suit={card.suit} deck="classic" className="card-court-suit" />
        </div>
      ) : (
        <SuitIcon suit={card.suit} deck="classic" className={card.rank === 'A' ? 'card-pip card-pip-ace' : 'card-pip'} />
      )}
      {hint && <span className="card-hint">{hint}</span>}
    </div>
  );
}

/**
 * Separate, individually transformable layer for future transparent sticker art.
 * Never baked into the card face.
 */
export function CardStickerLayer({ card, game, deck = useAppearance.getState().deck, onError }: { card: Card; game: GameId; deck?: DeckId; onError?: () => void }) {
  const sticker = stickerFor(game, card, deck);
  if (!sticker) return null;
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
      <img src={sticker.src} alt="" draggable={false} onError={onError} decoding="async" />
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

export function CardBack({ deck: override }: { deck?: DeckId } = {}) {
  const selected = useAppearance(p => p.deck);
  const src = DECK_THEMES[override ?? selected].back;
  const [failed, setFailed] = useState<string | null>(null);
  if (src && src !== failed) return <img className="card-back-art" src={src} alt="" draggable={false} onError={() => setFailed(src)} />;
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
