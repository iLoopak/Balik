import type { Delivery, Reply, Room } from './model';

export interface Commit {
  userId: string;
  requestId: string;
  expectedVersion: number | null;
  room: Room;
  deliveries: Delivery[];
  reply: Reply;
}
/** The transaction must atomically compare version, save room + messages, and record the receipt. */
export interface RoomRepository {
  load(code: string): Promise<Room | null>;
  membership(userId: string): Promise<string | null>;
  receipt(userId: string, requestId: string): Promise<Reply | null>;
  commit(commit: Commit): Promise<{ status: 'ok' | 'conflict' | 'replay'; reply?: Reply }>;
}
