// Optional tooling: SHARP_MODULE=/absolute/path/to/sharp npm run qa:world-assets
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
import definitions from './art/editions.mjs';
const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE??'sharp');
const out='qa-output/world-editions'; mkdirSync(out,{recursive:true});
const report=[],failures=[];
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
for(const d of definitions){
 const entries=JSON.parse(readFileSync(`packages/web/src/themes/decks/${d.id}/manifest.json`));
 const assets=[];
 for(const entry of entries){
  const path='packages/web/public'+entry.stickerAsset,bytes=readFileSync(path);
  const {data,info}=await sharp(bytes).resize(256,256,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,256);assert.equal(info.height,256);
  let minX=256,minY=256,maxX=-1,maxY=-1,opaque=0;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(data[(y*256+x)*4+3]>8){
   minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);opaque++;
  }
  assets.push({card:entry.card.id,bytes:statSync(path).size,bounds:[minX,minY,maxX,maxY],coverage:Number((opaque/65536).toFixed(3))});
  if(!(minX>=6&&minY>=6&&maxX<250&&maxY<250)) {
   const failure=`${d.id}/${entry.card.id}: bounds ${[minX,minY,maxX,maxY]}`;
   console.error(failure); failures.push(failure);
  }
  assert.ok(opaque/65536>.1&&opaque/65536<.8,`${d.id}/${entry.card.id}: transparent subject coverage`);
 }
 const embedded=await Promise.all(entries.map(async entry=>(await sharp('packages/web/public'+entry.stickerAsset).png().toBuffer()).toString('base64')));
 const sheet=(small)=>{
  const cellW=small?100:200,cellH=small?99:224,size=small?48:174,head=small?40:60;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cellW*8}" height="${cellH*4+head}" font-family="sans-serif"><rect width="100%" height="100%" fill="${small?'#FFF9E8':d.bg}"/><text x="20" y="28" fill="${small?'#202735':d.accent}" font-size="${small?16:24}">BALÍK / ${esc(d.name)}${small?' / 48 px':''}</text>${entries.map((entry,i)=>{
   const x=i%8*cellW+(cellW-size)/2,y=Math.floor(i/8)*cellH+head;
   return `<image x="${x}" y="${y}" width="${size}" height="${size}" href="data:image/png;base64,${embedded[i]}"/><text x="${i%8*cellW+10}" y="${y+size+17}" fill="${small?'#202735':d.accent}" font-size="${small?10:12}">${entry.card.id}</text>${small?'':`<text x="${i%8*cellW+10}" y="${y+size+35}" fill="#FFF9E8" font-size="10">${esc(entry.name)}</text>`}`;
  }).join('')}</svg>`;
 };
 for(const small of [false,true]){
  const svg=sheet(small),suffix=small?'small':'contact';writeFileSync(`${out}/${d.id}-${suffix}.svg`,svg);
  await sharp(Buffer.from(svg)).png().toFile(`docs/visual/${d.id}-${suffix}.png`);
 }
 // Back also rasterizes; it may contain the permanent BALÍK brand and edition name.
 await sharp(`packages/web/public/decks/${d.id}/back.svg`).resize(200,280).png().toFile(`${out}/${d.id}-back.png`);
 report.push({edition:d.id,totalBytes:assets.reduce((sum,a)=>sum+a.bytes,0),assets});
 console.log(`Rasterized ${d.name}: ${assets.length} transparent stickers, 256/48px, back.`);
}
writeFileSync('docs/visual/WORLD_EDITIONS_ASSET_AUDIT.json',JSON.stringify({method:'Sharp decoding normalized to 256 and 48px; alpha threshold 8/255; technical check, not an artistic quality score',editions:report},null,2)+'\n');
assert.deepEqual(failures,[], 'All subjects must leave a safe margin around alpha bounds');
console.log('PASS: 128 active stickers have transparent margins and safe alpha bounds.');
