import { useBrandPreferences } from './preferences';
import { SOUND_RECIPES, type SoundKind } from './tokens';

/** Original synthesized paper clicks + soft triangle tones. No downloaded samples or music. */
export class BrandAudio {
  private context: AudioContext | null = null;
  private unlocked = false;
  private lastPlay = -Infinity;
  private sources = new Set<AudioScheduledSourceNode>();
  async unlock() {
    if (typeof window === 'undefined' || !window.AudioContext) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state !== 'running') await this.context.resume();
      this.unlocked = this.context.state === 'running';
    } catch { this.unlocked = false; }
  }
  play(kind: SoundKind, delay = 0) {
    const pref = useBrandPreferences.getState();
    const context = this.context;
    if (!context || !this.unlocked || context.state !== 'running' || pref.muted || pref.volume <= 0 || document.hidden) return;
    const now = context.currentTime;
    if (now - this.lastPlay < .035 || this.sources.size > 16) return;
    this.lastPlay = now;
    const recipe = SOUND_RECIPES[kind];
    const start = now + delay;
    const gain = context.createGain(); gain.connect(context.destination);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(pref.volume * .20, start + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, start + recipe.duration);
    const tone = context.createOscillator(); tone.type = 'triangle';
    tone.frequency.setValueAtTime(recipe.frequency, start);
    tone.frequency.exponentialRampToValueAtTime(recipe.end, start + recipe.duration);
    tone.connect(gain);
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * recipe.duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    // Deterministic local texture; independent of the game's RNG.
    for (let i = 0; i < samples.length; i++) samples[i] = Math.sin(i * 123.4567) * Math.cos(i * 3.713) * recipe.noise;
    const paper = context.createBufferSource(); paper.buffer = buffer; paper.connect(gain);
    let remaining = 2;
    for (const source of [tone, paper]) {
      this.sources.add(source);
      source.onended = () => { source.disconnect(); this.sources.delete(source); if (--remaining === 0) gain.disconnect(); };
      source.start(start); source.stop(start + recipe.duration);
    }
  }
  cancel() {
    for (const source of this.sources) { try { source.stop(); } catch { /* Already ended. */ } }
    this.sources.clear();
  }
}
export const brandAudio = new BrandAudio();
