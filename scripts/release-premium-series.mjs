// Call after inspecting completed contact sheets; verify the assembled CardView galleries before completion.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
const dir='docs/visual/premium-series',review=JSON.parse(readFileSync(`${dir}/visual-review.json`));
const jobs=readdirSync(`${dir}/generated`).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(`${dir}/generated/${f}`)));
const suits=['hearts','diamonds','clubs','spades'],ranks=['7','8','9','10','J','Q','K','A'];
const known=['biopunk','panelak-3000','chalupa','papirovy-cirkus'];
const targets=process.argv.length>2?process.argv.slice(2):known;
for(const deck of targets){
 assert.ok(known.includes(deck),`Unknown deck ${deck}`);
 assert.equal(review[deck]?.acceptedForIntegration,true,`${deck}: visual review required`);
 const manifest=suits.flatMap(suit=>ranks.map(rank=>{
  const entry=jobs.find(e=>e.deck===deck&&e.card.suit===suit&&e.card.rank===rank);assert.ok(entry?.stickerAsset&&existsSync('packages/web/public'+entry.stickerAsset),`${deck}/${suit}-${rank}: missing illustration`);
  return {card:entry.card,name:entry.name,meaning:entry.meaning,archetype:entry.archetype,stickerAsset:entry.stickerAsset};
 }));
 assert.equal(new Set(manifest.map(e=>e.stickerAsset)).size,32);
 writeFileSync(`packages/web/src/themes/decks/${deck}/premium-manifest.json`,JSON.stringify(manifest,null,2)+'\n');
}
console.log('Reviewed premium manifests prepared. Run art:worlds to rebuild the shared registry.');
