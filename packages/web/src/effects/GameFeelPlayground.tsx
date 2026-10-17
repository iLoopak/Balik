import { MotionConfig } from 'motion/react';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { CardView } from '../cards/Card';
import { FactionIcon } from '../decks/stormpunk/FactionIcon';
import { FACTIONS, FACTION_IDS, type FactionId } from '../decks/stormpunk/tokens';
import { useElementSize } from '../lib/useElementSize';
import { useMotionPref } from '../lib/motionPref';
import { CardLayer } from '../table/CardLayer';
import { ActionLabel } from '../table/Effects';
import type { FxItem } from '../table/display';
import { computeGeometry, placeAll, type HandUi } from '../table/layout';
import { usePerfLite } from '../table/usePerfLite';
import { GameTableTheme } from '../table/GameTableTheme';
import { EffectOrchestrator, playerEffectAnchor } from './EffectOrchestrator';
import type { EffectInstance } from './effectEvents';
import { PREVIEW_ACTIONS, PREVIEW_PLAYERS, type PreviewAction } from './previewScenarios';
import { usePreviewDirector } from './usePreviewDirector';
import '../table/table.css';
import './playground.css';

const HAND_UI: HandUi = { hovered: null, selected: null, pendingKey: null, playable: new Set(), myTurn: false };
const noop = () => {};

