import type { PrsiClientEvent, PrsiView } from './prsi/types';
import type { EmoteMessage } from './social';

// ---- Room / transport layer. Game specifics are confined to `game` + `events`. ----

export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const MAX_NAME_LENGTH = 20;
export const MAX_BOTS = 3;

export type RoomStatus = 'lobby' | 'playing' | 'finished';

export interface RoomPlayerView {
  id: string;
  name: string;
  connected: boolean;
  wins: number;
  bot: boolean;
}

export interface RoomView {
  code: string;
  gameId: 'prsi';
  /** Public id of the receiving player. */
  you: string;
  hostId: string;
  status: RoomStatus;
  /** Seat order. */
  players: RoomPlayerView[];
  round: number;
  /** Sequence number of the last game event; actions must reference it. */
  seq: number;
  game: PrsiView | null;
}

export type SeqEvent = PrsiClientEvent & { seq: number };

export type ServerMessage =
  | EmoteMessage
  | {
      t: 'state';
      room: RoomView;
      /** Events since the previous message, in order. Empty for pure presence updates. */
      events: SeqEvent[];
      /** True on join/reconnect: render the snapshot directly, don't replay anything. */
      reset: boolean;
    }
  | { t: 'error'; code: ErrorCode; message: string }
  | { t: 'left' }
  | { t: 'replaced' }
  | { t: 'pong' };

export type ErrorCode =
  | 'rate-limited'
  | 'bad-message'
  | 'room-not-found'
  | 'room-full'
  | 'game-in-progress'
  | 'not-in-room'
  | 'not-host'
  | 'not-enough-players'
  | 'stale'
  | 'illegal';

export type { ClientMessage } from './schema';
