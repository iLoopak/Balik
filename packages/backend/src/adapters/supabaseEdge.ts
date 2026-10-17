import { RoomApplication } from '../application';
import { gameHttpHandler } from './http';
import { SupabaseRoomRepository } from './supabaseRepository';

// This entry point is bundled into supabase/functions/game/bundle.js before deployment.
const runtime = (globalThis as unknown as { Deno: {
  env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void;
} }).Deno;
const required = (name: string) => {
  const value = runtime.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};
const url = required('SUPABASE_URL').replace(/\/$/, '');
const key = required('SUPABASE_SERVICE_ROLE_KEY');
const publicKey = required('SUPABASE_ANON_KEY');
const app = new RoomApplication(new SupabaseRoomRepository(url, key), () => ({
  now: Date.now(), id: () => crypto.randomUUID(),
  rng: () => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32,
}));
runtime.serve(gameHttpHandler({
  app,
  origins: required('GAME_ALLOWED_ORIGINS').split(',').map((origin) => origin.trim()).filter(Boolean),
  async authenticate(request) {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return null;
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: publicKey, Authorization: authorization }, signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const user = await response.json() as { id?: string };
    return user.id ?? null;
  },
  async allowRequest(userId) {
    const response = await fetch(`${url}/rest/v1/rpc/balik_allow_request`, {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_user_id: userId }), signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error('Rate limit store unavailable');
    return await response.json() === true;
  },
  log: (error) => console.error(error instanceof Error ? error.message : 'Game request failed'),
}));
