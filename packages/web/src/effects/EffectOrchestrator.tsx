import { motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { SuitIcon } from '../cards/SuitIcon';
import type { Geometry, Pt } from '../table/layout';
import type { EffectEvent, EffectInstance } from './effectEvents';
import { EFFECT_PRESETS, primitiveTransition } from './effectPresets';
import { EFFECT_BUDGET, effectQuality, effectTheme, particleBudget, type EffectQuality } from './effectTokens';
import './effects.css';
import { useColorMode } from '../themes/colorMode';
import { useAppearance } from '../themes/preferences';

export function playerEffectAnchor(geo: Geometry, id?: string, me?: string): Pt {
  if (!id) return geo.discard;
  if (id === me) return { x: geo.w / 2, y: geo.handTop + geo.cardH * .32 };
  const seat = geo.seats[id];
  if (!seat) return geo.discard;
  return { x: seat.x, y: seat.y + geo.cardH * geo.oppScale * (seat.side === 'top' ? .5 : .9) + geo.cardW * .25 };
}

function Anchor({ at, size, color, children, className = '' }: { at: Pt; size: number; color: string; children: ReactNode; className?: string }) {
  return <div className={`game-fx-anchor ${className}`} style={{ left: at.x, top: at.y, width: size, height: size, '--fx-color': color } as CSSProperties}>{children}</div>;
}

const SHAPES = {
  pixel: 'M46 8h8v8h-8Z',
  spark: 'M50 7 53 16 50 23 47 16Z',
  dash: 'M47 8h6v17h-6Z',
  leaf: 'M50 7q12 8 0 19Q38 15 50 7Z',
  bolt: 'm50 5-6 12h5l-1 9 9-14h-6l4-7Z',
  tulip: 'M50 26q-9-4-9-13l4 3 5-9 5 9 4-3q0 9-9 13Z',
};

function Burst({ at, cardW, event, quality, delay, duration, big = false }: {
  at: Pt; cardW: number; event: EffectEvent; quality: EffectQuality; delay: number; duration: number; big?: boolean;
}) {
  const theme = effectTheme(event.suit);
  const count = particleBudget(quality);
  const quiet = quality === 'reduced';
  return <Anchor at={at} size={cardW * (big ? 2.7 : 1.9)} color={theme.color}>
    <svg viewBox="0 0 100 100" className="game-fx-svg" aria-hidden>
      <motion.circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth={big ? 2 : 1} style={{ transformOrigin: '50px 50px' }}
        initial={{ scale: quiet ? 1 : .6, opacity: 0 }} animate={{ scale: quiet ? 1 : 1.6, opacity: [0, .7, 0] }} transition={primitiveTransition(duration, delay)} />
      {Array.from({ length: count }, (_, i) => <g key={i} transform={`rotate(${i * 360 / count + theme.rotation} 50 50)`}>
        <motion.path d={SHAPES[theme.shape]} fill={i % 2 ? theme.secondary : theme.color} style={{ transformOrigin: '50px 16px' }}
          initial={{ y: 12, opacity: 0, scale: .8 }} animate={{ y: -8, opacity: [0, 1, 0], scale: [1, 1, .35] }} transition={primitiveTransition(duration * .85, delay + i * .008)} />
      </g>)}
    </svg>
  </Anchor>;
}

function LocalBadge({ at, size, color, label, detail, quiet, delay, duration }: {
  at: Pt; size: number; color: string; label: string; detail?: string; quiet: boolean; delay: number; duration: number;
}) {
  return <Anchor at={at} size={size * 2.2} color={color} className="game-fx-badge-anchor">
    <motion.div className="game-fx-badge" initial={{ opacity: 0, scale: quiet ? 1 : .8, y: quiet ? 0 : size * .15 }}
      animate={{ opacity: [0, 1, 1, 0], scale: quiet ? 1 : [.8, 1.04, 1, 1], y: 0 }}
      transition={{ duration, delay, times: [0, .15, .8, 1], ease: 'easeOut' }}>
      <strong>{label}</strong>{detail && <span>{detail}</span>}
    </motion.div>
  </Anchor>;
}

/** Small faction marks follow an arc; only transform and opacity change. */
function Trail({ from, to, middle, geo, event, quality, duration, delay }: {
  from: Pt; to: Pt; middle: Pt; geo: Geometry; event: EffectEvent; quality: EffectQuality; duration: number; delay: number;
}) {
  const theme = effectTheme(event.suit);
  const count = quality === 'reduced' ? 0 : quality === 'lite' ? 1 : quality === 'mobile' ? 2 : 3;
  const rotation = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI + 90;
  return <>{Array.from({ length: count }, (_, i) => <motion.svg key={i} viewBox="34 0 32 32" className="game-fx-trail"
    style={{ width: geo.cardW * .24, height: geo.cardW * .24, color: i % 2 ? theme.secondary : theme.color, rotate: rotation }}
    initial={{ x: from.x, y: from.y, opacity: 0, scale: .8 }}
    animate={{ x: [from.x, middle.x, to.x], y: [from.y, middle.y, to.y], opacity: [0, .6, 0], scale: [.8, 1, .3] }}
    transition={{ duration, delay: delay + i * .025, times: [0, .5, 1], ease: [.25, .7, .35, 1] }} aria-hidden>
    <path d={SHAPES[theme.shape]} fill="currentColor" />
  </motion.svg>)}</>;
}

function Flight({ event, geo, me, quality, duration, delay }: { event: EffectEvent; geo: Geometry; me: string; quality: EffectQuality; duration: number; delay: number }) {
  const quiet = quality === 'reduced';
  const from = event.kind === 'draw' ? geo.deck : playerEffectAnchor(geo, event.sourcePlayerId, me);
  const target = playerEffectAnchor(geo, event.targetPlayerId, me);
  const color = event.kind === 'penalty' ? 'var(--fx-penalty)' : effectTheme(event.suit).color;
  const middle = { x: geo.discard.x, y: Math.max(geo.cardH * .4, geo.discard.y - geo.cardH * .65) };
  const pointsX = [from.x, middle.x, target.x];
  const pointsY = [from.y, middle.y, target.y];
  return <>
    <Trail from={from} to={target} middle={middle} geo={geo} event={event} quality={quality} duration={duration * .78} delay={delay} />
    {!quiet && <motion.div className={`game-fx-flight game-fx-flight-${event.kind}`}
      style={{ width: geo.cardW * .5, minHeight: geo.cardW * .4, '--fx-color': color } as CSSProperties}
      initial={{ x: from.x, y: from.y, opacity: 0, scale: .65 }}
      animate={{ x: pointsX, y: pointsY, opacity: [0, 1, 1, 0], scale: [.65, 1.12, 1] }}
      transition={{ duration: duration * .78, delay, ease: [.3, .7, .4, 1], x: { times: [0, .48, 1] }, y: { times: [0, .48, 1] }, opacity: { times: [0, .1, .85, 1] } }}>
      +{event.count ?? 1}
    </motion.div>}
    <LocalBadge at={target} size={geo.cardW} color={color} label={`+${event.count ?? 1}`}
      detail={event.kind === 'penalty' ? `${event.sourceName ?? 'Sedmička'} → ${event.targetName ?? 'Hráč'}` : `${event.targetName ?? 'Hráč'} · do ruky`}
      quiet={quiet} delay={quiet ? delay : delay + duration * .5} duration={duration * (quiet ? 1 : .5)} />
    <Burst at={target} cardW={geo.cardW * .8} event={event} quality={quiet ? 'reduced' : 'lite'} delay={delay + (quiet ? 0 : duration * .5)} duration={duration * .5} />
  </>;
}

function EffectVisual({ item, geo, me, quality }: { item: EffectInstance; geo: Geometry; me: string; quality: EffectQuality }) {
  const { event, scale } = item;
  const preset = EFFECT_PRESETS[event.kind];
  const quiet = quality === 'reduced';
  const duration = preset.duration * scale;
  const delay = preset.delay * scale;
  const theme = effectTheme(event.suit);
  const target = playerEffectAnchor(geo, event.targetPlayerId, me);
  switch (event.kind) {
    case 'play': {
      const from = playerEffectAnchor(geo, event.sourcePlayerId, me);
      const middle = { x: (from.x + geo.discard.x) / 2, y: Math.min(from.y, geo.discard.y) - geo.cardH * .2 };
      return <><Trail from={from} to={geo.discard} middle={middle} geo={geo} event={event} quality={quality} duration={preset.delay * scale} delay={0} /><Burst at={geo.discard} cardW={geo.cardW} event={event} quality={quality} delay={delay} duration={duration} /></>;
    }
    case 'draw':
    case 'penalty':
      return <Flight event={event} geo={geo} me={me} quality={quality} duration={duration} delay={delay} />;
    case 'suit':
      return <>
        <Anchor at={geo.discard} size={geo.cardW * 3.8} color={theme.color}>
          <motion.div className="game-fx-color-wash" initial={{ opacity: 0, scale: quiet ? 1 : .5 }} animate={{ opacity: [0, .5, 0], scale: quiet ? 1 : 1.1 }} transition={primitiveTransition(duration, delay)} />
          <motion.div className="game-fx-faction" initial={{ opacity: 0, scale: quiet ? 1 : .5, rotate: quiet ? 0 : -12 }} animate={{ opacity: [0, 1, 1, 0], scale: quiet ? 1 : [.5, 1.06, 1, 1.15], rotate: 0 }} transition={{ duration, delay, times: [0, .2, .7, 1] }}>
            {event.suit && <SuitIcon suit={event.suit} />}
          </motion.div>
        </Anchor>
        <Burst at={geo.discard} cardW={geo.cardW * 1.2} event={event} quality={quality} delay={delay} duration={duration} />
      </>;
    case 'skip':
      return <>
        <Anchor at={target} size={geo.cardW * 1.8} color="var(--fx-skip)">
          <svg className="game-fx-svg" viewBox="0 0 100 100" aria-hidden><motion.path d="M22 72 78 28M29 79 85 35" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
            initial={{ pathLength: quiet ? 1 : 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [0, 1, 0] }} transition={primitiveTransition(duration * .7, delay)} /></svg>
        </Anchor>
        <LocalBadge at={target} size={geo.cardW} color="var(--fx-skip)" label="STOP" detail={event.targetName} quiet={quiet} delay={delay + .08 * scale} duration={duration} />
      </>;
    case 'pause':
      return <Anchor at={geo.discard} size={geo.cardW * 1.7} color={theme.secondary}>
        <svg className="game-fx-svg" viewBox="0 0 100 100" aria-hidden><motion.g initial={{ opacity: 0, x: quiet ? 0 : -8 }} animate={{ opacity: [0, .75, .75, 0], x: 0 }} transition={{ duration, delay, times: [0, .15, .55, 1] }}>
          <path d="M20 32h60M20 68h60" stroke="currentColor" strokeWidth="2" /><path d="M43 42v16m14-16v16" stroke="currentColor" strokeWidth="6" />
        </motion.g></svg>
      </Anchor>;
    case 'reverse':
      return <Anchor at={geo.discard} size={geo.cardW * 2} color={theme.color}>
        <svg className="game-fx-svg" viewBox="0 0 100 100" aria-hidden><motion.g style={{ transformOrigin: '50px 50px' }} initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: [0, 1, 1, 0], rotate: quiet ? 0 : (event.direction ?? -1) * 180 }} transition={{ duration, delay, times: [0, .15, .75, 1], ease: 'easeInOut' }}>
          <path d="M23 47a28 28 0 0 1 51-14m3 20a28 28 0 0 1-51 14" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /><path d="m61 32 17 4-1-18M39 68l-17-4 1 18" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.g></svg>
      </Anchor>;
    case 'danger':
      return <><Burst at={target} cardW={geo.cardW} event={event} quality={quiet ? 'reduced' : 'lite'} delay={delay} duration={duration} /><LocalBadge at={target} size={geo.cardW} color="var(--fx-danger)" label="POSLEDNÍ KARTA" detail={event.targetName} quiet={quiet} delay={delay} duration={duration} /></>;
    case 'win':
      return <><Burst at={geo.discard} cardW={geo.cardW} event={event} quality={quality} delay={delay} duration={duration} big /><Burst at={target} cardW={geo.cardW} event={event} quality={quality} delay={delay + .1 * scale} duration={duration * .8} big /><LocalBadge at={target} size={geo.cardW} color="var(--fx-win)" label="VÍTĚZSTVÍ" detail={event.targetName} quiet={quiet} delay={delay + .08 * scale} duration={duration * .85} /></>;
  }
}

/** Stateless renderer: the existing director owns event ordering, identity, TTL and reset. */
export function EffectOrchestrator({ items, geo, me, reduced = false, lite = false }: {
  items: readonly EffectInstance[]; geo: Geometry; me: string; reduced?: boolean; lite?: boolean;
}) {
  useAppearance(p => p.deck);
  const mode = useColorMode(p => p.mode);
  const quality = effectQuality(reduced, lite, geo.compact);
  const visible = items.slice(-EFFECT_BUDGET.concurrent);
  return <div className={`game-fx-layer fx-quality-${quality}`} data-effect-quality={quality} data-color-mode={mode} aria-hidden="true">
    {visible.map((item) => <div className="game-fx-instance" key={item.id} data-effect={item.event.kind}><EffectVisual item={item} geo={geo} me={me} quality={quality} /></div>)}
  </div>;
}
