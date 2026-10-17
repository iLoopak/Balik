import { useEffect, useRef, useState } from 'react';
import { useApp } from '../net/store';
import { sendAvatar } from '../net/client';
import { Avatar } from './Avatar';
import { AVATAR_CATALOG } from './catalog';
import { setAvatarPreference, useAvatarPreference } from './preferences';
import type { AvatarId } from '@balik/shared';

export function AvatarChoices({ value, onChange }: { value: AvatarId; onChange: (id: AvatarId) => void }) {
  return (
    <div className="avatar-choice-grid" role="group" aria-label="Dostupné postavy">
      {AVATAR_CATALOG.map((a) => (
        <button
          type="button"
          key={a.id}
          aria-pressed={value === a.id}
          onClick={() => onChange(a.id)}
          title={a.tags.join(', ')}
        >
          <Avatar player={{ id: a.id, name: a.name, avatarId: a.id, bot: a.type === 'bot' }} size={64} />
          <strong>{a.name}</strong>
          <small>{a.tags[0]}</small>
          {value === a.id && (
            <span className="avatar-choice-check" aria-hidden>
              ✓
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
export function AvatarPicker({ compact = false }: { compact?: boolean }) {
  const preferred = useAvatarPreference((s) => s.avatarId);
  const room = useApp((s) => s.room);
  const status = useApp((s) => s.status);
  const value = preferred;
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
    else if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  const choose = (id: AvatarId) => {
    setAvatarPreference(id);
    if (room && status === 'open') sendAvatar(id);
  };
  return (
    <>
      <button
        type="button"
        className="appearance-open avatar-picker-open"
        title="Tvoje postava"
        aria-label="Vybrat svoji postavu"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Avatar player={{ id: 'preview', name: 'Tvoje postava', avatarId: value }} size={26} />
        {!compact && <span>Postava</span>}
      </button>
      <dialog
        className="appearance-dialog avatar-picker-dialog"
        ref={dialog}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setOpen(false);
        }}
        aria-labelledby="avatar-picker-title"
      >
        <header>
          <div>
            <p>TVŮJ VÝRAZ U STOLU.</p>
            <h2 id="avatar-picker-title">Vyber svoji postavu</h2>
          </div>
          <button
            type="button"
            className="appearance-close"
            onClick={() => setOpen(false)}
            aria-label="Zavřít postavy"
          >
            ×
          </button>
        </header>
        <p className="appearance-note">
          Všechny postavy jsou dostupné. Volba se uloží v tomto prohlížeči a spoluhráči ji uvidí u tvého
          jména.
        </p>
        {room && status !== 'open' && (
          <p role="status">Po obnovení spojení se přenese i tvoje poslední volba.</p>
        )}
        <AvatarChoices value={value} onChange={choose} />
        <button className="btn btn-primary wide" onClick={() => setOpen(false)}>
          Hotovo
        </button>
      </dialog>
    </>
  );
}
