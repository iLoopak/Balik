// Optional raster QA tool: SHARP_MODULE=/absolute/path/to/sharp npm run qa:assets
// Sharp is tooling only; the game and its build need no raster library.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,statSync,copyFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE??'sharp');
const out=process.env.OUT??'qa-output/themes'; mkdirSync(out,{recursive:true});
const entries=JSON.parse(readFileSync('packages/web/src/themes/decks/retro-arcade/manifest.json','utf8'));
const root='packages/web/public', report=[];
for(const e of entries){
  const src=root+e.stickerAsset, bytes=readFileSync(src);
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let minX=info.width,minY=info.height,maxX=-1,maxY=-1,opaque=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);opaque++;}
  assert.equal(info.width,256); assert.equal(info.height,256);
  assert.ok(minX>=6&&minY>=6&&maxX<250&&maxY<250,`${e.card.id}: subject must not clip`);
  assert.ok(opaque/(256*256)>.15&&opaque/(256*256)<.75,`${e.card.id}: transparent subject, no full card`);
  await sharp(bytes).resize(48,48).png().toFile(`${out}/${e.card.id}-48.png`);
  report.push({id:e.card.id,bytes:statSync(src).size,bounds:[minX,minY,maxX,maxY],coverage:Number((opaque/(256*256)).toFixed(3))});
}
const images=entries.map((e,i)=>{
 const x=i%8*200,y=Math.floor(i/8)*226+65;
 const asset=readFileSync(root+e.stickerAsset).toString('base64');
 return `<image x="${x+13}" y="${y}" width="174" height="174" href="data:image/svg+xml;base64,${asset}"/><text x="${x+16}" y="${y+193}" fill="#F5C544" font-size="13">${e.card.id}</text><text x="${x+16}" y="${y+212}" fill="#fff9e9" font-size="12">${e.name}</text>`;
});
const sheet=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="980" font-family="sans-serif"><rect width="1600" height="980" fill="#18152D"/><text x="30" y="42" fill="#fff9e9" font-size="26">BALÍK / RETRO ARCADE — skutečné assety, nikoli screenshot hry</text>${images.join('')}</svg>`;
writeFileSync(`${out}/retro-contact.svg`,sheet); await sharp(Buffer.from(sheet)).png().toFile(`${out}/retro-contact.png`);
const tiny=`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="450"><rect width="720" height="450" fill="#fff9e9"/>${entries.map((e,i)=>{let x=35+i%8*86,y=25+Math.floor(i/8)*105;return `<image x="${x}" y="${y}" width="48" height="48" href="data:image/svg+xml;base64,${readFileSync(root+e.stickerAsset).toString('base64')}"/><text x="${x-3}" y="${y+68}" fill="#202338" font-size="11" font-family="sans-serif">${e.card.id}</text>`}).join('')}</svg>`;
await sharp(Buffer.from(tiny)).png().toFile(`${out}/retro-small.png`);
copyFileSync(`${out}/retro-contact.png`,'docs/visual/retro-arcade-contact.png');
copyFileSync(`${out}/retro-small.png`,'docs/visual/retro-arcade-small.png');
writeFileSync('docs/visual/RETRO_ARCADE_ASSET_AUDIT.json',JSON.stringify({method:'Sharp SVG rasterization at 256 and 48 px; alpha bounds threshold 8/255; not live browser QA',totalBytes:report.reduce((n,r)=>n+r.bytes,0),assets:report},null,2)+'\n');
console.log(`PASS: ${report.length} SVGs rasterize, no clipping, transparent backgrounds; ${report.reduce((n,r)=>n+r.bytes,0)} bytes total.`);
