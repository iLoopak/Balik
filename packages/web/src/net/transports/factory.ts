import { getToken } from '../../lib/identity';
import type { GameTransport } from './types';
import { WebSocketTransport } from './websocket';

export async function createGameTransport(): Promise<GameTransport> {
  const backend = import.meta.env.VITE_GAME_BACKEND?.trim() || 'websocket';
  if (backend === 'supabase') {
    const url = import.meta.env.VITE_SUPABASE_URL?.trim();
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
    if (!url || !key) throw new Error('Chybí konfigurace Supabase: URL a veřejný klíč.');
    const { SupabaseTransport } = await import('./supabase');
    return new SupabaseTransport(url, key, getToken());
  }
  if (backend !== 'websocket') throw new Error(`Neznámý backend: ${backend}`);
  const url = import.meta.env.VITE_WS_URL?.trim() || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;
  return new WebSocketTransport(url);
}
