// Run with browser permission: npm run dev; npm run qa:lhar (REDUCED=1 for static reveal).
// Reads only each client's own redacted view, then operates visible UI.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { chooseLharBotFromView, mulberry32, SUIT_NAME_CS } from '@balik/shared';
const base = process.env.BASE ?? 'http://localhost:5173',
  out = process.env.OUT ?? 'qa-output/lhar';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED }),
  errors = [];
const read = (page) =>
  page.evaluate(async () => {
    const { useApp } = await import('/src/net/store.ts');
    return useApp.getState().room;
  });
try {
  const contexts = await Promise.all([
    browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference',
    }),
    browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference',
    }),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    [host, guest] = pages;
  for (const page of pages) page.on('pageerror', (e) => errors.push(String(e)));
  await host.goto(base);
  await host.getByRole('radio', { name: 'Lhář', exact: true }).click();
  await host.getByLabel('Tvoje jméno').fill('Ada');
  await host.getByRole('button', { name: 'Hrát s přáteli', exact: true }).click();
  await host.waitForURL(/\/r\/[A-Z]{4}$/);
  const url = host.url();
  await guest.goto(url);
  await guest.getByLabel('Tvoje jméno').fill('Max');
  await guest.getByRole('button', { name: 'Sednout ke stolu', exact: true }).click();
  await host.getByText('Max', { exact: true }).waitFor();
  // Different local editions in the very same room.
  await guest.getByRole('button', { name: 'Vzhled karet a stolu', exact: true }).click();
  const appearance = guest.getByRole('dialog', { name: 'Vzhled u tvého stolu', exact: true });
  await appearance.getByRole('button', { name: /Retro Arcade/ }).click();
  await appearance.getByRole('button', { name: /Noční herna/ }).click();
  await appearance.getByRole('button', { name: 'Zavřít vzhled', exact: true }).click();
  await host.getByRole('button', { name: /Rozdat karty/ }).click();
  for (const page of pages) {
    await page.getByRole('dialog', { name: /1\/3 · Polož tajné karty/ }).waitFor();
    await page.getByRole('button', { name: 'Dál', exact: true }).click();
    await page.getByRole('button', { name: 'Dál', exact: true }).click();
    await page.getByRole('button', { name: 'Jdeme hrát', exact: true }).click();
  }
  const challengeHelpSeen = new Set();
  for (let turn = 0; turn < 1000; turn++) {
    const rooms = await Promise.all(pages.map(read));
    if (rooms[0].status === 'finished') break;
    const index = rooms.findIndex((r) => r.you === rooms[0].game.currentPlayerId),
      page = pages[index],
      room = rooms[index];
    await page.locator('.lhar-table[data-idle="true"]').waitFor();
    let action = chooseLharBotFromView(room.game, room.you, mulberry32(turn + 9));
    if (turn === 0)
      action = {
        type: 'lharPlay',
        cardIds: [room.game.myHand.find((c) => c.rank !== '7').id],
        declaredRank: '7',
      };
    if (turn === 1) action = { type: 'lharChallenge', claimId: room.game.lastClaim.id };
    if (action.type === 'lharPlay') {
      await page.locator('.lhar-actions .btn-primary').click();
      const picker = page.getByRole('dialog', {
        name: `Tvoje tvrzení: ${room.game.requiredRank}`,
        exact: true,
      });
      for (const id of action.cardIds) {
        const c = room.game.myHand.find((c) => c.id === id);
        await picker.getByRole('button', { name: `${c.rank} ${SUIT_NAME_CS[c.suit]}`, exact: true }).click();
      }
      await picker
        .getByRole('button', {
          name: new RegExp(`Položit ${action.cardIds.length}× ${room.game.requiredRank} rubem`),
        })
        .click();
    } else if (action.type === 'lharChallenge') {
      await page.getByRole('button', { name: 'Nevěřím · LHÁŘ!', exact: true }).click();
      const help = page.getByRole('dialog', { name: 'Co udělá výzva?', exact: true });
      if (!challengeHelpSeen.has(index)) {
        await help.waitFor();
        if (turn === 1) await page.screenshot({ path: join(out, 'challenge-decision.png') });
        await help.getByRole('button', { name: /Zpochybnit/ }).click();
        challengeHelpSeen.add(index);
      }
    } else await page.getByRole('button', { name: 'Věřím · potvrdit výhru', exact: true }).click();
    if (turn === 1) {
      // Both cues are persistent long enough for the reduced-motion run too.
      await Promise.all(
        pages.map((p, i) =>
          p
            .locator('.lhar-resolution.is-reveal')
            .waitFor()
            .then(() =>
              p.screenshot({ path: join(out, `reveal-${i ? 'phone-retro' : 'desktop-stormpunk'}.png`) }),
            ),
        ),
      );
      await host.locator('.lhar-resolution.is-take').waitFor();
      await host.screenshot({ path: join(out, 'pickup-desktop.png') });
    }
    await Promise.all(
      pages.map((p) =>
        p.waitForFunction(async (seq) => {
          const { useApp } = await import('/src/net/store.ts');
          return (useApp.getState().room?.seq ?? 0) > seq;
        }, room.seq),
      ),
    );
    if (turn === 0) {
      for (const [i, p] of pages.entries()) {
        await p.locator('.lhar-table[data-idle="true"]').waitFor();
        assert.equal(await p.locator('[data-zone="discard"] .card-front').count(), 0);
        await p.screenshot({ path: join(out, `claim-${i ? 'phone-retro' : 'desktop-stormpunk'}.png`) });
      }
      await guest.reload();
      await guest.locator('.lhar-table[data-idle="true"]').waitFor();
      assert.equal((await read(guest)).game.lastClaim.id, 1);
    }
  }
  for (const [i, p] of pages.entries()) {
    await p.locator('.brand-results').waitFor();
    await p.screenshot({ path: join(out, `result-${i ? 'phone-retro' : 'desktop-stormpunk'}.png`) });
    assert.equal(p.url(), url);
  }
  const final = await read(host);
  assert.equal(final.evening.gameCounts.lhar, 1);
  assert.equal(final.evening.history[0].winnerIds.length, 1);
  await host.getByRole('button', { name: 'Změnit hru', exact: true }).click();
  await host.getByRole('heading', { name: 'Co dáme dál?', exact: true }).waitFor();
  for (const page of pages)
    await page
      .locator('.evening-game-option')
      .filter({ has: page.getByText('Prší', { exact: true }) })
      .locator('button')
      .first()
      .click();
  await host.getByRole('button', { name: 'Rozdat Prší', exact: true }).click();
  await host.locator('.game-screen').waitFor();
  assert.equal((await read(host)).gameId, 'prsi');
  assert.equal(host.url(), url);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: desktop/phone, different editions, onboarding, private claim, challenge/reveal/pickup, reconnect, full Lhář and transition to Prší.',
  );
} finally {
  await browser.close();
}
