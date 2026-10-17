import type { TargetAndTransition, Transition } from 'motion/react';
import type { EffectEvent, EffectKind } from './effectEvents';
import { EFFECT_TIMING } from './effectTokens';

/** Shared motion vocabulary, consumed by actual cards, local FX and the playground. */
export const MOTION_PRIMITIVES = {
  pop: { scale: [1, 1.075, .985, 1], rotate: [0, -3, 1.5, 0] },
  lift: { scale: [1, 1.08, 1.02, 1], y: ['0%', '-4%', '1%', '0%'] },
  impact: { scale: [1, 1.025, .99, 1] },
  'pulse-ring': { scale: [.6, 1.6], opacity: [.7, 0] },
  'glow-burst': { scale: [.8, 1.2], opacity: [0, .65, 0] },
  shake: { x: [0, -4, 4, -2, 2, 0] },
  'rotate-burst': { rotate: [0, 180], scale: [.8, 1.08, 1], opacity: [0, 1, 0] },
  'color-flash': { opacity: [0, .3, 0], scale: [.9, 1.15] },
  'stack-count-bump': { scale: [1.3, .94, 1], rotate: [-5, 2, 0] },
} satisfies Record<string, TargetAndTransition>;
export type MotionPrimitive = keyof typeof MOTION_PRIMITIVES | 'trail' | 'arc-flight' | 'slide-to-pile' | 'badge-flyout' | 'slash';

interface EffectPreset { duration: number; delay: number; primitives: readonly MotionPrimitive[]; }
export const EFFECT_PRESETS: Record<EffectKind, EffectPreset> = {
  play: { duration: EFFECT_TIMING.impact, delay: EFFECT_TIMING.flight, primitives: ['slide-to-pile', 'impact', 'pulse-ring', 'pop'] },
  draw: { duration: .64, delay: .04, primitives: ['arc-flight', 'trail', 'badge-flyout'] },
  suit: { duration: EFFECT_TIMING.suit, delay: 0, primitives: ['color-flash', 'glow-burst', 'pulse-ring'] },
  skip: { duration: EFFECT_TIMING.skip, delay: 0, primitives: ['slash', 'pop'] },
  reverse: { duration: EFFECT_TIMING.reverse, delay: 0, primitives: ['rotate-burst', 'trail'] },
  penalty: { duration: EFFECT_TIMING.penalty, delay: 0, primitives: ['arc-flight', 'badge-flyout', 'stack-count-bump', 'shake'] },
  pause: { duration: .5, delay: EFFECT_TIMING.flight, primitives: ['slash', 'impact'] },
  danger: { duration: .66, delay: EFFECT_TIMING.flight, primitives: ['pulse-ring', 'pop'] },
  win: { duration: EFFECT_TIMING.win, delay: 0, primitives: ['glow-burst', 'rotate-burst', 'pop'] },
};

export function effectLifetime(event: EffectEvent): number {
  const p = EFFECT_PRESETS[event.kind];
  return Math.ceil((p.delay + p.duration + .08) * 1000);
}

export function primitiveTransition(duration: number, delay = 0): Transition {
  return { duration, delay, ease: [.16, 1, .3, 1] };
}

/** Initial lift and landing are separate, while the table remains the sole flight owner. */
export function cardAccent(kind: 'play' | 'flipStart' | 'penalty' | null) {
  if (kind === 'play' || kind === 'flipStart') return { keyframes: MOTION_PRIMITIVES.lift, duration: .6 };
  if (kind === 'penalty') return { keyframes: MOTION_PRIMITIVES.pop, duration: .42 };
  return null;
}
