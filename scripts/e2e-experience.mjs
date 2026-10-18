// BALÍK 1.0 experience audit: every game from the library to the result and a rematch.
//   npm run dev, then npm run qa:experience   (BASE=http://localhost:5173; needs Google Chrome)
//   GAMES=prsi,marias limits the run. Results: qa-output/experience/results.json + screenshots.
// Desktop: start solo from the library, guide + rules, the first move through the real UI,
// a reload mid-game, then the rest played through the client's own sendAction with a
// view-only strategy (never the server state) up to the result, and a rematch.
// Phone: start solo, the first move by touch, hit targets, cards inside the viewport.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const base = process.env.BASE ?? 'http://localhost:5173', out = process.env.OUT ?? 'qa-output/experience';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sharedUrl = `/@fs${root}/packages/shared/src/index.ts`;
const ALL = ['prsi', 'sedma', 'lhar', 'snaps', 'durak', 'marias', 'petr', 'oko', 'pexeso'];
const NAMES = { prsi: 'Prší', sedma: 'Sedma', lhar: 'Lhář', snaps: 'Šnaps', durak: 'Durak', marias: 'Mariáš', petr: 'Černý Petr', oko: 'Oko bere', pexeso: 'Pexeso' };
const games = process.env.GAMES ? process.env.GAMES.split(',') : ALL;
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ channel: process.env.CHANNEL ?? 'chrome', headless: !process.env.HEADED });
const results = [];

const room = (page) => page.evaluate(async () => {
  const { useApp } = await import('/src/net/store.ts');
  const r = useApp.getState().room;
  return r?.game ? { seq: r.seq, round: r.round, phase: r.game.phase, current: r.game.currentPlayerId, you: r.you, code: r.code } : null;
});
const myTurn = async (page) => { const r = await room(page); return !!r && r.phase !== 'finished' && r.current === r.you; };
const waitFor = async (fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(150); } return false; };

/** Opens a solo game from the library like a first visitor would. */
async function startSolo(page, game) {
  await page.goto(base);
  await page.getByRole('radio', { name: NAMES[game], exact: true }).click();
  await page.getByRole('button', { name: 'Hrát proti počítači', exact: true }).click();
  await page.locator('.game-screen').waitFor({ timeout: 15000 });
}

/** One move through the real UI: a playable card, then the primary control if one appears. */
async function uiMove(page, touch) {
  const before = (await room(page))?.seq ?? 0;
  // Aim at the card's top edge: in a two-row hand that is the part people can actually see.
  const tap = async (loc) => {
    const box = await loc.boundingBox();
    const position = box && (await loc.evaluate((el) => el.classList.contains('card-slot'))) ? { x: box.width / 2, y: Math.min(14, box.height / 4) } : undefined;
    return touch ? loc.tap({ position, timeout: 5000 }) : loc.click({ position, timeout: 5000 });
  };
  const playable = page.locator('.card-slot.is-interactive:has(.is-playable)');
  const any = page.locator('.card-slot.is-interactive');
  const moved = () => waitFor(async () => ((await room(page))?.seq ?? 0) > before, 900);
  const target = (await playable.count()) ? playable.first() : (await any.count()) ? any.first() : null;
  if (target) {
    await tap(target);
    if (await moved()) return 'card';
    const suit = page.locator('.picker-option').first();
    if (await suit.count()) { await tap(suit); if (await moved()) return 'card + suit'; }
    // A selection waiting for its confirm button (Lhář's „Položit“, GameShell's „Zahrát“ on touch).
    for (let i = 0; i < 2; i++) {
      const confirm = page.locator('.game-controls .btn-primary:not(:disabled), .sedma-controls .btn-primary:not(:disabled), .lhar-actions .btn-primary:not(:disabled), dialog[open] .btn-primary:not(:disabled)').first();
      if (!(await confirm.count()) || !(await confirm.isVisible())) break;
      await tap(confirm);
      if (await moved()) return 'card + confirm';
    }
    // Touch rule (also headless Chrome, which reports no hover): the first tap lifts, the second plays.
    if (await page.locator('.card-slot[aria-pressed="true"]').count()) { await tap(page.locator('.card-slot[aria-pressed="true"]').first()); if (await moved()) return 'card (2 taps)'; }
  }
  for (const sel of ['.game-controls .btn-primary:not(:disabled)', '.sedma-controls .btn-primary:not(:disabled)', '.lhar-actions .btn-primary:not(:disabled)',
    '.status-actions .btn:not(:disabled)', '.game-controls .btn:not(:disabled)', '.lhar-dialog .btn-primary:not(:disabled)']) {
    const btn = page.locator(sel).first();
    if (await btn.count() && await btn.isVisible()) { await tap(btn); break; }
  }
  await sleep(250);
  // Lhář: picking cards can open its selection dialog with the confirm button.
  const confirm = page.locator('dialog[open] .btn-primary:not(:disabled)').first();
  if (await confirm.count()) { await tap(confirm); await sleep(250); }
  return ((await room(page))?.seq ?? 0) > before ? 'controls' : null;
}

