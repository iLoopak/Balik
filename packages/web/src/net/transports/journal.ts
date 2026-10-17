import type { Frame } from '../../../../backend/src/model';

/** Duplicate/out-of-order notifications cannot replay events; missing history becomes a snapshot. */
export class DeliveryCursor {
  code: string | null = null;
  revision = 0;
  private seq = 0;
  accept(frame: Frame, snapshot = false): Frame['message'] | null {
    if (frame.message.room.code === this.code && frame.revision <= this.revision) return null;
    if (!snapshot && frame.message.room.code !== this.code) return null;
    const message = structuredClone(frame.message);
    const first = message.events[0]?.seq;
    if (snapshot || (message.room.seq > this.seq && first !== this.seq + 1)) {
      message.reset = true; message.events = [];
    }
    this.code = message.room.code; this.revision = frame.revision; this.seq = message.room.seq;
    return message;
  }
}
