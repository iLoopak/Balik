import type { ClientMessage, ServerMessage } from '@balik/shared';

/** Presentation knows this port, never a provider SDK or database schema. */
export interface TransportEvents {
  open(): void;
  message(message: ServerMessage): void;
  close(): void;
  error(message: string): void;
}
export interface GameTransport {
  readonly ready: boolean;
  connect(events: TransportEvents): void;
  send(message: ClientMessage): boolean;
  close(): void;
}
