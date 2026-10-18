import { useColorMode } from '../themes/colorMode';
import { effectTheme } from '../effects/effectTokens';
import { useAppearance } from '../themes/preferences';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { type Suit } from '@balik/shared';
import { SuitIcon } from '../cards/SuitIcon';
export { suitName } from '../cards/skin';
import type { FxItem, FxTone } from './display';
import type { Pt } from './layout';

const TONE_COLOR: Record<FxTone, string> = {
  neutral: 'var(--fx-neutral)',
  penalty: 'var(--penalty)',
  skip: 'var(--skip)',
  suit: 'var(--accent)',
  win: 'var(--accent)',
};

/** Ring + short spark burst where a card lands. Strength scales with importance. */
export function Impact({ at, tone, delay, lite, cardW }: { at: Pt; tone: FxTone; delay: number; lite: boolean; cardW: number }) {
  const strong = tone !== 'neutral';
  const size = cardW * (strong ? 2.1 : 1.5);
  const sparks = lite || !strong ? 0 : 10;
  const color = TONE_COLOR[tone];
  return (
    <div className="fx-anchor" style={{ left: at.x, top: at.y }}>
      <motion.div
        className="fx-ring"
        style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderColor: color }}
        initial={{ scale: 0.35, opacity: strong ? 0.95 : 0.5 }}
        animate={{ scale: 1, opacity: 0 }}
        transition={{ duration: strong ? 0.6 : 0.45, ease: [0.1, 0.7, 0.3, 1], delay }}
      />
      {Array.from({ length: sparks }, (_, i) => {
        const angle = (i / sparks) * Math.PI * 2 + 0.3;
        const dist = cardW * (0.95 + (i % 3) * 0.18);
        return (
          <motion.span
            key={i}
            className="fx-spark"
            style={{ background: color, rotate: (angle * 180) / Math.PI + 90 }}
            initial={{ x: 0, y: 0, opacity: 1, scaleY: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0, scaleY: 0.3 }}
            transition={{ duration: 0.55, ease: [0.1, 0.8, 0.3, 1], delay }}
          />
        );
      })}
    </div>
  );
}

/** Big suit glyph blooming out of the discard pile after a Q. */
export function SuitSplash({ at, suit, cardW }: { at: Pt; suit: Suit; cardW: number }) {
  useAppearance(p => p.deck);
  useColorMode(p => p.mode);
  const size = cardW * 1.3;
  return (
    <div className="fx-anchor" style={{ left: at.x, top: at.y }}>
      <motion.div
        className="fx-wash"
        style={{ width: size * 3, height: size * 3, marginLeft: -size * 1.5, marginTop: -size * 1.5, background: `radial-gradient(circle, ${effectTheme(suit).color}55 0%, transparent 65%)` }}
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: 1, opacity: [0, 1, 0] }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      <motion.div
        className="fx-suit"
        style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, color: effectTheme(suit).color }}
        initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
        animate={{ scale: [0.3, 1.25, 1.05, 1.6], opacity: [0, 1, 1, 0], rotate: [-20, 6, 0, 0] }}
        transition={{ duration: 1, times: [0, 0.3, 0.6, 1], ease: 'easeOut' }}
      >
        <SuitIcon suit={suit} />
      </motion.div>
    </div>
  );
}

export function SkipStamp({ at, mine }: { at: Pt; mine: boolean }) {
  return (
    <div className="fx-anchor" style={{ left: at.x, top: at.y }}>
      <motion.div
        className={`fx-stamp${mine ? ' is-mine' : ''}`}
        initial={{ scale: 2.2, opacity: 0, rotate: -18 }}
        animate={{ scale: [2.2, 0.92, 1], opacity: [0, 1, 1], rotate: [-18, -8, -9] }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
        transition={{ duration: 0.42, times: [0, 0.7, 1], ease: 'easeOut' }}
      >
        <LockIcon />
        PŘESKOČENO
      </motion.div>
    </div>
  );
}

export function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden>
      <path fill="currentColor" d="M7 10V8a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1Zm2 0h6V8a3 3 0 0 0-6 0v2Z" />
    </svg>
  );
}

/** Short action text under the piles — the "meaning" layer of every event. */
export function ActionLabel({ item, at }: { item: Extract<FxItem, { kind: 'label' }> | undefined; at: Pt }) {
  return (
    <div className="fx-anchor fx-label-anchor" style={{ left: at.x, top: at.y }} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {item && (
          <motion.div
            key={item.id}
            className={`fx-label tone-${item.tone}`}
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          >
            {item.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CONFETTI_COLORS = ['#ffb23f', '#ff5468', '#5ab0ff', '#36d39a', '#fbf8f1', '#c084fc'];

export function Confetti({ count }: { count: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 120,
        drift: (Math.random() - 0.5) * 40,
        delay: Math.random() * 0.25,
        rotate: Math.random() * 720 - 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
        dur: 1.6 + Math.random() * 1.1,
      })),
    [count],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          style={{ background: p.color, width: p.w, height: p.h, left: '50%' }}
          initial={{ x: '0vw', y: '-10vh', rotate: 0, opacity: 1 }}
          animate={{ x: [`0vw`, `${p.x * 0.5}vw`, `${(p.x + p.drift) * 0.55}vw`], y: ['-10vh', '30vh', '105vh'], rotate: p.rotate, opacity: [1, 1, 0.9] }}
          transition={{ duration: p.dur, delay: p.delay, ease: [0.2, 0.6, 0.4, 1], times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  );
}
