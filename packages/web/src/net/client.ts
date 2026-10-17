import type { AvatarId, ClientMessage, GameAction, GameId, ServerMessage, EmoteMessage, EmoteId } from '@balik/shared';
import { forgetRoom, getToken, rememberRoom, saveName } from '../lib/identity';
import { navigate, showToast, useApp } from './store';
import { createGameTransport } from './transports/factory';
import { useAvatarPreference } from '../avatars/preferences';
import type { GameTransport } from './transports/types';

export type StateMessage = Extract<ServerMessage, { t: 'state' }>;
type Intent = { kind: 'create'; name: string; bots: number; gameId: GameId; sedmaBonus: 0 | 10 } | { kind: 'join'; code: string; name: string };

const PING_MS = 15_000;
const SILENCE_MS = 40_000;
const PENDING_TIMEOUT_MS = 5_000;

const listeners = new Set<(msg: StateMessage) => void>();
const socialListeners = new Set<(msg: EmoteMessage) => void>();
export function onEmote(listener: (msg: EmoteMessage) => void) { socialListeners.add(listener); return () => { socialListeners.delete(listener); }; }
export function sendAvatar(avatarId: AvatarId) { return send({ t: 'profile', avatarId }); }
export function sendEmote(emote: EmoteId) { return send({ t: 'emote', emote }); }
export function returnToLobby() { sendGuarded({ t: 'lobby', round: useApp.getState().room?.round }); }
let transport: GameTransport | null = null;
let connecting = false;
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
export function createRoom(name: string, bots = 0, gameId: GameId = 'prsi', sedmaBonus: 0 | 10 = 10) {
  saveName(name);
  intent = { kind: 'create', name, bots, gameId, sedmaBonus };
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
  sendGuarded({ t: 'start', round: useApp.getState().room?.round });
}

export function addBot() {
  sendGuarded({ t: 'addBot', round: useApp.getState().room?.round });
}

export function removeBot(playerId: string) {
  sendGuarded({ t: 'removeBot', playerId, round: useApp.getState().room?.round });
}

export function rematch() {
  sendGuarded({ t: 'rematch', round: useApp.getState().room?.round });
}

export function eveningAction(action: 'between' | 'openVote' | 'close' | 'confirm', gameId?: GameId) {
  const room = useApp.getState().room;
  if (!room?.evening) return false;
  return sendGuarded({ t: 'evening', baseRevision: room.evening.revision, action, ...(gameId ? { gameId } : {}) });
}
export function voteGame(gameId: GameId) {
  const room = useApp.getState().room;
  if (!room?.evening) return false;
  return sendGuarded({ t: 'vote', ballotId: room.evening.ballotId, gameId });
}

export function sendAction(action: GameAction): boolean {
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
  return transport?.send(msg) ?? false;
}

function sendIntentOrConnect() {
  lastMessageAt = Date.now();
  if (transport?.ready) sendIntent();
  else connect();
}

function sendIntent() {
  if (!intent) return;
  const token = getToken();
  if (intent.kind === 'create') send({ t: 'create', token, avatarId: useAvatarPreference.getState().avatarId, name: intent.name, bots: intent.bots || undefined, gameId: intent.gameId, sedmaBonus: intent.sedmaBonus });
  else send({ t: 'join', token, avatarId: useAvatarPreference.getState().avatarId, name: intent.name, code: intent.code });
}

async function connect() {
  if (transport || connecting) return;
  connecting = true;
  window.clearTimeout(retryTimer);
  useApp.setState({ status: attempt > 0 || useApp.getState().room ? 'reconnecting' : 'connecting' });
  let connection: GameTransport;
  try { connection = await createGameTransport(); }
  catch (error) {
    connecting = false;
    useApp.setState({ status: 'idle' });
    showToast(error instanceof Error ? error.message : 'Chybí nastavení připojení.', 'error');
    return;
  }
  transport = connection;
  connecting = false;
  connection.connect({
    open() {
      attempt = 0;
      lastMessageAt = Date.now();
      useApp.setState({ status: 'open' });
      sendIntent();
      window.clearInterval(pingTimer);
      pingTimer = window.setInterval(() => {
        if (!intent) return;
        if (Date.now() - lastMessageAt > SILENCE_MS) {
          connection.close();
          closed();
        }
        else send({ t: 'ping' });
      }, PING_MS);
    },
    message(msg) {
      lastMessageAt = Date.now();
      handle(msg);
    },
    close: closed,
    error(message) { showToast(message, 'error'); },
  });
  function closed() {
    if (transport !== connection) return;
    transport = null;
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
  }
}

function handle(msg: ServerMessage) {
  switch (msg.t) {
    case 'emote':
      if (intent && msg.code === useApp.getState().room?.code && msg.expiresAt > Date.now()) for (const listener of socialListeners) listener(msg);
      return;
    case 'state': {
      if (!intent) return; // Ignore delayed responses after an explicit leave.
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
      transport?.close();
      transport = null;
      return;
    case 'pong':
      return;
  }
}

/** Reconnect immediately when the tab comes back or the network returns. */
function wake() {
  if (intent && !transport && !connecting && useApp.getState().status !== 'replaced') {
    attempt = 0;
    connect();
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') wake();
});
window.addEventListener('online', wake);
