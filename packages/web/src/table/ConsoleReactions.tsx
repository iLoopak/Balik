import type { CSSProperties } from 'react';
import type { GameId } from '@balik/shared';
import type { Geometry } from './layout';
import { consolePocket, environmentRoute, type EnvironmentPulse } from './environment';

/** Existing cue ids own these keyed one-shot reactions. No gameplay or completion callback. */
export function ConsoleReactions({
  geo,
  pulses,
  game,
  quiet,
  you,
}: {
  geo: Geometry;
  pulses: readonly EnvironmentPulse[];
  game: GameId;
  quiet: boolean;
  you: string;
}) {
  const visible = pulses.slice(quiet ? -1 : geo.compact ? -2 : -4);
  return (
    <div
      className={`console-reactions${quiet ? ' console-reactions-quiet' : ''}`}
      data-console-motion={quiet ? 'static' : 'on'}
    >
      {visible.map((pulse) => {
        const route = environmentRoute(geo, pulse, game, you);
        const pocket = consolePocket(
          geo,
          game,
          (pulse.kind === 'draw' || pulse.kind === 'deal') && game !== 'lhar' ? 'draw' : 'play',
        );
        return (
          <div
            key={pulse.id}
            className={`console-reaction console-reaction-${pulse.kind}`}
            data-console-reaction={pulse.kind}
            style={{ '--console-pace': pulse.scale ?? 1 } as CSSProperties}
          >
            {route && (
              <svg
                className="console-route-layer"
                viewBox={`0 0 ${geo.w} ${geo.h}`}
                preserveAspectRatio="none"
              >
                <path className="console-guide-bed" d={route} />
                <path className="console-guide-charge" pathLength="100" d={route} />
              </svg>
            )}
            <span
              className="console-slot-receive"
              style={{ left: pocket.x, top: pocket.y, width: pocket.width, height: pocket.height }}
            />
            {pulse.kind === 'win' && (
              <span
                className="console-celebration"
                style={{ left: geo.w / 2, top: geo.discard.y, width: geo.w * 0.92, height: geo.pileH * 1.9 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
