import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { ClientMessage } from '@balik/shared';
import type { Frame, Reply } from '../../../../backend/src/model';
import { DeliveryCursor } from './journal';
import type { GameTransport, TransportEvents } from './types';

export class SupabaseTransport implements GameTransport {
  private client: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private events: TransportEvents | null = null;
  private disposed = false;
  private opened = false;
  private cursor = new DeliveryCursor();
  private commands: Promise<void> = Promise.resolve();
  private draining: Promise<void> | null = null;
  private drainAgain = false;
  private changingRoom = false;
  private wakeTimer: ReturnType<typeof setTimeout> | undefined;
  private recoveryTimer: ReturnType<typeof setInterval> | undefined;
  private userId: string | null = null;
  private connectionId = crypto.randomUUID();
  constructor(private readonly url: string, private readonly key: string, tabId: string) {
    // Preserve account-less, per-tab players and reload reconnects; do not share Auth across tabs.
    const memory = new Map<string, string>();
    this.client = createClient(url, key, { auth: {
      storageKey: `balik.supabase.${tabId}`, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
      storage: {
        getItem: (name) => { try { return sessionStorage.getItem(name); } catch { return memory.get(name) ?? null; } },
        setItem: (name, value) => { memory.set(name, value); try { sessionStorage.setItem(name, value); } catch { /* memory fallback */ } },
        removeItem: (name) => { memory.delete(name); try { sessionStorage.removeItem(name); } catch { /* memory fallback */ } },
      },
    } });
  }
  get ready() { return this.opened && !this.disposed; }
  connect(events: TransportEvents) {
    this.events = events;
    void this.initialize().catch(() => this.fail('Připojení k Supabase se nezdařilo. Zkontroluj nastavení a povolené anonymní přihlášení.'));
  }
  private async initialize() {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    const session = data.session ?? (await this.client.auth.signInAnonymously()).data.session;
    if (!session) throw new Error('Anonymous authentication failed');
    if (this.disposed) return;
    this.userId = session.user.id;
    await this.client.realtime.setAuth(session.access_token);
    this.channel = this.client.channel(`balik-delivery:${this.userId}`)
      .on('system', {}, () => { void this.drain().catch(() => this.fail('Nepodařilo se obnovit stav hry.')); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'balik_player_messages', filter: `user_id=eq.${this.userId}` }, () => {
        void this.drain().catch(() => this.fail('Nepodařilo se načíst stav hry. Obnovuji spojení…'));
      })
      .subscribe((status) => {
        if (this.disposed) return;
        if (status === 'SUBSCRIBED' && !this.opened) {
          this.opened = true; this.events?.open();
          // Notifications can be missed during subscription setup or a network transition.
          this.recoveryTimer = setInterval(() => { void this.drain().catch(() => this.fail('Nepodařilo se obnovit stav hry.')); }, 5000);
        }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') this.fail('Spojení se přerušilo. Zkouším to znovu…');
      });
  }
  send(message: ClientMessage): boolean {
    if (!this.ready) return false;
    this.enqueue(message); return true;
  }
  private enqueue(message: ClientMessage | { t: 'tick' }) {
    this.commands = this.commands.then(async () => {
      if (this.disposed) return;
      const intent = message.t === 'create' || message.t === 'join';
      this.changingRoom = intent;
      try {
        const reply = await this.invoke({ id: crypto.randomUUID(), connectionId: this.connectionId, code: this.cursor.code ?? undefined, message });
        if (this.disposed) return;
        if (reply.frame && (intent || reply.message?.t === 'error')) this.deliver(reply.frame, true);
        this.changingRoom = false;
        if (message.t === 'leave') {
          this.cursor = new DeliveryCursor(); clearTimeout(this.wakeTimer);
        } else await this.drain();
        if (reply.message) this.events?.message(reply.message);
        if (reply.wakeAt !== undefined) this.armWake(reply.wakeAt);
      } finally { this.changingRoom = false; }
    }).catch(() => this.fail('Server neodpovídá. Obnovuji spojení…'));
  }
  private async invoke(body: unknown): Promise<Reply> {
    // Retries carry the same id: an uncertain HTTP response never applies a move twice.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (this.disposed) throw new Error('Transport closed');
      try {
        const { data } = await this.client.auth.getSession();
        const response = await fetch(`${this.url.replace(/\/$/, '')}/functions/v1/game`, {
          method: 'POST', headers: { apikey: this.key, Authorization: `Bearer ${data.session?.access_token ?? ''}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body), signal: AbortSignal.timeout(12_000),
        });
        if (response.ok) return await response.json() as Reply;
        if (response.status < 500 && response.status !== 429) throw new Error(`Configuration or authorization failure (${response.status})`);
      } catch (error) { if (attempt === 2) throw error; }
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
    throw new Error('Game request failed');
  }
  private drain(): Promise<void> {
    this.drainAgain = true;
    if (this.draining) return this.draining;
    this.draining = (async () => {
      while (this.drainAgain && this.ready && this.cursor.code && !this.changingRoom) {
        this.drainAgain = false;
        const code = this.cursor.code;
        const { data, error } = await this.client.from('balik_player_messages').select('frame')
          .eq('user_id', this.userId!).eq('code', code).gt('revision', this.cursor.revision).order('revision').limit(128);
        if (error) throw error;
        if (this.disposed || this.cursor.code !== code || this.changingRoom) return;
        for (const row of data ?? []) this.deliver(row.frame as Frame);
        if (data?.length === 128) this.drainAgain = true;
      }
    })().finally(() => { this.draining = null; });
    return this.draining;
  }
  private deliver(frame: Frame, snapshot = false) {
    if (frame.connectionId !== this.connectionId) { this.events?.message({ t: 'replaced' }); return; }
    const message = this.cursor.accept(frame, snapshot);
    if (!message) return;
    this.events?.message(message); this.armWake(frame.wakeAt);
  }
  private armWake(at: number | null) {
    clearTimeout(this.wakeTimer);
    if (at === null || !this.ready || !this.cursor.code) return;
    this.wakeTimer = setTimeout(() => this.enqueue({ t: 'tick' }), Math.max(100, Math.min(60_000, at - Date.now())));
  }
  private fail(message: string) {
    if (this.disposed) return;
    this.events?.error(message);
    this.close(); this.events?.close();
  }
  close() {
    if (this.disposed) return;
    this.disposed = true; this.opened = false; clearTimeout(this.wakeTimer);
    clearInterval(this.recoveryTimer);
    if (this.channel) void this.client.removeChannel(this.channel);
    this.client.auth.stopAutoRefresh();
  }
}
