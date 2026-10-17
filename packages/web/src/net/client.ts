import type { ClientMessage, PrsiAction, ServerMessage } from '@balik/shared';
import { forgetRoom, getToken, rememberRoom, saveName } from '../lib/identity';
import { navigate, showToast, useApp } from './store';

export type StateMessage = Extract<ServerMessage, { t: 'state' }>;
type Intent = { kind: 'create'; name: string; bots: number } | { kind: 'join'; code: string; name: string };

const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ??
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

const PING_MS = 15_000;
const SILENCE_MS = 40_000;
const PENDING_TIMEOUT_MS = 5_000;

const listeners = new Set<(msg: StateMessage) => void>();
let ws: WebSocket | null = null;
let intent: Intent | null = null;
let attempt = 0;
let retryTimer: number | undefined;
let pingTimer: number | undefined;
let pendingTimer: number | undefined;
let lastMessageAt = 0;

let lastState: StateMessage | null = null;

/** The most recent state message — lets a freshly mounted table animate the message that mounted it. */
export function getLastStateMessage(): StateMessage | null {
  return lastState;
}

/** Subscribe to game state messages (the table's animation director listens here). */
export function onStateMessage(listener: (msg: StateMessage) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `bots` > 0 starts a single-player game against computer opponents right away. */
export function createRoom(name: string, bots = 0) {
  saveName(name);
  intent = { kind: 'create', name, bots };
  useApp.setState({ joinError: null });
  sendIntentOrConnect();
}

export function joinRoom(code: string, name: string) {
  saveName(name);
  intent = { kind: 'join', code, name };
  useApp.setState({ joinError: null });
  sendIntentOrConnect();
}

export function leaveRoom() {
  const code = useApp.getState().room?.code;
  if (code) forgetRoom(code);
  send({ t: 'leave' });
  intent = null;
  useApp.setState({ room: null, pending: false });
  navigate('/');
}

export function startGame() {
  sendGuarded({ t: 'start' });
}

export function addBot() {
  sendGuarded({ t: 'addBot' });
}

export function removeBot(playerId: string) {
  sendGuarded({ t: 'removeBot', playerId });
}

export function rematch() {
  sendGuarded({ t: 'rematch' });
}

export function sendAction(action: PrsiAction): boolean {
  const room = useApp.getState().room;
  if (!room) return false;
  return sendGuarded({ t: 'act', baseSeq: room.seq, action });
}

/** Sends a game command at most once until the server answers. */
function sendGuarded(msg: ClientMessage): boolean {
  if (useApp.getState().pending) return false;
  if (!send(msg)) {
    showToast('Nejsi připojen — zkouším to znovu…', 'error');
    return false;
  }
  useApp.setState({ pending: true });
  window.clearTimeout(pendingTimer);
  pendingTimer = window.setTimeout(() => useApp.setState({ pending: false }), PENDING_TIMEOUT_MS);
  return true;
}

function send(msg: ClientMessage): boolean {
  if (ws?.readyState !== WebSocket.OPEN) return false;
  ws.send(JSON.stringify(msg));
  return true;
}

function sendIntentOrConnect() {
  if (ws?.readyState === WebSocket.OPEN) sendIntent();
  else connect();
}

function sendIntent() {
  if (!intent) return;
  const token = getToken();
  if (intent.kind === 'create') send({ t: 'create', token, name: intent.name, bots: intent.bots || undefined });
  else send({ t: 'join', token, name: intent.name, code: intent.code });
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  window.clearTimeout(retryTimer);
  useApp.setState({ status: attempt > 0 || useApp.getState().room ? 'reconnecting' : 'connecting' });
  const socket = new WebSocket(WS_URL);
  ws = socket;

  socket.onopen = () => {
    attempt = 0;
    lastMessageAt = Date.now();
    useApp.setState({ status: 'open' });
    sendIntent();
    window.clearInterval(pingTimer);
    pingTimer = window.setInterval(() => {
      if (Date.now() - lastMessageAt > SILENCE_MS) socket.close();
      else send({ t: 'ping' });
    }, PING_MS);
  };
  socket.onmessage = (e) => {
    lastMessageAt = Date.now();
    let msg: ServerMessage;
    try {
      msg = JSON.parse(e.data as string) as ServerMessage;
    } catch {
      return;
    }
    handle(msg);
  };
  socket.onclose = () => {
    if (ws !== socket) return;
    ws = null;
    window.clearInterval(pingTimer);
    if (useApp.getState().status === 'replaced') return;
    if (!intent) {
      useApp.setState({ status: 'idle' });
      return;
    }
    useApp.setState({ status: 'reconnecting', pending: false });
    const delay = Math.min(500 * 2 ** attempt, 5000);
    attempt++;
    retryTimer = window.setTimeout(connect, delay);
  };
}

function handle(msg: ServerMessage) {
  switch (msg.t) {
    case 'state': {
      lastState = msg;
      const code = msg.room.code;
      rememberRoom(code);
      // After creating, reconnects must rejoin the created room.
      if (intent) intent = { kind: 'join', code, name: intent.name };
      useApp.setState({ room: msg.room, pending: false, joinError: null });
      navigate(`/r/${code}`, true);
      for (const l of listeners) l(msg);
      return;
    }
    case 'error': {
      useApp.setState({ pending: false });
      if (msg.code === 'stale') return; // a fresh state is already on its way
      const inRoom = !!useApp.getState().room;
      if (!inRoom && (msg.code === 'room-not-found' || msg.code === 'room-full' || msg.code === 'game-in-progress')) {
        intent = null;
        useApp.setState({ joinError: { code: msg.code, message: msg.message } });
        return;
      }
      if (msg.code === 'not-in-room') {
        // Our seat was freed (e.g. long disconnect) — try to rejoin as a new player.
        sendIntent();
        return;
      }
      showToast(msg.message, 'error');
      return;
    }
    case 'left':
      useApp.setState({ room: null });
      return;
    case 'replaced':
      intent = null;
      useApp.setState({ status: 'replaced', room: null });
      ws?.close();
      return;
    case 'pong':
      return;
  }
}

/** Reconnect immediately when the tab comes back or the network returns. */
function wake() {
  if (intent && !ws && useApp.getState().status !== 'replaced') {
    attempt = 0;
    connect();
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') wake();
});
window.addEventListener('online', wake);