/** The rest of the game: the client's sendAction with a strategy that sees only this player's view. */
const AUTOPLAY = async (sharedUrl) => {
  if (window.__auto) return;
  const S = await import(sharedUrl);
  // Import the exact client module instance the app runs (Vite may have added an HMR stamp).
  const loaded = (name) => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes(`/src/net/${name}.ts`)) ?? `/src/net/${name}.ts`;
  const { sendAction } = await import(loaded('client'));
  const { useApp } = await import('/src/net/store.ts');
  window.__auto = setInterval(() => {
    const { room: r, pending } = useApp.getState();
    if (!r?.game || pending || r.game.phase === 'finished' || r.game.currentPlayerId !== r.you) return;
    const v = r.game, me = r.you;
    let a = null;
    switch (r.gameId) {
      case 'prsi': { const m = S.legalMovesFromView(v, me); const c = v.myHand.find((x) => x.id === m.playable[0]);
        a = c ? { type: 'play', cardId: c.id, ...(c.rank === 'Q' ? { chosenSuit: c.suit } : {}) } : m.canDraw ? { type: 'draw' } : m.canPass ? { type: 'pass' } : null; break; }
      case 'sedma': a = S.chooseSedmaBotFromView(v, me); break;
      case 'lhar': a = S.chooseLharBotFromView(v, me, Math.random); break;
      case 'snaps': a = S.chooseSnapsBotFromView(v, me); break;
      case 'durak': a = S.chooseDurakBotFromView(v, me); break;
      case 'marias': a = S.chooseMariasBotFromView(v, me); break;
      case 'petr': a = S.choosePetrBotFromView(v, me, Math.random); break;
      case 'oko': a = S.chooseOkoBotFromView(v, me); break;
      case 'pexeso': a = S.choosePexesoBotFromView(v, me, Math.random); break;
    }
    if (a) sendAction(a);
  }, 300);
};

function watch(page, bag) {
  page.on('pageerror', (e) => bag.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/WebSocket/.test(m.text())) bag.push(m.text()); });
}

