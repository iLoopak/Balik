import type { ClientMessage, ServerMessage } from '@balik/shared';
import type { GameTransport, TransportEvents } from './types';

export class WebSocketTransport implements GameTransport {
  private socket: WebSocket | null = null;
  constructor(private readonly url: string) {}
  get ready() { return this.socket?.readyState === WebSocket.OPEN; }
  connect(events: TransportEvents) {
    const socket = new WebSocket(this.url);
    this.socket = socket;
    socket.onopen = () => events.open();
    socket.onclose = () => events.close();
    socket.onmessage = ({ data }) => {
      let message: ServerMessage;
      try { message = JSON.parse(data as string) as ServerMessage; } catch { return; }
      events.message(message);
    };
  }
  send(message: ClientMessage): boolean {
    if (!this.ready) return false;
    this.socket!.send(JSON.stringify(message)); return true;
  }
  close() { this.socket?.close(); }
}
