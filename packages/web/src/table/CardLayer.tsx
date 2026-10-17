import { SUIT_NAME_CS, type GameId } from '@balik/shared';
import { motion, useAnimate } from 'motion/react';
import { memo, useEffect, type KeyboardEvent, type PointerEvent } from 'react';
import { CardView, type CardFx } from '../cards/Card';
import type { CardEntity } from './display';
import type { Geometry, PlacedCard, Placement } from './layout';
import { placeSpawn } from './layout';
import { HOVER, flipTransition, moveTransition } from './transitions';
import { cardAccent, MOTION_PRIMITIVES, primitiveTransition } from '../effects/effectPresets';
import { EFFECT_TIMING } from '../effects/effectTokens';

interface CardLayerProps {
  game?: GameId;
  placed: PlacedCard[];
  geo: Geometry;
  stamp: number;
  speed: number;
  reduced: boolean;
  fxFor: (p: PlacedCard) => CardFx | undefined;
  hoverKey: string | null;
  interactive: (p: PlacedCard) => boolean;
  onHover: (key: string | null) => void;
  onActivate: (key: string) => void;
}

export function CardLayer({ game = 'prsi', placed, geo, stamp, speed, reduced, fxFor, hoverKey, interactive, onHover, onActivate }: CardLayerProps) {
  return (
    <div className="card-layer" style={{ ['--card-w' as string]: `${geo.cardW}px`, ['--card-h' as string]: `${geo.cardH}px` }}>
      {placed.map((p) => {
        const active = p.entity.moveStamp === stamp;
        const isHoverChange = p.zone === 'mine' && !active && p.entity.key === hoverKey;
        return (
          <CardSlot
            game={game}
            zone={p.zone}
            key={p.entity.key}
            entity={p.entity}
            place={p.place}
            spawn={p.entity.spawn ? placeSpawn(geo, p.entity.spawn) : null}
            fade={p.entity.spawn?.kind === 'fade' || (reduced && !!p.entity.spawn)}
            cardW={geo.cardW}
            cardH={geo.cardH}
            active={active}
            hoverSpring={isHoverChange}
            speed={speed}
            reduced={reduced}
            fx={fxFor(p)}
            interactive={interactive(p)}
            onHover={onHover}
            onActivate={onActivate}
          />
        );
      })}
    </div>
  );
}

/** Moves that travel across the table fly above seats and HUD. */
const FLYING = new Set(['play', 'draw', 'penalty', 'deal', 'flipStart']);

interface CardSlotProps {
  zone: PlacedCard['zone'];
  game: GameId;
  entity: CardEntity;
  place: Placement;
  spawn: Placement | null;
  fade: boolean;
  cardW: number;
  cardH: number;
  active: boolean;
  hoverSpring: boolean;
  speed: number;
  reduced: boolean;
  fx: CardFx | undefined;
  interactive: boolean;
  onHover: (key: string | null) => void;
  onActivate: (key: string) => void;
}

const CardSlot = memo(function CardSlot({
  zone,
  game,
  entity,
  place,
  spawn,
  fade,
  cardW,
  cardH,
  active,
  hoverSpring,
  speed,
  reduced,
  fx,
  interactive,
  onHover,
  onActivate,
}: CardSlotProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const move = active ? entity.move : null;
  const transition = active ? moveTransition(entity.move, speed, entity.delay) : hoverSpring ? HOVER : moveTransition(null, speed, 0);

  // Landing accent, independent of the positional animation so re-renders never restart it.
  useEffect(() => {
    const el = scope.current;
    if (!el || !active || reduced) return;
    const accent = cardAccent(entity.move === 'play' || entity.move === 'flipStart' || entity.move === 'penalty' ? entity.move : null);
    const controls = accent ? animate(el, accent.keyframes, primitiveTransition(accent.duration * speed, entity.delay * speed)) : null;
    const sticker = el.querySelector<HTMLElement>('[data-layer="sticker"] img');
    const pop = sticker && (entity.move === 'play' || entity.move === 'flipStart')
      ? animate(sticker, MOTION_PRIMITIVES.pop, primitiveTransition(EFFECT_TIMING.sticker * speed, (EFFECT_TIMING.flight + entity.delay) * speed)) : null;
    return () => {
      controls?.stop(); pop?.stop();
      el.style.removeProperty('transform');
      sticker?.style.removeProperty('transform');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per move
  }, [entity.moveStamp, entity.move, reduced]);

  const target = {
    x: place.x - cardW / 2,
    y: place.y - cardH / 2,
    rotate: place.rotate,
    scale: place.scale,
    opacity: 1,
  };
  const initial = spawn
    ? { x: spawn.x - cardW / 2, y: spawn.y - cardH / 2, rotate: spawn.rotate, scale: spawn.scale, opacity: 1 }
    : fade
      ? { ...target, opacity: 0 }
      : false;

  const handlers = interactive
    ? {
        onPointerEnter: (e: PointerEvent) => e.pointerType === 'mouse' && onHover(entity.key),
        onPointerLeave: (e: PointerEvent) => e.pointerType === 'mouse' && onHover(null),
        onClick: () => onActivate(entity.key),
        onFocus: () => onHover(entity.key),
        onBlur: () => onHover(null),
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!e.repeat) onActivate(entity.key);
          }
        },
      }
    : {};

  return (
    <motion.div
      className={`card-slot${interactive ? ' is-interactive' : ''}`}
      data-zone={zone}
      aria-pressed={interactive ? !!fx?.selected : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive && entity.card ? `${entity.card.rank} ${SUIT_NAME_CS[entity.card.suit]}` : undefined}
      style={{ width: cardW, height: cardH, zIndex: active && entity.move && FLYING.has(entity.move) ? place.z + 600 : place.z }}
      initial={initial}
      animate={target}
      transition={reduced ? { duration: 0 } : fade ? { ...transition, opacity: { duration: 0.25 } } : transition}
      {...handlers}
    >
      <div ref={scope} className="card-pop">
        <CardView
          game={game}
          card={entity.card}
          faceUp={place.faceUp}
          initialFaceUp={spawn ? spawn.faceUp : place.faceUp}
          flipTransition={reduced ? { duration: 0 } : flipTransition(move, speed, entity.delay)}
          fx={entity.flash ? { ...fx, flash: entity.flash } : fx}
        />
      </div>
    </motion.div>
  );
});
