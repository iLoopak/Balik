// Export only: alpha-aware crop, padding, resize and encode. No artwork is painted here.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,renameSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE??'sharp');
const provenance=JSON.parse(readFileSync('docs/visual/premium-poc/provenance.json'));
const decisions=JSON.parse(readFileSync('docs/visual/premium-poc/art-decisions.json'));
const dir='packages/web/public/decks/art-poc';mkdirSync(dir,{recursive:true});
const rows=[];
for(const entry of provenance.entries){
 const {data,info}=await sharp(entry.source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.channels,4);
 let minX=info.width,minY=info.height,maxX=-1,maxY=-1,clear=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const alpha=data[(y*info.width+x)*4+3];if(alpha===0)clear++;
  if(alpha>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 }
 assert.ok(clear/(info.width*info.height)>.15,`${entry.id}: expected genuinely transparent source`);
 assert.ok(maxX>minX&&maxY>minY);
 const stem=entry.assetVersion?`${entry.id}-${entry.assetVersion}`:entry.id;
 const file=`${dir}/${stem}.webp`,temp=file+'.tmp';
 await sharp(entry.source).extract({left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1})
  .resize(704,704,{fit:'inside',withoutEnlargement:true})
  .extend({top:32,bottom:32,left:32,right:32,background:{r:0,g:0,b:0,alpha:0}})
  .webp({quality:90,alphaQuality:100,effort:6}).toFile(temp);
 renameSync(temp,file);
 const meta=await sharp(file).metadata(); assert.ok(meta.hasAlpha);
 const asset=`/decks/art-poc/${stem}.webp`;
 for(const size of [64,160]) await sharp(file).resize(size,size,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toFile(`docs/visual/premium-poc/${stem}-${size}.png`);
 rows.push({id:entry.id,deck:entry.deck,card:{id:`${entry.suit}-${entry.rank}`,suit:entry.suit,rank:entry.rank},name:entry.name,status:'proof-of-concept',styleStatus:decisions.styles[entry.deck].status,version:entry.assetVersion??'v1',stickerAsset:asset,...(entry.previousStickerAsset?{previousStickerAsset:entry.previousStickerAsset}:{}),width:meta.width,height:meta.height,bytes:statSync(file).size,sourceBounds:[minX,minY,maxX,maxY],sourceTouchesEdge:minX===0||minY===0||maxX===info.width-1||maxY===info.height-1});
}
writeFileSync('packages/web/src/decks/art-poc/manifest.json',JSON.stringify(rows,null,2)+'\n');
writeFileSync('docs/visual/premium-poc/export-report.json',JSON.stringify({method:'Format conversion only: RGBA crop threshold 8/255, max subject 704px, 32px transparent padding, WebP quality 90. Does not establish artistic acceptance.',assets:rows},null,2)+'\n');
console.log(`Exported exactly ${rows.length} concept stickers, ${rows.reduce((n,e)=>n+e.bytes,0)} bytes. No production card mapping replaced.`);
