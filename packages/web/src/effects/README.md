# BALÍK game feel

Preview: <http://localhost:5173/dev/game-feel> after `npm run dev`.
The gallery footer links to the playground. It runs without a game server.

## Architecture

- `effectEvents.ts`: typed presentation events and the adapter from public engine
  events. It runs against the display immediately before and after a cue, so it
  cannot accidentally describe a future server snapshot. It uses no hidden cards.
- `effectTokens.ts`: timing shared with card flights, faction palette and mark
  shapes, desktop/mobile/lite/reduced particle budgets and a concurrent FX limit.
- `effectPresets.ts`: per-action timing and reusable motion vocabulary. Card lift,
  sticker pop and seat shake consume the same primitives as local feedback.
- `EffectOrchestrator.tsx`: stateless, bounded renderer. Shared `Burst`, `Trail`,
  `Flight` and `LocalBadge` primitives compose the action visuals. Geometry comes
  from the existing table layout; distances scale with card size.
- `CardEffectLayer.tsx`: a separate, persistent current-card treatment. It does not
  alter the card base, indices or sticker.
- `previewScenarios.ts`, `usePreviewDirector.ts`, `GameFeelPlayground.tsx`: local
  scenarios feed the same cue and effect adapters and the actual `CardLayer`.
  Only the playground clock is separate from the network director.

The live flow remains server event → `cuesFor` → `useDirector` → display/card
movement + effect instances. The existing table layer is still the sole owner of
card flight and hand reflow. A sticker micro-pop targets only the separate image
inside `[data-layer="sticker"]`. Animation cleanup restores the wrapper/image
transforms, including when reduced motion is enabled during a move.

Each effect instance stores its dispatch-time speed. Later cues cannot retime it.
The existing director owns identity, deduplication, backlog catch-up, expiry and
reset. All transient effects clear on either visibility change, reconnect, sequence
gap and unmount. FX never acquire pointer events or add an interaction lock.
The existing skip hold was shortened from 900ms to 660ms; the winning hold was
adjusted for the short local flourish. Rules, scoring and transport are unchanged.

## Implemented feedback

- Ordinary play: existing continuous flight, a small lift, faction marks trailing
  toward the pile, landing ring/marks, and an independent sticker overshoot.
- Draw: existing deck-to-hand movement and hand reflow, an arc of faction marks,
  a receipt count and named recipient. A batch produces one receipt, not one FX
  overlay per hidden card.
- Current card: a quiet persistent inset faction edge on the top discard only.
- Suit change: a local color wash, faction glyph and ring at the pile; labels and
  picker show the newly active faction.
- Ace / skip: a short time-slice on the pile followed by an interrupt slash and
  named STOP badge at the skipped player. The sending player remains attributable.
- Penalty / chain: a flying count from the latest sender through the pile toward
  the target, then a receipt with sender → target and cumulative +N. Attribution
  uses `Display.lastPlayedBy`, which is local presentation metadata.
- Last card: a short entry pulse/badge plus a persistent seat/count or own-hand
  warning that disappears when the count changes. No UNO call or new penalty rule.
- Win: two short local faction bursts (pile and winner), then a compact badge.
  The former full-screen confetti is no longer rendered by the game.
- Reverse: a 640ms rotating arrow effect exposed through the presentation API and
  playground. Prší has no reverse rule, so no engine event or order mutation was
  invented for it. A future game can dispatch `{ kind: 'reverse', direction: -1,
  label: 'Změna směru' }` through the same orchestrator.

Normal presets can combine: an ace play produces play + pause, and a play leaving
one card produces play + danger. The adapter returns an array, not an exclusive
single effect.

## Faction language and performance

Výheň uses red/orange sparks; Pohyb yellow directional dashes; Podrost green
leaf marks; Bouře blue bolt marks. Trails and marks animate transform/opacity;
small local SVG slashes also animate path length. No full-screen FX canvas,
blur animation, layout reads per frame, particle physics or random spawning.

Burst budgets: desktop 8 marks, mobile 5, lite 2, reduced 0. Trails use at most
3/2/1/0 marks respectively. At most 10 effect instances are rendered. Local
bursts end within a second at normal speed. The existing performance detector
activates lite mode when sustained frame times exceed its threshold.

Reduced motion respects both OS and saved game preference. Card flights/flip
transitions and sticker accents are removed; feedback becomes stationary color,
badge and opacity changes, with action text retained. The preview can force
reduced motion or lite mode, switch factions/mobile geometry and change tempo.
Keyboard shortcuts 1–9 replay actions; typing in controls is left alone. Replay,
reset, switching faction/settings and unmount cancel the local timeline and TTLs.

## Validation and remaining review

`npm test` covers the complete deck and game/server suites plus effect scenarios:
entity continuity, public hidden-card boundaries, new suit, ace sender/recipient,
three-step +2/+4/+6 attribution and receipt, danger versus win, reverse isolation,
finite lifetimes, particle budgets and independent card layers (server rendering).
Also run `npm run typecheck`, `npm run build`, and `git diff --check`.

Browser verification was blocked in this session: Chrome could not launch in the
restricted shell and the app browser permission gate denied localhost access.
The code and static render checks pass, but animation timing, touch interaction,
mobile performance and visual balance still need a real browser/device review.
The pre-existing `npm run qa:e2e` walkthrough was therefore not run successfully.

Further polish: review the foreground FX opacity against all four factions,
measure on a lower-end phone, and tune recipient-label placement for extremely
long player names. Names are already truncated in compact effect badges. Reverse
integration belongs to a future game's actual direction event. No audio or
haptics are included.

## Dealer Console

The apparatus under the cards now shares these semantic cues. Prší adapts
existing effect instances; Sedma and Lhář emit public signals at their existing
card-director steps. No new gameplay timeline or transport is involved. See
[console architecture and validation](../../../../docs/visual/DEALER_CONSOLE.md).
