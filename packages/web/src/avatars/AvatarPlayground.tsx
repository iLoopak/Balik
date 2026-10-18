import { AppearancePicker } from '../themes/AppearancePicker';
import { useState } from 'react';
import { MotionConfig } from 'motion/react';
import type { AvatarId } from '@balik/shared';
import { Avatar } from './Avatar';
import { AvatarChoices } from './AvatarPicker';
import { AVATAR_CATALOG } from './catalog';
import '../themes/appearance.css';

/** Local-only cosmetic demo. It sends no profile or game command. */
export default function AvatarPlayground() {
  const [selected, setSelected] = useState<AvatarId>('vega');
  const [reduced, setReduced] = useState(false);
  const art = AVATAR_CATALOG.find((a) => a.id === selected)!;
  const player = { id: 'demo', name: art.name, avatarId: selected };
  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <main className="avatar-playground">
        <AppearancePicker compact/><a href="/" className="brand-word">
          BALÍK / POSTAVY
        </a>
        <h1>Každý hraje po svém.</h1>
        <p>16 postav, 4 počítačoví spoluhráči. Stejná identita napříč všemi edicemi.</p>
        <label>
          <input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} /> Omezit
          pohyb
        </label>
        <div className="avatar-demo-row">
          {(
            [
              ['V klidu', {}],
              ['Jsi na tahu', { turn: 'self' }],
              ['Přemýšlí…', { turn: 'thinking' }],
              ['Počítač', { player: { ...player, bot: true } }],
              ['Odpojeno', { player: { ...player, connected: false } }],
              ['Připraveno', { ready: true }],
              ['Vítěz', { winner: true }],
              ['Poslední karta', { danger: true }],
            ] as const
          ).map(([label, props]) => (
            <figure key={label}>
              <Avatar player={player} size={64} reduced={reduced} {...props} />
              <figcaption>{label}</figcaption>
            </figure>
          ))}
        </div>
        <h2>Od herního štítku po profil</h2>
        <div className="avatar-demo-row">
          {[24, 32, 40, 64, 96].map((size) => (
            <figure key={size}>
              <Avatar player={player} size={size} reduced={reduced} />
              <figcaption>{size} px</figcaption>
            </figure>
          ))}
        </div>
        <h2>Vyber charakter</h2>
        <AvatarChoices value={selected} onChange={setSelected} />
      </main>
    </MotionConfig>
  );
}
