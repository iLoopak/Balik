// For an environment with browser permission. Not executed in the sandbox that blocks localhost.
// Card clicks go through the element itself: this script checks the evening flow; real hit
// targets and touch are covered by qa:experience and qa:e2e.
// npm run dev, then npm run qa:evening (REDUCED=1 for the same flow without animation).
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {chromium} from 'playwright-core';
const base=process.env.BASE??'http://localhost:5173', out=process.env.OUT??'output/playwright/evening';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:!process.env.HEADED});
const errors=[];
const pause=(ms)=>new Promise(r=>setTimeout(r,ms));
try{
  const contexts=await Promise.all([
    browser.newContext({viewport:{width:1440,height:900},reducedMotion:process.env.REDUCED?'reduce':'no-preference'}),
    browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:process.env.REDUCED?'reduce':'no-preference'})
  ]);
  const pages=await Promise.all(contexts.map(c=>c.newPage()));const [host,guest]=pages;
  for(const page of pages){page.on('pageerror',e=>errors.push(String(e)));await page.addInitScript(()=>localStorage.setItem('balik.sedma.intro','1'));}
  await host.goto(base);await host.getByLabel('Tvoje jméno').fill('Anna');await host.getByRole('button',{name:'Hrát s přáteli',exact:true}).click();
  await host.waitForURL(/\/r\/[A-Z]{4}$/);const roomUrl=host.url();
  await guest.goto(roomUrl);await guest.getByLabel('Tvoje jméno').fill('Bára');await guest.getByRole('button',{name:'Sednout ke stolu',exact:true}).click();
  await host.getByText('Bára',{exact:true}).waitFor();await host.getByRole('button',{name:/Rozdat karty/}).click();
  for(let match=1;match<=3;match++){
    const end=Date.now()+240000;
    while(Date.now()<end&&!(await host.locator('.brand-results').isVisible())){
      for(const page of pages){
        const skip=page.getByRole('button',{name:'Přeskočit animaci',exact:true});if(await skip.isVisible())await skip.click();
        const suit=page.locator('.picker-option');if(await suit.first().isVisible()){await suit.first().click({timeout:3000}).catch(()=>{});continue;}
        if(await page.locator('.sedma-table[data-idle="true"]').count()){
          const collect=page.getByRole('button',{name:'Ukončit štych',exact:true});
          if(await collect.isVisible())await collect.click();
          else{const cards=page.locator('.card-slot.is-interactive');if(await cards.count()){await cards.first().evaluate(el=>el.click());const confirm=page.getByRole('button',{name:'Zahrát',exact:true});if(await confirm.isVisible())await confirm.click();}}
        }else if(await page.locator('.status-bar.is-mine').count()){
          const playable=page.locator('.card-slot').filter({has:page.locator('.card-fx.is-playable')});
          if(await playable.count())await playable.first().evaluate(el=>el.click());else{const button=page.locator('.status-actions button');if(await button.count())await button.first().click();}
        }
      }
      await pause(250);
    }
    assert.ok(await host.locator('.brand-results').isVisible(),`match ${match} finishes`);
    for(const [i,page] of pages.entries()){assert.equal(page.url(),roomUrl);await page.screenshot({path:join(out,`${match}-result-${i?'phone':'desktop'}.png`)});}
    if(match===3)break;
    await host.getByRole('button',{name:'Změnit hru',exact:true}).click();
    await host.getByRole('heading',{name:'Co dáme dál?',exact:true}).waitFor();
    if(match===1){await host.reload();await host.getByRole('heading',{name:'Co dáme dál?',exact:true}).waitFor();}
    const game=match===1?'Sedma':'Prší',index=match===1?1:0;
    for(const page of pages)await page.locator('.evening-game-option').nth(index).locator('button').first().click();
    for(const [i,page] of pages.entries())await page.screenshot({path:join(out,`${match}-vote-${i?'phone':'desktop'}.png`)});
    await host.getByRole('button',{name:`Rozdat ${game}`,exact:true}).click();
    await host.locator('.game-screen').waitFor();
  }
  await host.getByRole('button',{name:'Konec večera',exact:true}).click();
  await host.getByRole('heading',{name:'To byl večer.',exact:true}).waitFor();
  assert.equal(await host.locator('.evening-history .evening-match').count(),3);
  for(const [i,page] of pages.entries())await page.screenshot({path:join(out,`summary-${i?'phone':'desktop'}.png`)});
  await host.getByRole('button',{name:'Zpět na úvod',exact:true}).click();await host.waitForURL(base+'/');
  assert.deepEqual(errors,[]);console.log('PASS: desktop/touch phone, Prší → Sedma → Prší, vote reload, same URL, history and end summary.');
}finally{await browser.close();}
