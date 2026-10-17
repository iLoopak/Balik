import { useEffect, useState } from 'react';

/**
 * Watches frame times while the table is animating. If the device clearly struggles,
 * switch to a lighter mode for the rest of the session (shorter cues, fewer particles).
 */
export function usePerfLite(active: boolean): boolean {
  const [lite, setLite] = useState(false);
  useEffect(() => {
    if (!active || lite) return;
    let raf = 0;
    let last = performance.now();
    const samples: number[] = [];
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      // Ignore tab switches and other huge pauses.
      if (dt < 250) samples.push(dt);
      if (samples.length >= 90) {
        const sorted = samples.slice().sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)]!;
        if (median > 28) {
          setLite(true);
          return;
        }
        samples.length = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, lite]);
  return lite;
}
