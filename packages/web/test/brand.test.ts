import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BrandAudio } from '../src/brand/audio';
import { BrandMascot, MASCOT_STATES } from '../src/brand/BrandMascot';
import { useBrandPreferences } from '../src/brand/preferences';
import { FeedbackGate } from '../src/brand/feedback';
import { soundForEvent } from '../src/table/feedback';

class FakeSource {
  onended: (() => void) | null = null;
  frequency = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  connect = vi.fn(); disconnect = vi.fn();
  start = vi.fn(); stop = vi.fn();
  type = ''; buffer: unknown;
}
class FakeContext {
  static instances: FakeContext[] = [];
  currentTime = 0; sampleRate = 1000; state = 'suspended'; nodes: FakeSource[] = [];
  destination = {};
  constructor() { FakeContext.instances.push(this); }
  async resume() { this.state = 'running'; }
  createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
  createOscillator() { const node = new FakeSource(); this.nodes.push(node); return node; }
  createBufferSource() { return this.createOscillator(); }
  createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) }; }
}
beforeEach(() => {
  FakeContext.instances = [];
  vi.stubGlobal('window', { AudioContext: FakeContext }); vi.stubGlobal('AudioContext', FakeContext);
  vi.stubGlobal('document', { hidden: false });
  useBrandPreferences.setState({ muted: false, volume: .35, mascot: true });
});
afterEach(() => vi.unstubAllGlobals());

describe('original brand feedback', () => {
  it('creates no audio until unlocked, obeys mute, and never queues sound while suspended', async () => {
    const audio = new BrandAudio(); audio.play('play');
    expect(FakeContext.instances).toHaveLength(0);
    await audio.unlock(); const context = FakeContext.instances[0]!;
    audio.play('play'); expect(context.nodes).toHaveLength(2);
    context.currentTime++;
    useBrandPreferences.setState({ muted: true }); audio.play('win');
    expect(context.nodes).toHaveLength(2);
    useBrandPreferences.setState({ muted: false }); context.state = 'suspended'; audio.play('draw');
    expect(context.nodes).toHaveLength(2);
    audio.cancel(); expect(context.nodes.every((node) => node.stop.mock.calls.length === 2)).toBe(true);
  });
  it('silently supports browsers without Web Audio', async () => {
    vi.stubGlobal('window', {}); const audio = new BrandAudio();
    await expect(audio.unlock()).resolves.toBeUndefined(); expect(() => audio.play('tap')).not.toThrow();
  });
  it('deduplicates confirmed cues and separates special, ordinary and outcome sounds', () => {
    const gate = new FeedbackGate(); const play = vi.fn();
    expect(gate.once('room:round:seq', play)).toBe(true);
    expect(gate.once('room:round:seq', play)).toBe(false); expect(play).toHaveBeenCalledTimes(1);
    expect(soundForEvent({ type: 'drawPenalty', seq: 2, targetPlayerId: 'b', total: 4 }, 'a')?.kind).toBe('special');
    expect(soundForEvent({ type: 'cardsDrawn', seq: 3, playerId: 'a', count: 1, reason: 'normal' }, 'a')?.kind).toBe('draw');
    expect(soundForEvent({ type: 'roundWon', seq: 4, playerId: 'b' }, 'a')?.kind).toBe('lose');
    expect(soundForEvent({ type: 'roundWon', seq: 4, playerId: 'a' }, 'a')?.kind).toBe('win');
  });
  it('renders six independent vector states and honors reduced motion and hiding', () => {
    for (const state of MASCOT_STATES) {
      const html = renderToStaticMarkup(createElement(BrandMascot, { state, reduced: true }));
      expect(html).toContain(`data-state="${state}"`); expect(html).toContain('blik-quiet');
      expect(html).toContain('blik-flap'); expect(html).toContain('blik-eyes'); expect(html).not.toContain('<image');
    }
    useBrandPreferences.setState({ mascot: false });
    expect(useBrandPreferences.getState().mascot).toBe(false);
    expect(renderToStaticMarkup(createElement(BrandMascot, { hidden: true }))).toBe('');
  });
});