export function GameFeelPlayground() {
  const [faction, setFaction] = useState<FactionId>('vyhen');
  const [phone, setPhone] = useState(false);
  const [manualReduced, setManualReduced] = useState(false);
  const [manualLite, setManualLite] = useState(false);
  const [tempo, setTempo] = useState(1);
  const [lastAction, setLastAction] = useState<PreviewAction>('play');
  const { reduced: preferredReduced } = useMotionPref();
  const { display, fx, running, sceneId, speed, play, reset } = usePreviewDirector();
  const autoLite = usePerfLite(running);
  const lite = manualLite || autoLite;
  const reduced = preferredReduced || manualReduced;
  const suit = FACTIONS[faction].suit;
  const [stageRef, size] = useElementSize<HTMLDivElement>();
  const geo = useMemo(() => computeGeometry(size.width || 760, size.height || 600, display.order, 'me', display.hands.me?.length ?? 0), [size.width, size.height, display.order, display.hands.me?.length]);
  const placed = placeAll(display, geo, HAND_UI);
  const effectItems = fx.filter((item): item is EffectInstance => item.kind === 'effect');
  const label = fx.filter((item): item is Extract<FxItem, { kind: 'label' }> => item.kind === 'label').at(-1);

  const run = useCallback((action: PreviewAction) => {
    setLastAction(action);
    void play(action, suit, tempo * (reduced ? .55 : lite ? .8 : 1));
  }, [play, suit, tempo, reduced, lite]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement && event.target.matches('input, select, textarea'))) return;
      const action = PREVIEW_ACTIONS.find((entry) => entry.key === event.key);
      if (action) { event.preventDefault(); run(action.id); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [run]);

  useEffect(() => {
    document.title = 'Game feel · BALÍK';
    return () => { document.title = 'BALÍK'; };
  }, []);

  return <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
    <main className="feel-page" style={{ '--feel-faction': FACTIONS[faction].color } as CSSProperties}>
      <header className="feel-nav"><a href="/" className="brand-word">BALÍK<span>.</span></a><a href="/dev/deck-stormpunk">← Galerie balíčku</a></header>
      <div className="feel-heading"><div><p>LAB / GAME FEEL 001</p><h1>Každý tah má váhu<span>.</span></h1></div><span className="feel-local-tag">Lokální playground</span></div>
      <p className="feel-intro">Zahraj, dober, přeruš tok hry. Vyzkoušej efekty všech čtyř frakcí bez rozehrávání partie.</p>

      <div className="feel-workspace">
        <aside className="feel-actions" aria-label="Akce k přehrání"><div className="feel-panel-heading"><span>VYBER AKCI</span><span>KLÁVESY 1–9</span></div>
          {PREVIEW_ACTIONS.map((action) => <button key={action.id} className={lastAction === action.id ? 'is-selected' : ''} onClick={() => run(action.id)} aria-pressed={lastAction === action.id}>
            <kbd>{action.key}</kbd><span><strong>{action.title}</strong><small>{action.note}</small></span><span aria-hidden>↗</span>
          </button>)}
        </aside>
        <section className="feel-main" aria-label="Náhled herního stolu">
          <div className="feel-controls"><div className="feel-factions" role="group" aria-label="Frakce efektů">{FACTION_IDS.map((id) => <button key={id} onClick={() => { setFaction(id); reset(FACTIONS[id].suit); }} aria-pressed={faction === id} style={{ '--faction': FACTIONS[id].color } as CSSProperties}><FactionIcon faction={id} /><span>{FACTIONS[id].name}</span></button>)}</div>
            <button className={`feel-phone${phone ? ' is-on' : ''}`} onClick={() => setPhone((v) => !v)} aria-pressed={phone}>Mobilní stůl</button>
          </div>
          <div className={`feel-stage-holder${phone ? ' is-phone' : ''}`}>
            <div className="table command-table feel-stage" ref={stageRef} data-preview="game-feel" data-running={running}>
              <GameTableTheme geo={geo} suit={display.activeSuit} reduced={reduced} lite={lite} myTurn={display.currentPlayerId === 'me'} />
              <div className="feel-deck" style={{ left: geo.deck.x - geo.deckW / 2, top: geo.deck.y - geo.deckH / 2, width: geo.deckW, height: geo.deckH }}><CardView card={null} faceUp={false} /><span>{display.drawCount}</span></div>
              <CardLayer key={sceneId} placed={placed} geo={geo} stamp={display.stamp} speed={speed} reduced={reduced} fxFor={(p) => p.zone === 'discard' && p.entity.key === display.discard.at(-1)?.key ? { current: true } : undefined} hoverKey={null} interactive={() => false} onHover={noop} onActivate={noop} />
              {display.order.filter((id) => id !== 'me').map((id) => {
                const at = playerEffectAnchor(geo, id, 'me');
                const count = display.hands[id]?.length ?? 0;
                return <div className={`feel-seat${display.currentPlayerId === id ? ' is-active' : ''}${count === 1 ? ' is-danger' : ''}`} key={id} style={{ left: at.x, top: at.y }}><span className="feel-avatar">{PREVIEW_PLAYERS[id as keyof typeof PREVIEW_PLAYERS]?.slice(0, 1)}</span><span><b>{PREVIEW_PLAYERS[id as keyof typeof PREVIEW_PLAYERS]}</b><small>{count} karet {count === 1 ? '· poslední' : ''}</small></span>{fx.some((f) => f.kind === 'skip' && f.playerId === id) && <strong className="feel-stop">STOP</strong>}</div>;
              })}
              <div className={`feel-own-status${display.hands.me?.length === 1 ? ' is-danger' : ''}`} style={{ left: geo.w / 2, top: geo.controlY }}><b>TY</b><span>{display.phase === 'finished' ? 'Vítězství' : `${display.hands.me?.length ?? 0} karet`}</span>{display.hands.me?.length === 1 && <strong>POSLEDNÍ KARTA</strong>}</div>
              <EffectOrchestrator items={effectItems} geo={geo} me="me" reduced={reduced} lite={lite} />
              <ActionLabel item={label} at={{ x: geo.w / 2, y: geo.labelY }} />
              <span className="feel-stage-mark">BALÍK / MOTION LAB</span>
            </div>
          </div>
          <div className="feel-playback"><span className={`feel-playback-state${running ? ' is-running' : ''}`}><i />{running ? 'Přehrává se' : 'Připraveno'}</span><div><button onClick={() => reset(suit)}>Reset</button><button className="feel-replay" onClick={() => run(lastAction)}>Přehrát znovu ↗</button></div></div>
          <div className="feel-options"><label><input type="checkbox" checked={manualReduced} onChange={(e) => { setManualReduced(e.target.checked); reset(suit); }} /> Omezit pohyb</label><label><input type="checkbox" checked={manualLite} onChange={(e) => { setManualLite(e.target.checked); reset(suit); }} /> Slabší zařízení</label><label>Tempo <select value={tempo} onChange={(e) => { setTempo(Number(e.target.value)); reset(suit); }}><option value={1.35}>Pomalu</option><option value={1}>Normálně</option><option value={.65}>Rychle</option></select></label></div>
          {(preferredReduced || autoLite) && <p className="feel-pref-note">{preferredReduced ? 'Omezení pohybu podle systémového nebo herního nastavení je aktivní.' : 'Výkon zařízení automaticky zapnul odlehčené efekty.'}</p>}
        </section>
      </div>
      <footer className="feel-notes"><p><b>Jeden systém, různé charaktery.</b> Výheň jiskří. Pohyb zanechává směrové tahy. Podrost rozvíjí listové pulsy. Bouře kreslí krátké výboje.</p><p>Směr je ukázka pro budoucí hry. Prší zachovává svá pravidla. Poslední karta je pouze vizuální upozornění.</p></footer>
    </main>
  </MotionConfig>;
}
