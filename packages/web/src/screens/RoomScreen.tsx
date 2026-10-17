import { useEffect, useState, type FormEvent } from 'react';
import { MAX_NAME_LENGTH } from '@balik/shared';
import { getName, hasJoinedRoom } from '../lib/identity';
import { joinRoom } from '../net/client';
import { navigate, useApp } from '../net/store';
import { GameScreen } from './GameScreen';
import { Lobby } from './Lobby';
import './screens.css';

/** Everything under /r/CODE: ask for a name, connect, then lobby or table. */
export function RoomScreen({ code }: { code: string }) {
  const room = useApp((s) => s.room);
  const status = useApp((s) => s.status);
  const joinError = useApp((s) => s.joinError);
  const [asked, setAsked] = useState(() => hasJoinedRoom(code));
  const [name, setName] = useState(getName);
  const inThisRoom = room?.code === code;

  // Reload / returning tab: rejoin the seat silently.
  useEffect(() => {
    if (asked && !inThisRoom) joinRoom(code, getName());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, asked]);

  if (status === 'replaced') {
    return (
      <Message title="Hra je otevřená jinde" text="Tvoje místo u stolu převzalo jiné okno nebo zařízení.">
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Vrátit se sem
        </button>
      </Message>
    );
  }

  if (joinError) {
    return (
      <Message title={joinError.code === 'room-not-found' ? 'Místnost nenalezena' : 'Nelze se připojit'} text={joinError.message}>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Na úvod
        </button>
      </Message>
    );
  }

  if (!asked) {
    const submit = (e: FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      setAsked(true);
      joinRoom(code, name.trim());
    };
    return (
      <main className="screen">
        <form className="panel" onSubmit={submit}>
          <div className="game-tag">
            <span className="game-dot" /> Pozvánka do hry Prší
          </div>
          <h1 className="brand-word join-title">
            Místnost <span className="code-inline">{code}</span>
          </h1>
          <label className="label" htmlFor="join-name">
            Tvoje jméno
          </label>
          <input
            id="join-name"
            className="field"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            enterKeyHint="go"
          />
          <button className="btn btn-primary wide" type="submit" disabled={!name.trim()}>
            Sednout ke stolu
          </button>
          <button type="button" className="btn btn-ghost wide" onClick={() => navigate('/')}>
            Zpět
          </button>
        </form>
      </main>
    );
  }

  if (!inThisRoom || !room) {
    return (
      <main className="screen">
        <div className="loading">
          <div className="spinner" />
          <p>{status === 'reconnecting' ? 'Obnovuji spojení…' : 'Připojuji ke stolu…'}</p>
        </div>
      </main>
    );
  }

  if (room.status === 'lobby' || !room.game) return <Lobby room={room} />;
  return <GameScreen room={room} />;
}

function Message({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <main className="screen">
      <div className="panel center">
        <h1 className="brand-word msg-title">{title}</h1>
        <p className="msg-text">{text}</p>
        {children}
      </div>
    </main>
  );
}
