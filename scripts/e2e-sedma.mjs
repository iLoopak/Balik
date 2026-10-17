// Run on a machine where browser access is allowed: npm run dev, then npm run qa:sedma.
// Uses real DOM actions, mixed desktop/touch clients and the live backend. No state injection.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
const base = process.env.BASE ?? 'http://localhost:5173';
const out = process.env.OUT ?? 'output/playwright/sedma';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
try {
  for (const count of [2, 4]) {
    const pages = [];
    for (let i = 0; i < count; i++) {
      const mobile = i === 0;
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion: count === 4 ? 'reduce' : 'no-preference' });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.addInitScript(() => localStorage.setItem('balik.sedma.intro','1'));
      pages.push(page);
    }
    const host = pages[0]; await host.goto(base);
    await host.getByRole('radio',{ name:'Sedma',exact:true }).click();
    await host.getByLabel('Tvoje jméno').fill('Telefon');
    await host.getByRole('button',{name:'Vytvořit hru s přáteli',exact:true}).click();
    await host.waitForURL(/\/r\/[A-Z]{4}$/);
    const code = host.url().slice(-4);
    for (let i=1;i<count;i++) {
      await pages[i].goto(`${base}/r/${code}`);
      await pages[i].getByLabel('Tvoje jméno').fill(`Hráč ${i+1}`);
      await pages[i].getByRole('button',{name:'Sednout ke stolu',exact:true}).click();
      await host.getByText(`Hráč ${i+1}`,{exact:true}).waitFor();
    }
    await host.getByRole('button',{name:/Rozdat karty/}).click();
    await host.locator('.sedma-table[data-idle="true"]').waitFor();
    await host.screenshot({path:join(out,`${count}p-phone-deal.png`)});
    await pages[1].screenshot({path:join(out,`${count}p-desktop-deal.png`)});
    let moves=0; const deadline=Date.now()+180000;
    while (Date.now()<deadline && !(await host.locator('.brand-results').isVisible())) {
      for (const page of pages) {
        if (!(await page.locator('.sedma-table[data-idle="true"]').count())) continue;
        const collect=page.getByRole('button',{name:'Ukončit štych',exact:true});
        const cards=page.locator('.card-slot.is-interactive');
        if (await collect.isVisible()) { await collect.click(); moves++; }
        else if (await cards.count()) {
          await cards.first().click();
          const confirm=page.getByRole('button',{name:'Zahrát',exact:true});
          if (await confirm.isVisible()) await confirm.click();
          moves++;
        }
        if (moves===1) { await page.screenshot({path:join(out,`${count}p-trick.png`)}); }
        if (moves===3 && page===host) {
          await host.reload(); await host.locator('.sedma-table').waitFor();
        }
      }
      await sleep(100);
    }
    assert.ok(await host.locator('.brand-results').isVisible(), `${count}p game must finish`);
    assert.ok((await host.locator('.brand-result-note').textContent()).includes('bodů'));
    await host.screenshot({path:join(out,`${count}p-phone-result.png`)});
    await pages[1].screenshot({path:join(out,`${count}p-desktop-result.png`)});
    await host.getByRole('button',{name:'Odveta',exact:true}).click();
    await host.locator('.sedma-table[data-idle="true"]').waitFor();
    assert.equal(await host.locator('.brand-results').count(),0);
    for (const page of pages) await page.context().close();
    console.log(`PASS: ${count} players, desktop + touch phone, full game + rematch`);
  }
  assert.deepEqual(errors,[]);
} finally { await browser.close(); }
