import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ServerMessage } from '@balik/shared';
import { clientMessageSchema } from '@balik/shared/schema';
import { RoomManager, type Conn } from './rooms';

const WEB_DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist');
const MAX_MESSAGE_BYTES = 4096;
const MAX_MESSAGES_PER_SECOND = 20;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

interface Socket extends WebSocket {
  alive?: boolean;
}

export interface StartOptions {
  port?: number;
  host?: string;
  log?: (msg: string) => void;
}

export function startServer(options: StartOptions = {}): Promise<{ port: number; rooms: RoomManager; close: () => Promise<void> }> {
  const log = options.log ?? (() => {});
  const rooms = new RoomManager({ log });

  // Serves the built web app (production). In development Vite serves it and proxies /ws here.
  const http = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, rooms: rooms.roomCount }));
      return;
    }
    if (!existsSync(WEB_DIST)) {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('BALÍK server běží. Web spusť přes `npm run dev` nebo jej sestav `npm run build`.');
      return;
    }
    let pathname = '/';
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      // Malformed escape sequence: fall through to index.html.
    }
    let file = join(WEB_DIST, normalize(pathname));
    if (!file.startsWith(WEB_DIST) || !existsSync(file) || statSync(file).isDirectory()) {
      file = join(WEB_DIST, 'index.html'); // SPA fallback, e.g. /r/ABCD
    }
    const ext = extname(file);
    res.writeHead(200, {
      'content-type': MIME[ext] ?? 'application/octet-stream',
      'cache-control': file.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    createReadStream(file).pipe(res);
  });

  const wss = new WebSocketServer({ server: http, path: '/ws', maxPayload: MAX_MESSAGE_BYTES });

  wss.on('connection', (ws: Socket) => {
    ws.alive = true;
    const conn: Conn = {
      send(msg: ServerMessage) {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
      },
    };
    let windowStart = Date.now();
    let count = 0;

    ws.on('pong', () => (ws.alive = true));
    ws.on('message', (data) => {
      const now = Date.now();
      if (now - windowStart > 1000) {
        windowStart = now;
        count = 0;
      }
      if (++count > MAX_MESSAGES_PER_SECOND) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        return conn.send({ t: 'error', code: 'bad-message', message: 'Neplatná zpráva.' });
      }
      const msg = clientMessageSchema.safeParse(parsed);
      if (!msg.success) return conn.send({ t: 'error', code: 'bad-message', message: 'Neplatná zpráva.' });
      rooms.handle(conn, msg.data);
    });
    ws.on('close', () => rooms.disconnect(conn));
    ws.on('error', () => rooms.disconnect(conn));
  });

  // Heartbeat: drop dead sockets so their seats show as disconnected.
  const heartbeat = setInterval(() => {
    for (const client of wss.clients as Set<Socket>) {
      if (!client.alive) {
        client.terminate();
        continue;
      }
      client.alive = false;
      client.ping();
    }
  }, 15_000);
  const sweeper = setInterval(() => rooms.sweep(), 5_000);

  return new Promise((resolveStart) => {
    http.listen(options.port ?? 0, options.host ?? '0.0.0.0', () => {
      const address = http.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolveStart({
        port,
        rooms,
        close: () =>
          new Promise<void>((done) => {
            clearInterval(heartbeat);
            clearInterval(sweeper);
            for (const client of wss.clients) client.terminate();
            wss.close();
            http.close(() => done());
          }),
      });
    });
  });
}
