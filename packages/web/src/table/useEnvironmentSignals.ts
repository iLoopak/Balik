import { useEffect, useRef, useState } from 'react';
import { EnvironmentSignalQueue, type EnvironmentPulse } from './environment';
export function useEnvironmentSignals() {
  const [pulses, setPulses] = useState<readonly EnvironmentPulse[]>([]);
  const queue = useRef<EnvironmentSignalQueue | null>(null);
  if (!queue.current) queue.current = new EnvironmentSignalQueue(setPulses);
  const current = queue.current;
  useEffect(() => () => current.clear(false), [current]);
  return { pulses, emitEnvironment: current.emit, clearEnvironment: current.clear };
}
