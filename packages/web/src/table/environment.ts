import type { GameId, Suit } from '@balik/shared';
import type { EffectInstance } from '../effects/effectEvents';
import type { Geometry, Pt } from './layout';
export type EnvironmentKind =
  | 'play'
  | 'draw'
  | 'deal'
  | 'collect'
  | 'suit'
  | 'penalty'
  | 'skip'
  | 'challenge'
  | 'reveal'
  | 'win';
/** Public semantic cues only: no card identity, claim truth, hand or transport state. */
export interface EnvironmentSignal {
  kind: EnvironmentKind;
  sourcePlayerId?: string;
  targetPlayerId?: string;
  scale?: number;
}
export interface EnvironmentPulse extends EnvironmentSignal {
  id: number;
}
export const CONSOLE_LABELS: Record<GameId, { input: string | null; output: string }> = {
  prsi: { input: 'DOBÍRÁNÍ', output: 'ODEHRÁNO' },
  sedma: { input: 'DOBÍRÁNÍ', output: 'ŠTYCH' },
  lhar: { input: null, output: 'TVRZENÍ' },
  snaps: { input: 'TALON', output: 'ŠTYCH' },
  durak: { input: 'TALON', output: 'ÚTOK A OBRANA' },
  marias: { input: 'TALON', output: 'ŠTYCH' },
};
export const MAX_ENVIRONMENT_PULSES = 4;
export const ENVIRONMENT_PULSE_MS = 1100;
/** Receiving pockets follow the card geometry, including Sedma's multi-column trick. */
export function consolePocket(geo: Geometry, game: GameId, kind: 'draw' | 'play') {
  if (kind === 'draw') return { ...geo.deck, width: geo.deckW * 1.36, height: geo.deckH * 1.3 };
  if (geo.stage) return { ...geo.discard, ...geo.stage };
  if (game === 'sedma') {
    const players = Object.keys(geo.seats).length + 1;
    const scale = geo.compact ? 0.82 : 1;
    const step = Math.min(
      geo.cardW * (geo.compact ? 0.88 : 1.12),
      (geo.w - geo.cardW * scale - 20) / Math.max(1, players - 1),
    );
    return {
      ...geo.discard,
      width: Math.min(geo.w - 12, (players - 1) * step + geo.cardW * scale * 1.22),
      height: geo.cardH * scale * 1.3,
    };
  }
  return { ...geo.discard, width: geo.pileW * 1.36, height: geo.pileH * 1.3 };
}
export function environmentFromEffects(items: readonly EffectInstance[]): EnvironmentPulse[] {
  return items
    .flatMap(({ id, event, scale }) =>
      event.kind === 'pause' || event.kind === 'reverse' || event.kind === 'danger'
        ? []
        : [
            {
              id,
              kind: event.kind,
              sourcePlayerId: event.sourcePlayerId,
              targetPlayerId: event.targetPlayerId,
              scale,
            },
          ],
    )
    .slice(-MAX_ENVIRONMENT_PULSES);
}
export function environmentPlayerAnchor(geo: Geometry, playerId?: string, me = 'me'): Pt {
  if (playerId && geo.seats[playerId]) return geo.seats[playerId]!;
  return !playerId || playerId === me ? { x: geo.w / 2, y: geo.handTop + geo.cardH * 0.25 } : geo.discard;
}
export function environmentRoute(
  geo: Geometry,
  pulse: EnvironmentSignal,
  game: GameId,
  me = 'me',
): string | null {
  let from: Pt, to: Pt;
  if (pulse.kind === 'play') {
    from = environmentPlayerAnchor(geo, pulse.sourcePlayerId, me);
    to = geo.discard;
  } else if (pulse.kind === 'draw' || pulse.kind === 'deal') {
    from = game === 'lhar' ? geo.discard : geo.deck;
    to = environmentPlayerAnchor(geo, pulse.targetPlayerId, me);
  } else if (pulse.kind === 'collect' || pulse.kind === 'penalty') {
    from = geo.discard;
    to = environmentPlayerAnchor(geo, pulse.targetPlayerId, me);
  } else return null;
  const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - geo.cardH * 0.2 };
  return `M${from.x} ${from.y} Q${mid.x} ${mid.y} ${to.x} ${to.y}`;
}
/** Finite local decoration. It never waits for an animation to permit a game action. */
export class EnvironmentSignalQueue {
  private nextId = 0;
  private generation = 0;
  private pulses: EnvironmentPulse[] = [];
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  constructor(private readonly changed: (pulses: readonly EnvironmentPulse[]) => void) {}
  emit = (signal: EnvironmentSignal) => {
    const scale = Number.isFinite(signal.scale) ? Math.min(1, Math.max(0.1, signal.scale!)) : 1;
    const pulse: EnvironmentPulse = {
      scale,
      id: ++this.nextId,
      kind: signal.kind,
      sourcePlayerId: signal.sourcePlayerId,
      targetPlayerId: signal.targetPlayerId,
    };
    this.pulses = [...this.pulses, pulse].slice(-MAX_ENVIRONMENT_PULSES);
    for (const [id, timer] of this.timers)
      if (!this.pulses.some((p) => p.id === id)) {
        clearTimeout(timer);
        this.timers.delete(id);
      }
    const generation = this.generation;
    this.timers.set(
      pulse.id,
      setTimeout(
        () => {
          if (generation !== this.generation) return;
          this.timers.delete(pulse.id);
          this.pulses = this.pulses.filter((p) => p.id !== pulse.id);
          this.changed([...this.pulses]);
        },
        Math.max(450, ENVIRONMENT_PULSE_MS * scale),
      ),
    );
    this.changed([...this.pulses]);
  };
  clear = (notify = true) => {
    this.generation++;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.pulses = [];
    if (notify) this.changed([]);
  };
}
