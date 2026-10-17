import type { SeqEvent } from '@balik/shared';
import type { SoundCue } from '../brand/feedback';
import { EFFECT_TIMING } from '../effects/effectTokens';
/** Game-specific mapping points toward generic brand sounds, never the other way round. */
export function soundForEvent(event: SeqEvent, me: string): SoundCue | undefined {
  const kind = event.type === 'cardPlayed' ? 'play' : event.type === 'cardsDrawn' && event.count > 0 ? 'draw' :
    event.type === 'suitChanged' ? 'suit' : event.type === 'drawPenalty' || event.type === 'turnSkipped' ? 'special' :
    event.type === 'roundWon' ? event.playerId === me ? 'win' : 'lose' : undefined;
  return kind ? { id: String(event.seq), kind, delay: event.type === 'cardPlayed' ? EFFECT_TIMING.flight : 0 } : undefined;
}
