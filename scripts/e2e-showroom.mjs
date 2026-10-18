// Appearance showroom QA: every deck × every table × light/dark, switched live in a running game.
//   npm run dev, then npm run qa:showroom   (BASE=http://localhost:5173 by default; needs Google Chrome)
// Decks and tables come from the registry, so new editions are covered without editing this file.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { DECK_THEMES, TABLE_THEMES } from '../packages/web/src/themes/registry.ts';

const base = process.env.BASE ?? 'http://localhost:5173', out = process.env.OUT ?? 'qa-output/showroom';
mkdirSync(out, { recursive: true });
const decks = Object.keys(DECK_THEMES), tables = Object.keys(TABLE_THEMES);
const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED });
const errors = [];
const watch = (page, who) => {
  page.on('pageerror', (e) => errors.push(`${who}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/WebSocket/.test(m.text())) errors.push(`${who}: ${m.text()}`); });
};
const state = (page) => page.evaluate(async () => {
  const { useApp } = await import('/src/net/store.ts');
  const r = useApp.getState().room;
  return { seq: r.seq, round: r.round, game: r.game };
});
const brokenImages = (page) => page.locator('.table img').evaluateAll((els) => els.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
let combos = 0;
try {
  for (const mode of ['dark', 'light']) {
    const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: mode, reducedMotion: 'reduce' });
    const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: mode, reducedMotion: 'reduce' });
    const host = await hostContext.newPage(), guest = await guestContext.newPage();
    watch(host, `host-${mode}`); watch(guest, `guest-${mode}`);
    for (const page of [host, guest]) await page.addInitScript((m) => { localStorage.setItem('balik.colorMode', m); localStorage.setItem('balik.guide', JSON.stringify({ off: ['prsi'], seen: [] })); }, mode);
    await host.goto(base);
    await host.getByRole('radio', { name: 'Prší', exact: true }).click();
    await host.getByLabel('Tvoje jméno').fill('Ada');
    await host.getByRole('button', { name: 'Hrát s přáteli', exact: true }).click();
    await host.waitForURL(/\/r\/[A-Z]{4}$/);
    await guest.goto(host.url()); await guest.getByLabel('Tvoje jméno').fill('Max');
    await guest.getByRole('button', { name: 'Sednout ke stolu', exact: true }).click();
    await host.getByText('Max', { exact: true }).waitFor();
    await host.getByRole('button', { name: /Rozdat karty/ }).click();
    await host.locator('.game-screen').waitFor(); await guest.locator('.game-screen').waitFor();
    // Nobody moves: the authoritative game must stay identical while the look changes.
    await host.waitForTimeout(4500);
    const before = await state(host);
    await host.locator('.card-slot').evaluateAll((els) => els.forEach((el, i) => { el.dataset.qaIdentity = String(i); }));
    const identity = await host.locator('.card-slot').evaluateAll((els) => els.map((el) => el.dataset.qaIdentity));
    const guestDeck = await guest.locator('.card-slot .card').first().getAttribute('data-deck');
    assert.equal(await host.evaluate(() => document.documentElement.dataset.colorMode), mode);

    for (const table of tables) for (const deck of decks) {
      await host.getByRole('button', { name: 'Vzhled karet a stolu', exact: true }).click();
      const dialog = host.getByRole('dialog', { name: 'Vzhled u tvého stolu', exact: true });
      await dialog.waitFor();
      await dialog.locator(`.edition-option.is-${deck}`).click();
      await dialog.locator(`.table-options button:has(.table-stage[data-table="${table}"])`).click();
      assert.equal(await dialog.locator(`.showroom-preview .table-stage[data-deck="${deck}"][data-table="${table}"]`).count(), 1, 'preview follows the choice');
      assert.ok(await dialog.locator(`.showroom-preview .card[data-deck="${deck}"]`).count() > 0, `${deck}: preview uses the real deck`);
      await dialog.getByRole('button', { name: 'Zavřít vzhled', exact: true }).click();
      await host.waitForTimeout(250);
      assert.deepEqual(await state(host), before, `${deck}/${table}/${mode}: game untouched`);
      assert.deepEqual(await host.locator('.card-slot').evaluateAll((els) => els.map((el) => el.dataset.qaIdentity)), identity, 'cards keep their identity');
      assert.ok(await host.locator(`.card-slot .card[data-deck="${deck}"]`).count() > 0, `${deck}: table cards switched`);
      assert.equal(await host.locator(`.table .game-table-theme[data-table-theme="${table}"][data-color-mode="${mode}"]`).count(), 1, `${table}/${mode}: table material`);
      assert.deepEqual(await brokenImages(host), [], `${deck}: no broken artwork`);
      assert.equal(await guest.locator('.card-slot .card').first().getAttribute('data-deck'), guestDeck, 'the other player keeps their own look');
      await host.locator('.table').screenshot({ path: join(out, `${mode}-${table}-${deck}.png`) });
      combos++;
    }
    // Choices survive a reload (last one written: the final deck, Kontrast included in the run).
    await host.reload(); await host.locator('.game-screen').waitFor();
    assert.ok(await host.locator(`.card-slot .card[data-deck="${decks.at(-1)}"]`).count() > 0, 'deck persisted');
    assert.equal(await host.locator(`.table .game-table-theme[data-table-theme="${tables.at(-1)}"]`).count(), 1, 'table persisted');
    await guest.screenshot({ path: join(out, `${mode}-guest-phone.png`) });
    await hostContext.close(); await guestContext.close();
  }

  // "Podle systému" is a way of choosing, not a third palette: it follows the device live.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  const page = await ctx.newPage(); watch(page, 'system');
  await page.goto(base);
  await page.getByRole('button', { name: 'Vzhled karet a stolu', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Vzhled u tvého stolu', exact: true });
  await dialog.getByRole('button', { name: /Podle systému/ }).click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.colorMode), 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForFunction(() => document.documentElement.dataset.colorMode === 'light');
  await dialog.locator('.edition-option.is-kontrast').click();
  await dialog.screenshot({ path: join(out, 'system-light-showroom-phone.png') });
  await page.reload();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('balik.appearance')).deck), 'kontrast', 'Kontrast is kept');
  assert.equal(await page.evaluate(() => localStorage.getItem('balik.colorMode')), 'system');
  await ctx.close();

  assert.deepEqual(errors, []);
  console.log(`PASS: ${combos} deck × table × mode combinations switched live without touching the game; system mode follows the device; choices persist.`);
} finally {
  await browser.close();
}
