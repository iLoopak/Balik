import { create } from 'zustand';
import type { ErrorCode, RoomView } from '@balik/shared';

export type ConnStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'replaced';

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'error';
}

interface AppState {
  path: string;
  status: ConnStatus;
  room: RoomView | null;
  /** Fatal problem with joining the current room (room gone, full, …). */
  joinError: { code: ErrorCode; message: string } | null;
  toast: Toast | null;
  /** An action is in flight; blocks double submits. */
  pending: boolean;
}

export const useApp = create<AppState>(() => ({
  path: window.location.pathname,
  status: 'idle',
  room: null,
  joinError: null,
  toast: null,
  pending: false,
}));

let toastId = 0;
export function showToast(text: string, tone: Toast['tone'] = 'info') {
  const id = ++toastId;
  useApp.setState({ toast: { id, text, tone } });
  window.setTimeout(() => {
    if (useApp.getState().toast?.id === id) useApp.setState({ toast: null });
  }, 2600);
}

export function navigate(path: string, replace = false) {
  if (path === window.location.pathname) return;
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  useApp.setState({ path });
}

window.addEventListener('popstate', () => useApp.setState({ path: window.location.pathname }));

export function roomCodeFromPath(path: string): string | null {
  const m = /^\/r\/([A-Za-z]{4})\/?$/.exec(path);
  return m ? m[1]!.toUpperCase() : null;
}
