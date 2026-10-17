import { motion, useAnimate } from 'motion/react';
import { memo, useEffect, type PointerEvent } from 'react';
import { CardView, type CardFx } from '../cards/Card';
import type { CardEntity } from './display';
import type { Geometry, PlacedCard, Placement } from './layout';
import { placeSpawn } from './layout';
import { HOVER, flipTransition, moveTransition } from './transitions';

interface CardLayerProps {
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

export function CardLayer({ placed, geo, stamp, speed, reduced, fxFor, hoverKey, interactive, onHover, onActivate }: CardLayerProps) {
  return (
    <div className="card-layer" style={{ ['--card-w' as string]: `${geo.cardW}px`, ['--card-h' as string]: `${geo.cardH}px` }}>
      {placed.map((p) => {
        const active = p.entity.moveStamp === stamp;
        const isHoverChange = p.zone === 'mine' && !active && p.entity.key === hoverKey;
        return (
          <CardSlot
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
  entity: CardEntity;
  place: Placement;
  spawn: Placement | null;
  fade: boolean;
  cardW: number;
  cardH: number;
  active: boolean;
  hoverSpring: boolean;
  speed: number;
  fx: CardFx | undefined;
  interactive: boolean;
  onHover: (key: string | null) => void;
  onActivate: (key: string) => void;
}

const CardSlot = memo(function CardSlot({
  entity,
  place,
  spawn,
  fade,
  cardW,
  cardH,
  active,
  hoverSpring,
  speed,
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
    if (!el || !active) return;
    if (entity.move === 'play' || entity.move === 'flipStart') {
      void animate(
        el,
        { scale: [1, 1.13, 0.93, 1.02, 1], rotate: [0, 0, -1.5, 0.5, 0] },
        { duration: 0.62 * speed, times: [0, 0.5, 0.74, 0.88, 1], ease: 'easeOut', delay: entity.delay * speed },
      );
    } else if (entity.move === 'penalty') {
      void animate(el, { scale: [1, 1.18, 0.96, 1] }, { duration: 0.6 * speed, times: [0, 0.4, 0.75, 1], delay: entity.delay * speed });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per move
  }, [entity.moveStamp, entity.move]);

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
      }
    : {};

  return (
    <motion.div
      className={`card-slot${interactive ? ' is-interactive' : ''}`}
      style={{ width: cardW, height: cardH, zIndex: active && entity.move && FLYING.has(entity.move) ? place.z + 600 : place.z }}
      initial={initial}
      animate={target}
      transition={fade ? { ...transition, opacity: { duration: 0.25 } } : transition}
      {...handlers}
    >
      <div ref={scope} className="card-pop">
        <CardView
          card={entity.card}
          faceUp={place.faceUp}
          initialFaceUp={spawn ? spawn.faceUp : place.faceUp}
          flipTransition={flipTransition(move, speed, entity.delay)}
          fx={entity.flash ? { ...fx, flash: entity.flash } : fx}
        />
      </div>
    </motion.div>
  );
});
