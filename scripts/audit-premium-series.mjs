// Contact sheets and technical export QA. Visual acceptance remains a separate review.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import definitions from './art/editions.mjs';
const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE??'sharp');
const draft=process.argv.includes('--draft'),dir='docs/visual/premium-series';mkdirSync(dir,{recursive:true});
const jobs=readdirSync(`${dir}/generated`).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(`${dir}/generated/${f}`))).filter(e=>e.stickerAsset&&existsSync('packages/web/public'+e.stickerAsset));
const suits=['hearts','diamonds','clubs','spades'],ranks=['7','8','9','10','J','Q','K','A'];
const report=[];
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
for(const deck of ['biopunk','panelak-3000','chalupa','papirovy-cirkus']){
 const def=definitions.find(d=>d.id===deck),entries=suits.flatMap(suit=>ranks.map(rank=>jobs.find(e=>e.deck===deck&&e.card.suit===suit&&e.card.rank===rank)));
 const available=entries.filter(Boolean);if(!draft)assert.equal(available.length,32,`${deck}: incomplete`);
 const assets=[],hashes=new Set();
 const thumbs={};
 for(const entry of available){
  const path='packages/web/public'+entry.stickerAsset,bytes=readFileSync(path),meta=await sharp(bytes).metadata();
  assert.ok(meta.hasAlpha);assert.ok(meta.width<=768&&meta.height<=768);hashes.add(createHash('sha256').update(bytes).digest('hex'));
  const{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let minX=info.width,minY=info.height,maxX=-1,maxY=-1,opaque=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);opaque++;}
  assert.ok(minX>=24&&minY>=24&&maxX<info.width-24&&maxY<info.height-24,`${entry.id}: transparent margins`);
  const coverage=opaque/(info.width*info.height);assert.ok(coverage>.1&&coverage<.9);
  assets.push({card:entry.card.id,bytes:bytes.length,width:info.width,height:info.height,coverage:Number(coverage.toFixed(3)),bounds:[minX,minY,maxX,maxY],sourceEdgePixels:entry.sourceEdgePixels??null});
  for(const size of [48,174])thumbs[`${entry.id}:${size}`]=(await sharp(bytes).resize(size,size,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()).toString('base64');
 }
 assert.equal(hashes.size,available.length,`${deck}: duplicate image content`);
 for(const small of [false,true]){
  const cellW=small?100:200,cellH=small?100:225,size=small?48:174,head=55;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${cellW*8}" height="${head+cellH*4}" font-family="sans-serif"><rect width="100%" height="100%" fill="${small?'#FFF9E8':def.bg}"/><text x="20" y="30" fill="${small?'#202735':def.accent}" font-size="${small?16:23}">BALÍK / ${esc(def.name)} / ${available.length} z 32${small?' / 48 px':''}</text>${entries.map((entry,i)=>{
   const x=i%8*cellW,y=Math.floor(i/8)*cellH+head;
   return entry?`<image x="${x+(cellW-size)/2}" y="${y}" width="${size}" height="${size}" href="data:image/png;base64,${thumbs[`${entry.id}:${size}`]}"/><text x="${x+9}" y="${y+size+17}" fill="${small?'#202735':def.accent}" font-size="10">${entry.card.id}</text>${small?'':`<text x="${x+9}" y="${y+size+34}" fill="#FFF9E8" font-size="10">${esc(entry.name)}</text>`}`:`<text x="${x+15}" y="${y+size/2}" fill="${small?'#687073':'#74818A'}" font-size="11">ČEKÁ NA ILUSTRACI</text>`;
  }).join('')}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`${dir}/${deck}-${small?'small':'contact'}.png`);
 }
 report.push({deck,count:available.length,totalBytes:assets.reduce((n,a)=>n+a.bytes,0),assets});
 console.log(`${deck}: ${available.length}/32, ${report.at(-1).totalBytes} bytes, transparent padded WebPs.`);
}
writeFileSync(`${dir}/asset-audit.json`,JSON.stringify({method:'Decoded alpha, dimensions, transparent margins and 48px/174px contact sheets. Not an artistic quality score.',decks:report},null,2)+'\n');
