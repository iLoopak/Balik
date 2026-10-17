import type { SoundKind } from './tokens';
export interface SoundCue { id: string; kind: SoundKind; delay: number }
/** Bounded semantic deduplication; StrictMode/remounts do not replay a confirmed event. */
export class FeedbackGate {
  private played = new Set<string>();
  once(key: string, play: () => void): boolean {
    if (this.played.has(key)) return false;
    this.played.add(key);
    if (this.played.size > 512) this.played.delete(this.played.values().next().value!);
    play(); return true;
  }
}
export const feedbackGate = new FeedbackGate();
