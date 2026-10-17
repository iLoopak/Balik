import { useEffect, useRef, useState } from 'react';
import { EMOTES, EMOTE_IDS, EMOTE_COOLDOWN_MS, type EmoteId, type EmoteMessage } from '@balik/shared';
import { onEmote, sendEmote } from '../net/client';
import { useMotionPref } from '../lib/motionPref';
import { brandAudio } from './audio';
import './brand.css';

const PATHS: Record<EmoteId, string> = {
  gg: 'M5 17V7h5v10Zm9 0V7h5v10ZM7 12h1m8 0h1M9 20h6',
  ouch: 'm12 3 2 6 6-1-4 5 3 6-7-3-6 3 2-7-5-3 7-1Z',
  phew: 'M5 10h4m6 0h4M8 16q4 3 8 0M3 4q-3 5 0 6q3-1 0-6Z',
  sure: 'm4 7 6 2m4 0 6-2M6 12h2m8 0h2M9 18h6',
  nice: 'M5 12v8h4v-8Zm4 1 4-9q4 0 1 7h5q3 1 0 9H9',
  again: 'M18 6a8 8 0 1 0 2 9M18 2v5h-5M10 8v8m4-8v8',
};
export function EmoteIcon({ id }: { id: EmoteId }) {
  return <svg className="emote-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={PATHS[id]} /></svg>;
}
export function useEmotes(code: string) {
  const [messages, setMessages] = useState<EmoteMessage[]>([]);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    setMessages([]); seen.current.clear();
    const off = onEmote((message) => {
      if (document.hidden || message.code !== code || message.expiresAt <= Date.now() || seen.current.has(message.id)) return;
      seen.current.add(message.id);
      if (seen.current.size > 100) seen.current.delete(seen.current.values().next().value!);
      setMessages((previous) => [...previous.filter((p) => p.playerId !== message.playerId && p.expiresAt > Date.now()), message].slice(-4));
      brandAudio.play('reaction');
    });
    const timer = setInterval(() => setMessages((previous) => {
      const fresh = previous.filter((p) => p.expiresAt > Date.now());
      return fresh.length === previous.length ? previous : fresh;
    }), 250);
    const hidden = () => { if (document.hidden) setMessages([]); };
    document.addEventListener('visibilitychange', hidden);
    return () => { off(); clearInterval(timer); document.removeEventListener('visibilitychange', hidden); };
  }, [code]);
  return messages;
}
export function EmoteBubble({ message, author, mine = false }: { message: EmoteMessage; author: string; mine?: boolean }) {
  const { reduced } = useMotionPref();
  return <span className={`emote-bubble${mine ? ' is-mine' : ''}${reduced ? ' emote-quiet' : ''}`} role="status" aria-label={`${author}: ${EMOTES[message.emote]}`}><EmoteIcon id={message.emote} /><span>{EMOTES[message.emote]}</span></span>;
}
export function EmotePicker({ send = sendEmote }: { send?: (id: EmoteId) => boolean }) {
  const [cooldown, setCooldown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <details className="emote-picker" ref={details}>
    <summary aria-label="Poslat reakci">Reakce</summary>
    <div className="emote-options" role="group" aria-label="Rychlé reakce">
      {EMOTE_IDS.map((id) => <button key={id} disabled={cooldown} onClick={() => {
        if (!send(id)) return;
        setCooldown(true); timer.current = setTimeout(() => setCooldown(false), EMOTE_COOLDOWN_MS);
        details.current?.removeAttribute('open'); details.current?.querySelector('summary')?.focus();
      }}><EmoteIcon id={id} />{EMOTES[id]}</button>)}
      <small aria-live="polite">{cooldown ? 'Další reakce za chvíli…' : 'Krátce a s citem.'}</small>
    </div>
  </details>;
}
