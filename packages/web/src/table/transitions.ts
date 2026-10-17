import type { Transition } from 'motion/react';
import type { MoveKind } from './display';

// Central motion vocabulary. Durations are base values in seconds; `speed` < 1 shortens them
// (backlog catch-up, low-power mode).

/** Neutral spring for reflow/hover/resize: quick, no wobble. */
export const SETTLE: Transition = { type: 'spring', stiffness: 420, damping: 36, mass: 0.9 };
export const HOVER: Transition = { type: 'spring', stiffness: 560, damping: 30, mass: 0.7 };

const tween = (duration: number, ease: [number, number, number, number], delay = 0): Transition => ({
  type: 'tween',
  duration,
  ease,
  delay,
});

export function moveTransition(kind: MoveKind | null, speed: number, delay: number): Transition {
  const d = (s: number) => s * speed;
  const dl = delay * speed;
  switch (kind) {
    case 'deal':
      return tween(d(0.42), [0.2, 0.8, 0.25, 1], dl);
    case 'play':
      // Different x/y easing curves give the flight a slight arc.
      return {
        x: tween(d(0.46), [0.35, 0.7, 0.4, 1], dl),
        y: tween(d(0.46), [0.12, 0.85, 0.3, 1], dl),
        rotate: tween(d(0.5), [0.3, 0.9, 0.35, 1.12], dl),
        scale: tween(d(0.46), [0.2, 0.8, 0.3, 1], dl),
      };
    case 'draw':
      return tween(d(0.44), [0.22, 0.85, 0.3, 1], dl);
    case 'penalty':
      return {
        x: { type: 'spring', stiffness: 190, damping: 19, delay: dl },
        y: { type: 'spring', stiffness: 190, damping: 19, delay: dl },
        rotate: { type: 'spring', stiffness: 160, damping: 14, delay: dl },
        scale: tween(d(0.4), [0.2, 0.8, 0.3, 1], dl),
      };
    case 'flipStart':
      return tween(d(0.46), [0.2, 0.8, 0.25, 1], dl);
    case 'expand':
      return { type: 'spring', stiffness: 300, damping: 27, delay: dl };
    case 'toDeck':
      return tween(d(0.36), [0.5, 0, 0.75, 0], dl);
    case 'appear':
      return { duration: 0 };
    default:
      return SETTLE;
  }
}

/** Face flip timing, matched to the move it belongs to. */
export function flipTransition(kind: MoveKind | null, speed: number, delay: number): Transition {
  const dl = delay * speed;
  switch (kind) {
    case 'expand':
      return tween(0.34 * speed, [0.3, 0.7, 0.3, 1], dl + 0.1 * speed);
    case 'draw':
    case 'penalty':
      return tween(0.36 * speed, [0.3, 0.7, 0.3, 1], dl + 0.1 * speed);
    case 'play':
      return tween(0.38 * speed, [0.3, 0.7, 0.3, 1], dl + 0.04 * speed);
    case 'flipStart':
      return tween(0.42 * speed, [0.3, 0.7, 0.3, 1], dl + 0.12 * speed);
    default:
      return tween(0.3 * speed, [0.3, 0.7, 0.3, 1], dl);
  }
}
