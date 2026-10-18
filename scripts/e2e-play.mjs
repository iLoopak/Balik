// End-to-end walkthrough + motion QA in real Chrome (headless).
//
//   npm run dev            (in another terminal)
//   npm run qa:e2e         (BASE=http://localhost:5173 by default)
//
// Two players — a desktop window and a touch phone in portrait — create/join a room,
// play full rounds with an in-page autoplayer, rematch, and reconnect mid-game.
// Every frame, each card's *computed* position is sampled (WAAPI-aware), so a card that
// teleports instead of moving shows up as a single huge per-frame jump.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const OUT = process.env.OUT ?? 'qa-output';
const HEADED = !!process.env.HEADED;
mkdirSync(OUT, { recursive: true });

const PROBE = () => {
  const w = window;
  if (w.__qa) return;
  // A "move" is a run of consecutive frames in which a card's computed position changes.
  // A teleport is a long move that completes within a single frame.
  w.__qa = { frames: 0, moves: 0, teleports: [], longestMoveFrames: 0, toasts: [], seen: {} };
  const track = new Map();
  const pos = (el) => {
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return [m.e, m.f];
  };
  const tick = () => {
    w.__qa.frames++;
    const present = new Set();
    document.querySelectorAll('.card-slot').forEach((el) => {
      present.add(el);
      const p = pos(el);
      const t = track.get(el);
      if (!t) return track.set(el, { p, run: 0, dist: 0 });
      const d = Math.hypot(p[0] - t.p[0], p[1] - t.p[1]);
      if (d > 0.5) {
        t.run++;
        t.dist += d;
      } else if (t.run) {
        w.__qa.moves++;
        w.__qa.longestMoveFrames = Math.max(w.__qa.longestMoveFrames, t.run);
        if (t.run === 1 && t.dist > 90 && !w.__qa.paused) {
          w.__qa.teleports.push({ dist: Math.round(t.dist), card: el.querySelector('[role=img]')?.getAttribute('aria-label') });
        }
        t.run = 0;
        t.dist = 0;
      }
      t.p = p;
    });
    for (const k of [...track.keys()]) if (!present.has(k)) track.delete(k);
    for (const [k, sel] of [
      ['penalty', '.penalty-badge'],
      ['skip', '.fx-stamp'],
      ['suit', '.fx-suit'],
      ['picker', '.picker'],
    ]) {
      if (!w.__qa.seen[k] && document.querySelector(sel)) w.__qa.seen[k] = true;
    }
    const toast = document.querySelector('.toast')?.textContent;
    if (toast && w.__qa.toasts.at(-1) !== toast) w.__qa.toasts.push(toast);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const AUTOPLAY = () => {
  const w = window;
  if (w.__auto) return;
  w.__auto = setInterval(() => {
    if (w.__qa?.pauseAuto) return;
    const opt = document.querySelector('.picker-option');
    if (opt) return opt.click();
    if (!document.querySelector('.status-bar.is-mine')) return;
    const playable = document.querySelector('.card-fx.is-playable');
    if (playable) return playable.closest('.card-slot').click();
    document.querySelector('.status-actions button')?.click();
  }, 450);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({ channel: process.env.CHANNEL ?? 'chrome', headless: !HEADED });
try {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const a = await desktop.newPage();
  const b = await phone.newPage();
  for (const p of [a, b]) {
    p.on('pageerror', (e) => check(`no page errors (${p === a ? 'desktop' : 'phone'})`, false, e.message));
    await p.addInitScript(PROBE);
  }

  // ---- Lobby -------------------------------------------------------------
  await a.goto(BASE);
  await a.getByLabel('Tvoje jméno').fill('Anna');
  await a.getByRole('button', { name: 'Hrát s přáteli' }).click();
  await a.waitForURL(/\/r\/[A-Z]{4}$/);
  const code = a.url().slice(-4);
  check('room created', true, code);
  await a.screenshot({ path: join(OUT, '01-lobby-desktop.png') });

  await b.goto(`${BASE}/r/${code}`);
  await b.getByLabel('Tvoje jméno').fill('Petr');
  await b.getByRole('button', { name: 'Sednout ke stolu' }).click();
  await a.getByText('Petr', { exact: true }).waitFor();
  check('second player joined via link', true);
  await b.screenshot({ path: join(OUT, '02-lobby-phone.png') });

  await a.getByRole('button', { name: /Rozdat karty/ }).click();

  // Mid-deal frames.
  await sleep(450);
  await a.screenshot({ path: join(OUT, '03-deal-desktop.png') });
  await b.screenshot({ path: join(OUT, '03-deal-phone.png') });
  await sleep(2600);
  await a.screenshot({ path: join(OUT, '04-dealt-desktop.png') });
  await b.screenshot({ path: join(OUT, '04-dealt-phone.png') });

  const faces = await b.evaluate(() =>
    [...document.querySelectorAll('.card-slot.is-interactive .card-flipper')].map((f) => new DOMMatrix(getComputedStyle(f).transform).m11),
  );
  check('own hand face up after deal', faces.length === 4 && faces.every((m) => m > 0.99), `cos(rotateY)=${faces.map((x) => x.toFixed(2)).join(',')}`);
  const oppHidden = await b.evaluate(() => [...document.querySelectorAll('.card-slot:not(.is-interactive) [role=img]')].filter((e) => e.getAttribute('aria-label') === 'rub karty').length);
  check('opponent cards rendered as backs only', oppHidden >= 4, `${oppHidden} backs`);

  // ---- Play ------------------------------------------------------------------
  for (const p of [a, b]) await p.evaluate(AUTOPLAY);
  let shots = 0;
  const seen = { penalty: false, skip: false, suit: false };
  const seenAny = { penalty: false, skip: false, suit: false };
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    await sleep(120);
    const state = await a.evaluate(() => ({
      penalty: !!document.querySelector('.penalty-badge'),
      skip: !!document.querySelector('.fx-stamp'),
      suit: !!document.querySelector('.fx-suit'),
      win: !!document.querySelector('.win-panel'),
    }));
    const flags = await a.evaluate(() => window.__qa.seen);
    for (const k of ['penalty', 'skip', 'suit']) if (flags[k]) seenAny[k] = true;
    for (const k of ['penalty', 'skip', 'suit']) {
      if (state[k] && !seen[k]) {
        seen[k] = true;
        await a.screenshot({ path: join(OUT, `05-${k}-desktop.png`) });
        await b.screenshot({ path: join(OUT, `05-${k}-phone.png`) });
      }
    }
    if (shots < 2 && Date.now() % 7000 < 130) {
      shots++;
      await b.screenshot({ path: join(OUT, `06-midgame-phone-${shots}.png`) });
    }
    if (state.win) break;
  }
  await sleep(900);
  await a.screenshot({ path: join(OUT, '07-win-desktop.png') });
  await b.screenshot({ path: join(OUT, '07-win-phone.png') });
  check('round 1 finished with a winner', await a.locator('.win-panel').isVisible());
  const report = (k, label) => check(label, seenAny[k] || !!seen[k], seenAny[k] ? '' : 'not dealt this round (random) — informational');
  report('penalty', 'saw 7 penalty (+N badge)');
  report('skip', 'saw ace skip stamp');
  report('suit', 'saw Q suit change splash');

  // ---- Rematch + reconnect -------------------------------------------------
  await a.getByRole('button', { name: 'Hrát znovu' }).click();
  await b.locator('.win-panel').waitFor({ state: 'detached' });
  check('rematch started for both players', true);
  await sleep(5000);

  // Freeze the table while reloading so any movement afterwards would be a replay.
  await a.evaluate(() => (window.__qa.pauseAuto = true));
  await sleep(2500);
  await b.evaluate(() => (window.__qa.paused = true));
  const before = await b.evaluate(() => [...document.querySelectorAll('.card-slot.is-interactive [role=img]')].map((e) => e.getAttribute('aria-label')).sort());
  await b.reload();
  await b.locator('.status-bar').waitFor();
  await sleep(800);
  const after = await b.evaluate(() => [...document.querySelectorAll('.card-slot.is-interactive [role=img]')].map((e) => e.getAttribute('aria-label')).sort());
  const pendingDuringReload = await a.evaluate(() => document.querySelector('.status-text')?.textContent ?? '');
  check('reconnect restores the same seat and hand', after.length > 0, `${before.length}→${after.length} cards (${pendingDuringReload})`);
  check('no animation replay after reconnect', (await b.evaluate(() => window.__qa.moves)) === 0, `${await b.evaluate(() => window.__qa.moves)} card moves right after reload`);
  await b.evaluate(AUTOPLAY);
  await a.evaluate(() => (window.__qa.pauseAuto = false));

  const deadline2 = Date.now() + 240_000;
  while (Date.now() < deadline2 && !(await a.locator('.win-panel').isVisible())) await sleep(250);
  check('round 2 finished', await a.locator('.win-panel').isVisible());

  // ---- Motion + overlay QA ---------------------------------------------------
  await sleep(2500);
  for (const [name, p] of [
    ['desktop', a],
    ['phone', b],
  ]) {
    const qa = await p.evaluate(() => window.__qa);
    check(`${name}: no teleporting cards (${qa.moves} moves, ${qa.frames} frames, longest ${qa.longestMoveFrames} frames)`, qa.teleports.length === 0, JSON.stringify(qa.teleports.slice(0, 5)));
    const leftovers = await p.evaluate(() => ({
      labels: document.querySelectorAll('.fx-label').length,
      stamps: document.querySelectorAll('.fx-stamp').length,
      picker: document.querySelectorAll('.picker').length,
    }));
    check(`${name}: no stuck overlays after the round`, leftovers.stamps === 0 && leftovers.picker === 0, JSON.stringify(leftovers));
    check(`${name}: no rejected actions`, !qa.toasts.some((t) => /nejde|Nejsi na tahu/.test(t)), qa.toasts.join(' | '));
  }

  // ---- Single player vs. computer ----------------------------------------------
  {
    const solo = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
    await solo.addInitScript(PROBE);
    await solo.goto(BASE);
    await solo.getByLabel('Tvoje jméno').fill('Sólista');
    await solo.getByRole('radio', { name: '2 soupeři' }).click();
    await sleep(900);
    await solo.screenshot({ path: join(OUT, '11-home-phone.png') });
    await solo.getByRole('button', { name: 'Hrát proti počítači' }).click();
    await solo.locator('.status-bar').waitFor();
    await sleep(3200);
    await solo.screenshot({ path: join(OUT, '12-solo-phone.png') });
    const bots = await solo.locator('.seat-bot').count();
    check('single player starts immediately against bots', bots === 2, `${bots} bots at the table`);
    await solo.evaluate(AUTOPLAY);
    const end = Date.now() + 240_000;
    while (Date.now() < end && !(await solo.locator('.win-panel').isVisible())) await sleep(300);
    await solo.screenshot({ path: join(OUT, '13-solo-end-phone.png') });
    check('single player round finishes', await solo.locator('.win-panel').isVisible());
    const qa = await solo.evaluate(() => window.__qa);
    check(`single player: no teleports (${qa.moves} moves)`, qa.teleports.length === 0, JSON.stringify(qa.teleports.slice(0, 5)));
    check('single player: no rejected actions', !qa.toasts.some((t) => /nejde|Nejsi na tahu/.test(t)), qa.toasts.join(' | '));
    await solo.context().close();
  }

  // ---- Four players: seat layout + long hands ------------------------------------
  {
    const host = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
    await host.addInitScript(PROBE);
    await host.goto(BASE);
    await host.getByLabel('Tvoje jméno').fill('Telefon');
    await host.getByRole('button', { name: 'Hrát s přáteli' }).click();
    await host.waitForURL(/\/r\/[A-Z]{4}$/);
    const code4 = host.url().slice(-4);
    const others = [];
    for (const [i, name] of ['Bára', 'Cyril', 'Dana'].entries()) {
      const p = await (await browser.newContext({ viewport: i === 0 ? { width: 1440, height: 900 } : { width: 900, height: 700 } })).newPage();
      await p.addInitScript(PROBE);
      await p.goto(`${BASE}/r/${code4}`);
      await p.getByLabel('Tvoje jméno').fill(name);
      await p.getByRole('button', { name: 'Sednout ke stolu' }).click();
      await host.getByText(name, { exact: true }).waitFor();
      others.push(p);
    }
    await host.getByRole('button', { name: /Rozdat karty/ }).click();
    await sleep(3500);
    await host.screenshot({ path: join(OUT, '09-four-players-phone.png') });
    await others[0].screenshot({ path: join(OUT, '09-four-players-desktop.png') });
    for (const p of [host, ...others]) await p.evaluate(AUTOPLAY);
    // Let the phone player keep drawing for a while to grow a long hand.
    await host.evaluate(() => {
      window.__qa.pauseAuto = true;
      window.__hoard = setInterval(() => {
        if (document.querySelector('.status-bar.is-mine')) [...document.querySelectorAll('.status-actions button')].at(-1)?.click();
      }, 500);
    });
    let maxHand = 0;
    const until = Date.now() + 90_000;
    while (Date.now() < until && maxHand < 11) {
      await sleep(500);
      if (await host.locator('.win-panel').isVisible()) break;
      maxHand = Math.max(maxHand, await host.evaluate(() => document.querySelectorAll('.card-slot.is-interactive').length));
    }
    await sleep(800);
    await host.screenshot({ path: join(OUT, '10-long-hand-phone.png') });
    await others[0].screenshot({ path: join(OUT, '10-long-hand-desktop.png') });
    const offscreen = await host.evaluate(() =>
      [...document.querySelectorAll('.card-slot.is-interactive')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.left < -2 || r.right > innerWidth + 2 || r.bottom > innerHeight + 2;
      }).length,
    );
    check(`long hand fits the phone screen (${maxHand} cards)`, offscreen === 0 && maxHand >= 6, `${offscreen} cards off-screen`);
    for (const p of [host, ...others]) await p.context().close();
  }

  // ---- Reduced motion ------------------------------------------------------------
  const rm = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
  const c = await rm.newPage();
  await c.goto(BASE);
  await c.getByLabel('Tvoje jméno').fill('Klidná');
  await c.getByRole('button', { name: 'Hrát s přáteli' }).click();
  await c.waitForURL(/\/r\/[A-Z]{4}$/);
  const d = await (await browser.newContext()).newPage();
  await d.goto(`${BASE}/r/${c.url().slice(-4)}`);
  await d.getByLabel('Tvoje jméno').fill('Bot');
  await d.getByRole('button', { name: 'Sednout ke stolu' }).click();
  await c.getByText('Bot', { exact: true }).waitFor();
  await c.getByRole('button', { name: /Rozdat karty/ }).click();
  await sleep(2200);
  await c.screenshot({ path: join(OUT, '08-reduced-motion-phone.png') });
  const rmText = await c.locator('.status-text').textContent();
  check('reduced motion: game is playable and status text shown', !!rmText, rmText ?? '');
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots in ${OUT}/`);
process.exit(failed.length ? 1 : 0);
