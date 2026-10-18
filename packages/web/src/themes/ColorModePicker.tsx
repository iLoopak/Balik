import { setColorMode, useColorMode, type ColorModePreference } from './colorMode';
const options: readonly [ColorModePreference, string, string][] = [
  ['light', 'Světlo', 'Teplá slonová kost'],
  ['dark', 'Tma', 'Večerní atmosféra'],
  ['system', 'Podle systému', 'Automaticky podle zařízení'],
];
export function ColorModePicker() {
  const { preference, mode } = useColorMode();
  return (
    <fieldset className="color-mode-picker">
      <legend>Režim aplikace</legend>
      <div className="color-mode-options" role="group" aria-label="Barevný režim">
        {options.map(([id, name, hint]) => (
          <button key={id} type="button" aria-pressed={preference === id} onClick={() => setColorMode(id)}>
            <span className={`color-mode-swatch is-${id}`} aria-hidden>
              <i />
              <b />
              <em />
            </span>
            <strong>{name}</strong>
            <small>{hint}</small>
          </button>
        ))}
      </div>
      <p className="appearance-note">
        {preference === 'system' ? `Teď je ${mode === 'light' ? 'světlý' : 'tmavý'} režim. ` : ''}Režim mění
        celou hernu. Edici karet i prostředí stolu vybíráš samostatně.
      </p>
    </fieldset>
  );
}
