import { describe, expect, it } from 'vitest';
import { DeliveryCursor } from '../src/net/transports/journal';
import type { Frame } from '../../backend/src/model';
const frame = (revision: number, seq: number, events: Frame['message']['events'] = []): Frame => ({
  revision, wakeAt: null, connectionId: 'connection', message: { t: 'state', reset: false, events,
    room: { code: 'ABCD', gameId: 'prsi', you: 'a', hostId: 'a', status: 'lobby', players: [], round: 0, seq, game: null },
  },
});
describe('ordered transport delivery', () => {
  it('does not replay old deliveries or regress to a late HTTP snapshot', () => {
    const cursor = new DeliveryCursor();
    expect(cursor.accept(frame(2, 2), true)?.reset).toBe(true);
    const next = frame(3, 3, [{ type: 'turnChanged', seq: 3, playerId: 'b' }]);
    expect(cursor.accept(next)?.reset).toBe(false);
    expect(cursor.accept(next)).toBeNull();
    expect(cursor.accept(frame(2, 2), true)).toBeNull();
    expect(cursor.revision).toBe(3);
  });
  it('reconciles a missing journal interval without animating incomplete events', () => {
    const cursor = new DeliveryCursor(); cursor.accept(frame(1, 2), true);
    const result = cursor.accept(frame(8, 9, [{ type: 'turnChanged', seq: 9, playerId: 'b' }]));
    expect(result?.reset).toBe(true);
    expect(result?.events).toEqual([]);
  });
});
