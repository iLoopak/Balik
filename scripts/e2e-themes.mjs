// Run only where browser access is allowed: npm run dev, then npm run qa:themes.
// Uses real CardView/Deck Lab and two real clients. Not executed in the restricted environment.
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
const base=process.env.BASE??'http://localhost:5173',out=process.env.OUT??'qa-output/themes/browser';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:!process.env.HEADED});
const errors=[];
const imageReady=page=>page.waitForFunction(()=>[...document.querySelectorAll('.lab-grid img')].every(i=>i.complete&&i.naturalWidth>0));
try {
  for(const mobile of [false,true])for(const reduced of [false,true]){
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:reduced?'reduce':'no-preference'});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(base+'/dev/decks');
    assert.equal(await page.locator('.lab-grid .card').count(),32);
    await page.locator('.lab-grid .card').evaluateAll(els=>els.forEach((el,i)=>el.dataset.qaIdentity=String(i)));
    await page.getByLabel('Mobilní stůl',{exact:true}).setChecked(mobile);
    await page.getByLabel('Omezit pohyb',{exact:true}).setChecked(reduced);
    for(const deck of ['stormpunk','retro-arcade']){
      await page.getByLabel('Edice',{exact:true}).selectOption(deck);
      await page.getByLabel('Stůl',{exact:true}).selectOption(deck);
      await imageReady(page);
      assert.deepEqual(await page.locator('.lab-grid .card').evaluateAll(els=>els.map(el=>el.dataset.qaIdentity)),Array.from({length:32},(_,i)=>String(i)));
      assert.equal(await page.locator(`.lab-grid .card[data-deck="${deck}"]`).count(),32);
      assert.equal(await page.locator('.lab-grid [data-layer="sticker"] img').count(),32);
      assert.equal(await page.locator(`.lab-table [data-table-theme="${deck}"]`).count(),1);
      await page.screenshot({path:join(out,`${deck}-${mobile?'phone':'desktop'}-${reduced?'reduced':'motion'}.png`),fullPage:true});
      await page.locator('.lab-table').screenshot({path:join(out,`${deck}-table-${mobile?'phone':'desktop'}-${reduced?'reduced':'motion'}.png`)});
      await page.getByLabel('Malé karty',{exact:true}).check();await imageReady(page);
      assert.ok(await page.locator('.lab-grid .lab-card').first().evaluate(el=>el.getBoundingClientRect().width<=72));
      await page.getByRole('button',{name:'Přehrát sticker',exact:true}).click();
      if(reduced)assert.equal(await page.locator('.lab-grid .card-sticker img').first().evaluate(el=>getComputedStyle(el).animationName),'none');
      await page.getByLabel('Rub',{exact:true}).check();
      assert.equal(await page.locator('.lab-grid [data-layer="sticker"]').count(),0);
      assert.equal(await page.locator(`.lab-grid img[src="/decks/${deck}/back.svg"]`).count(),32);
      await page.getByLabel('Rub',{exact:true}).uncheck();await page.getByLabel('Malé karty',{exact:true}).uncheck();
    }
    await context.close();
  }
  for(const game of ['prsi','sedma']){
    const hostContext=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    const guestContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const host=await hostContext.newPage(),guest=await guestContext.newPage();
    for(const page of [host,guest]){page.on('pageerror',e=>errors.push(String(e)));await page.addInitScript(()=>localStorage.setItem('balik.sedma.intro','1'));}
    await host.goto(base);await host.getByRole('radio',{name:game==='prsi'?'Prší':'Sedma',exact:true}).click();
    await host.getByLabel('Tvoje jméno').fill('Ada');await host.getByRole('button',{name:'Hrát s přáteli',exact:true}).click();
    await host.waitForURL(/\/r\/[A-Z]{4}$/);const url=host.url();
    await guest.goto(url);await guest.getByLabel('Tvoje jméno').fill('Max');await guest.getByRole('button',{name:'Sednout ke stolu',exact:true}).click();
    await host.getByText('Max',{exact:true}).waitFor();await host.getByRole('button',{name:/Rozdat karty/}).click();
    await host.locator('.game-screen').waitFor();
    await host.waitForFunction(async()=>{const {useApp}=await import('/src/net/store.ts');return !!useApp.getState().room?.game;});
    // No bots or moves: after the opening deal this entire game view must remain equal.
    await host.waitForTimeout(6000);
    const state=page=>page.evaluate(async()=>{const {useApp}=await import('/src/net/store.ts');const r=useApp.getState().room;return {seq:r.seq,round:r.round,game:r.game};});
    const before=await state(host);
    await host.locator('.card-slot').evaluateAll(els=>els.forEach((el,i)=>el.dataset.qaIdentity=String(i)));
    const nodeIds=await host.locator('.card-slot').evaluateAll(els=>els.map(el=>el.dataset.qaIdentity));
    await host.getByRole('button',{name:'Vzhled karet a stolu',exact:true}).click();
    const dialog=host.getByRole('dialog',{name:'Vzhled u tvého stolu',exact:true});await dialog.waitFor();
    await dialog.getByRole('button',{name:/Retro Arcade/}).click();await dialog.getByRole('button',{name:/Noční herna/}).click();
    await dialog.getByRole('button',{name:'Zavřít vzhled',exact:true}).click();
    assert.deepEqual(await state(host),before);assert.deepEqual(await host.locator('.card-slot').evaluateAll(els=>els.map(el=>el.dataset.qaIdentity)),nodeIds);
    assert.ok(await host.locator('.card-slot .card[data-deck="retro-arcade"]').count()>0);
    assert.ok(await guest.locator('.card-slot .card[data-deck="stormpunk"]').count()>0);
    await host.screenshot({path:join(out,`${game}-live-retro.png`)});await guest.screenshot({path:join(out,`${game}-live-stormpunk-phone.png`)});
    await host.reload();await host.locator('.game-screen').waitFor();assert.deepEqual(await state(host),before);
    assert.ok(await host.locator('.card-slot .card[data-deck="retro-arcade"]').count()>0);
    await guest.getByLabel('Poslat reakci').click();await guest.locator('.emote-options button').first().click();await host.locator('.emote-bubble').first().waitFor();
    await hostContext.close();await guestContext.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS: both editions, 32 stable cards, desktop/mobile/reduced, independent table, private backs, two live games, reload and emote.');
}finally{await browser.close();}
