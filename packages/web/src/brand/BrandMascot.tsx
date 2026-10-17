import { useBrandPreferences } from './preferences';
import { useMotionPref } from '../lib/motionPref';
import './brand.css';
import type { CSSProperties } from 'react';
import { BRAND_MOTION } from './tokens';

export const MASCOT_STATES = ['idle', 'deal', 'surprised', 'celebrate', 'sad', 'thinking'] as const;
export type MascotState = typeof MASCOT_STATES[number];
/** BLIK: platform mascot, independent of any game/deck. `decorative=false` supplies a label. */
export function BrandMascot({ state = 'idle', size = 72, reduced = false, decorative = true, hidden = false }: {
  state?: MascotState; size?: number; reduced?: boolean; decorative?: boolean; hidden?: boolean;
}) {
  const visible = useBrandPreferences((p) => p.mascot);
  const motion = useMotionPref();
  if (!visible || hidden) return null;
  const quiet = reduced || motion.reduced;
  const mouth = state === 'surprised' ? 'M55 91a5 7 0 1 0 10 0a5 7 0 1 0-10 0' : state === 'sad' ? 'M49 97q11-10 22 0' : state === 'celebrate' ? 'M45 90q15 19 30 0' : 'M49 91q11 11 22 0';
  return <svg className={`brand-mascot blik-${state}${quiet ? ' blik-quiet' : ''}`} data-state={state}
    viewBox="0 0 120 140" width={size} height={size * 140 / 120} style={{ '--blik-ritual': `${BRAND_MOTION.ritual}s` } as CSSProperties}
    role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : `BLIK · ${state}`}>
    <ellipse className="blik-shadow" cx="60" cy="129" rx="37" ry="6" fill="#000" opacity=".2" />
    <g className="blik-body">
      <g className="blik-cards" fill="#f3efe6" stroke="#182235" strokeWidth="3"><rect x="30" y="23" width="54" height="77" rx="7" transform="rotate(-9 57 61)" /><rect x="37" y="19" width="54" height="77" rx="7" transform="rotate(8 64 58)" /><path d="M49 35h27M49 44h18" stroke="#ffb23f" strokeLinecap="round" /></g>
      <path d="M17 54q0-12 13-12h60q13 0 13 12v61q0 12-13 12H30q-13 0-13-12Z" fill="#182235" stroke="#f3efe6" strokeWidth="2.5" />
      <path d="M25 59v53q0 7 8 7h54" fill="none" stroke="#39465b" strokeWidth="2" />
      <g className="blik-flap"><path d="M17 52V41q0-11 13-11h60q13 0 13 11v11L67 67a18 18 0 0 1-14 0Z" fill="#ffb23f" stroke="#182235" strokeWidth="3" /><path d="M48 43h24" stroke="#2a1a00" strokeWidth="3" strokeLinecap="round" /></g>
      <g className="blik-eyes"><rect x="34" y={state === 'sad' ? 78 : 73} width="19" height={state === 'sad' ? 11 : 20} rx="9" fill="#f3efe6" /><rect x="67" y={state === 'sad' ? 78 : 73} width="19" height={state === 'sad' ? 11 : 20} rx="9" fill="#f3efe6" /><g className="blik-pupils" fill="#182235"><rect x="43" y={state === 'sad' ? 80 : 78} width="7" height={state === 'sad' ? 7 : 11} rx="3.5" /><rect x="70" y={state === 'sad' ? 80 : 78} width="7" height={state === 'sad' ? 7 : 11} rx="3.5" /></g></g>
      <path d={mouth} fill={state === 'surprised' ? '#f3efe6' : 'none'} stroke="#f3efe6" strokeWidth="2.5" strokeLinecap="round" />
      <path className="blik-brow" d="m31 69 22 3m15 0 20-7" stroke="#ffb23f" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 112h16" stroke="#ffb23f" strokeWidth="3" strokeLinecap="round" />
    </g>
  </svg>;
}