try {
  for (const game of games) {
    const r = { game, desktop: {}, phone: {}, errors: [] };
    results.push(r);
    // ---- Desktop: full journey ----
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); watch(page, r.errors);
    const t0 = Date.now();
    try {
      await startSolo(page, game);
      r.desktop.toTableMs = Date.now() - t0;
      r.desktop.myTurnWithin20s = await waitFor(() => myTurn(page), 20000);
      r.desktop.guide = await page.locator('.game-guide').getAttribute('data-hint', { timeout: 4000 }).catch(() => null);
      await page.getByRole('button', { name: `Pravidla: ${NAMES[game]}` }).first().click();
      r.desktop.rulesOpen = await page.locator('dialog[open] .rules-content').isVisible();
      await page.keyboard.press('Escape');
      await page.screenshot({ path: join(out, `${game}-desktop-first.png`) });
      r.desktop.firstMove = r.desktop.myTurnWithin20s ? await uiMove(page, false) : null;
      // Reload mid-game: same round, table back, no replayed history.
      const before = await room(page);
      await page.reload(); await page.locator('.game-screen').waitFor({ timeout: 15000 });
      const after = await room(page);
      r.desktop.reload = !!after && after.round === before?.round && after.code === before?.code;
      await page.evaluate(AUTOPLAY, sharedUrl);
      await page.getByRole('button', { name: 'Odveta', exact: true }).waitFor({ timeout: 300000 });
      r.desktop.toResultMs = Date.now() - t0;
      r.desktop.result = (await page.locator('.win-panel').first().innerText()).split('\n').map((s) => s.trim()).filter((s) => s && !/^(BALÍK|JEŠTĚ JEDNU\?)$/.test(s)).slice(0, 3).join(' · ');
      await page.screenshot({ path: join(out, `${game}-desktop-result.png`) });
      const round = (await room(page))?.round;
      await page.getByRole('button', { name: 'Odveta', exact: true }).click();
      // A new round started (a short Černý Petr round may already be over again by the next poll).
      r.desktop.rematch = await waitFor(async () => { const x = await room(page); return !!x && x.round > round; }, 15000);
    } catch (e) { r.desktop.failure = String(e).split('\n')[0]; await page.screenshot({ path: join(out, `${game}-desktop-failure.png`) }).catch(() => {}); }
    await ctx.close();

    // ---- Phone: first move by touch ----
    const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'light' });
    const phone = await phoneCtx.newPage(); watch(phone, r.errors);
    try {
      await phone.addInitScript(() => localStorage.setItem('balik.colorMode', 'light'));
      await startSolo(phone, game);
      r.phone.myTurnWithin20s = await waitFor(() => myTurn(phone), 20000);
      await sleep(1600);
      await phone.screenshot({ path: join(out, `${game}-phone-first.png`) });
      const layout = await phone.evaluate(() => {
        const vw = innerWidth, vh = innerHeight;
        const small = [...document.querySelectorAll('.game-screen button')].filter((b) => {
          const s = getComputedStyle(b), rect = b.getBoundingClientRect();
          return s.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && !b.closest('.card-slot') && (rect.height < 40 || rect.width < 40);
        }).map((b) => `${(b.getAttribute('aria-label') ?? b.textContent ?? '').trim().slice(0, 24)} ${Math.round(b.getBoundingClientRect().width)}×${Math.round(b.getBoundingClientRect().height)}`);
        const clipped = [...document.querySelectorAll('.card-slot.is-interactive')].filter((el) => { const b = el.getBoundingClientRect(); return b.left < -2 || b.right > vw + 2 || b.bottom > vh + 2; }).length;
        const name = document.querySelector('.topbar-room');
        return { small, clippedInteractiveCards: clipped, topbarNameTruncated: !!name && name.scrollWidth > name.clientWidth + 1 };
      });
      Object.assign(r.phone, layout);
      r.phone.firstMove = r.phone.myTurnWithin20s ? await uiMove(phone, true) : null;
      await sleep(600);
      await phone.screenshot({ path: join(out, `${game}-phone-after.png`) });
    } catch (e) { r.phone.failure = String(e).split('\n')[0]; await phone.screenshot({ path: join(out, `${game}-phone-failure.png`) }).catch(() => {}); }
    await phoneCtx.close();
    console.log(JSON.stringify(r));
    writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 2));
  }
} finally {
  await browser.close();
}
const bad = results.filter((r) => r.desktop.failure || r.phone.failure || !r.desktop.rematch || r.errors.length);
console.log(bad.length ? `ATTENTION: ${bad.map((r) => r.game).join(', ')}` : `PASS: ${results.length} games from library to result and rematch`);
process.exitCode = bad.length ? 1 : 0;
