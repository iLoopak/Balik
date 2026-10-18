import { useEffect, useRef, useState } from 'react';
import { GAME_INFO, type GameId } from '@balik/shared';
import { RULES } from './rules';
import './rules.css';

/** Full rules of one game; usable inline (lobby) or inside the dialog (during play). */
export function RulesContent({ gameId, note }: { gameId: GameId; note?: string }) {
  const rules = RULES[gameId];
  if (!rules) return null;
  return <div className="rules-content">
    <p className="rules-goal"><span className="type-machine">Cíl</span>{rules.goal}</p>
    {rules.sections.map((s) => <section key={s.title}><h3>{s.title}</h3><ul>{s.items.map((item) => <li key={item}>{item}</li>)}</ul></section>)}
    {note && <p className="rules-note">{note}</p>}
  </div>;
}

/** A button that opens the rules of the given game; works mid-game without pausing anything. */
export function RulesButton({ gameId, compact = false, note }: { gameId: GameId; compact?: boolean; note?: string }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
    else if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  const info = GAME_INFO[gameId];
  return <>
    <button type="button" className="rules-open" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`Pravidla: ${info.name}`} title={`Pravidla: ${info.name}`}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4Z" /><path d="M9 9h6M9 13h6M5 16a4 4 0 0 1 4-4" /></svg>
      {!compact && <span>Pravidla</span>}
    </button>
    <dialog className="rules-dialog" ref={dialog} onCancel={() => setOpen(false)} onClose={() => setOpen(false)}
      onClick={(e) => { if (e.target === dialog.current) setOpen(false); }} aria-labelledby={`rules-title-${gameId}`}>
      <header>
        <div><p className="type-machine">Pravidla · {info.playersLabel}</p><h2 id={`rules-title-${gameId}`}>{info.name}</h2></div>
        <button type="button" className="rules-close" onClick={() => setOpen(false)} aria-label="Zavřít pravidla" autoFocus>×</button>
      </header>
      <RulesContent gameId={gameId} note={note} />
    </dialog>
  </>;
}
