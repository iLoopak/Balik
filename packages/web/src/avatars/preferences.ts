import { create } from 'zustand';
import { isAvatarId, PLAYER_AVATAR_IDS, type AvatarId } from '@balik/shared';
export const AVATAR_KEY = 'balik.avatar';
function load(): AvatarId {
  if (typeof window === 'undefined') return 'vega';
  const initial = PLAYER_AVATAR_IDS[Math.floor(Math.random() * PLAYER_AVATAR_IDS.length)]!;
  try {
    const id = localStorage.getItem(AVATAR_KEY);
    if (isAvatarId(id)) return id;
    localStorage.setItem(AVATAR_KEY, initial);
  } catch {
    /* private browsing */
  }
  return initial;
}
export const useAvatarPreference = create<{ avatarId: AvatarId }>(() => ({ avatarId: load() }));
export function setAvatarPreference(avatarId: AvatarId) {
  if (!isAvatarId(avatarId)) return;
  useAvatarPreference.setState({ avatarId });
  try {
    localStorage.setItem(AVATAR_KEY, avatarId);
  } catch {
    /* session still works */
  }
}
