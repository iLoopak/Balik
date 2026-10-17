# BALÍK — notes for Claude

npm workspaces monorepo: `packages/shared` (pure TS engine + protocol), `packages/server` (Node ws, authoritative), `packages/web` (React + Vite + Motion). See README.md for architecture, rules and the motion system.

Commands: `npm run dev` · `npm test` · `npm run typecheck` · `npm run build` · `npm run qa:e2e` (needs dev server + Google Chrome).

Invariants to keep:
- Rules live only in `shared/prsi/engine.ts`; the server is the source of truth. Never gate rules on animations.
- Anything sent to a client goes through `viewFor` / `filterEventFor` — no hidden cards in snapshots or events.
- Every visible change on the table comes from a server event mapped to cue steps in `web/src/table/display.ts`; the director reconciles with the snapshot when the queue drains.
- Cards are one absolutely positioned layer driven by `layout.ts`; move cards by changing their target, never by remounting.
- Motion animates transforms via WAAPI, so `el.style.transform` shows the target value; measure with `getComputedStyle` (as `scripts/e2e-play.mjs` does).
- UI text is Czech; prefer gender-neutral phrasing (present tense: "Petr hraje", "Anna líže").
