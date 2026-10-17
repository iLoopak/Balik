import { clientMessageSchema } from '@balik/shared/schema';
import { z } from 'zod';
import type { RoomApplication } from '../application';

const bodySchema = z.object({
  id: z.string().uuid(), code: z.string().regex(/^[A-Z]{4}$/).optional(), connectionId: z.string().uuid(),
  message: z.union([clientMessageSchema, z.object({ t: z.enum(['tick', 'sync']) })]),
});
export interface HttpOptions {
  app: RoomApplication;
  authenticate: (request: Request) => Promise<string | null>;
  allowRequest: (userId: string) => Promise<boolean>;
  origins: string[];
  log?: (error: unknown) => void;
}
export function gameHttpHandler(options: HttpOptions): (request: Request) => Promise<Response> {
  return async (request) => {
    const origin = request.headers.get('origin');
    const allowed = origin !== null && options.origins.includes(origin);
    const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' });
    if (allowed) {
      headers.set('Access-Control-Allow-Origin', origin!);
      headers.set('Access-Control-Allow-Headers', 'authorization, apikey, content-type, x-client-info');
      headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    }
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
    if (origin && !allowed) return json({ error: 'Origin is not allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    try {
      // Verify the access token with the provider. Never accept an actor id from JSON.
      const userId = await options.authenticate(request);
      if (!userId) return json({ error: 'Authentication required' }, 401);
      if (!(await options.allowRequest(userId))) return json({ error: 'Zkus to za chvíli.' }, 429);
      const raw = await request.text();
      if (raw.length > 4096) return json({ error: 'Message too large' }, 413);
      const parsed = bodySchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return json({ error: 'Invalid game request' }, 400);
      return json(await options.app.handle(userId, parsed.data));
    } catch (error) {
      if (error instanceof SyntaxError) return json({ error: 'Invalid JSON' }, 400);
      options.log?.(error);
      return json({ error: 'Server se teď nemůže spojit s úložištěm. Zkus to znovu.' }, 503);
    }
  };
}
