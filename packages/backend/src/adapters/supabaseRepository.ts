import type { Room, Reply } from '../model';
import type { Commit, RoomRepository } from '../ports';

/** Supabase-specific HTTP/RPC paths are contained in this repository adapter. */
export class SupabaseRoomRepository implements RoomRepository {
  constructor(private readonly url: string, private readonly key: string, private readonly request: typeof fetch = fetch) {}
  private async rest(path: string, body?: unknown): Promise<unknown> {
    const response = await this.request(`${this.url}/rest/v1/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { apikey: this.key, Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Room storage request failed (${response.status})`);
    return response.json();
  }
  async load(code: string): Promise<Room | null> {
    const rows = await this.rest(`balik_rooms?code=eq.${encodeURIComponent(code)}&select=state`) as { state: Room }[];
    return rows[0]?.state ?? null;
  }
  async membership(userId: string): Promise<string | null> {
    const rows = await this.rest(`balik_memberships?user_id=eq.${encodeURIComponent(userId)}&select=code`) as { code: string }[];
    return rows[0]?.code ?? null;
  }
  async receipt(userId: string, requestId: string): Promise<Reply | null> {
    const rows = await this.rest(`balik_requests?user_id=eq.${encodeURIComponent(userId)}&request_id=eq.${encodeURIComponent(requestId)}&select=reply`) as { reply: Reply }[];
    return rows[0]?.reply ?? null;
  }
  async commit(value: Commit): Promise<{ status: 'ok' | 'conflict' | 'replay'; reply?: Reply }> {
    return await this.rest('rpc/balik_commit', { p_user_id: value.userId, p_request_id: value.requestId,
      p_expected_version: value.expectedVersion, p_state: value.room,
      p_deliveries: value.deliveries, p_reply: value.reply,
    }) as { status: 'ok' | 'conflict' | 'replay'; reply?: Reply };
  }
}
