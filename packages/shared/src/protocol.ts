import type { LharClientEvent, LharView } from './lhar/types';
import type { EveningView } from './evening';
import type { GameId } from './games';
import type { SedmaClientEvent, SedmaView } from './sedma/types';
import type { PrsiClientEvent, PrsiView } from './prsi/types';
import type { EmoteMessage } from './social';
import type { AvatarId } from './avatars';
import type { ExtraClientEvent, ExtraViews } from './extra';

// ---- Room / transport layer. Game specifics are confined to `game` + `events`. ----

export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const MAX_NAME_LENGTH = 20;
export const MAX_BOTS = 3;
export const ROOM_MAX_PLAYERS = 4;

export type RoomStatus = 'lobby' | 'playing' | 'finished';

export interface RoomPlayerView {
  id: string;
  name: string;
  connected: boolean;
  wins: number;
  bot: boolean;
  avatarId?: AvatarId;
}

export interface RoomView<G extends GameId = 'prsi'> {
  code: string;
  gameId: G;
  sedmaBonus?: 0 | 10;
  evening?: EveningView;
  /** Public id of the receiving player. */
  you: string;
  hostId: string;
  status: RoomStatus;
  /** Seat order. */
  players: RoomPlayerView[];
  round: number;
  /** Sequence number of the last game event; actions must reference it. */
  seq: number;
  game: GameViews[G] | null;
}

/** Per-game view type; added games extend `ExtraViews`. */
export interface GameViews extends ExtraViews { prsi: PrsiView; sedma: SedmaView; lhar: LharView }

export type AnyRoomView = { [K in GameId]: RoomView<K> }[GameId];
export type GameSeqEvent = (LharClientEvent & { seq: number }) | SeqEvent | (SedmaClientEvent & { seq: number }) | (ExtraClientEvent & { seq: number });
export type SeqEvent = PrsiClientEvent & { seq: number };

export type ServerMessage =
  | EmoteMessage
  | {
      t: 'state';
      room: AnyRoomView;
      /** Events since the previous message, in order. Empty for pure presence updates. */
      events: GameSeqEvent[];
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
