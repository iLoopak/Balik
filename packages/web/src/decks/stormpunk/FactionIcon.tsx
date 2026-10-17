import type { CSSProperties } from 'react';
import type { FactionId } from './tokens';

const PATHS: Record<FactionId, string> = {
  vyhen: 'M12 2C13 7 19 8 19 14a7 7 0 0 1-14 0c0-3 2-5 4-7-1 4 1 5 2 6 2-3 2-7 1-11Z',
  pohyb: 'M2 9h5m10 0h5M2 15h5m10 0h5M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z',
  podrost: 'm4 20 2-12L20 4l-4 14L4 20Zm0 0L15 9',
  boure: 'M5 14a4 4 0 0 1 0-8 6 6 0 0 1 11-1 4.5 4.5 0 0 1 3 9h-5m-3-3-4 6h5l-2 5 7-8h-5l2-3',
};

export function FactionIcon({ faction, className, style, title }: {
  faction: FactionId; className?: string; style?: CSSProperties; title?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <path d={PATHS[faction]} fill={faction === 'vyhen' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
