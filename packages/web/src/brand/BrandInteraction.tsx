import { useEffect } from 'react';
import { brandAudio } from './audio';
/** One gesture gate for the app. Audio is never created during import or mount. */
export function BrandInteraction() {
  useEffect(() => {
    const gesture = (event: Event) => {
      if (!event.isTrusted) return;
      const target = event.target instanceof Element ? event.target.closest('button,[role=button],summary') : null;
      if (event instanceof KeyboardEvent && (!['Enter', ' '].includes(event.key) || event.repeat)) return;
      void brandAudio.unlock().then(() => { if (target) brandAudio.play('tap'); });
    };
    const hover = (event: PointerEvent) => {
      const card = event.target instanceof Element ? event.target.closest('.card-slot.is-interactive') : null;
      if (event.pointerType === 'mouse' && card && (!(event.relatedTarget instanceof Node) || !card.contains(event.relatedTarget))) brandAudio.play('hover');
    };
    const hidden = () => { if (document.hidden) brandAudio.cancel(); };
    document.addEventListener('pointerdown', gesture, true); document.addEventListener('keydown', gesture, true);
    document.addEventListener('pointerover', hover); document.addEventListener('visibilitychange', hidden);
    return () => { document.removeEventListener('pointerdown', gesture, true); document.removeEventListener('keydown', gesture, true); document.removeEventListener('pointerover', hover); document.removeEventListener('visibilitychange', hidden); brandAudio.cancel(); };
  }, []);
  return null;
}
