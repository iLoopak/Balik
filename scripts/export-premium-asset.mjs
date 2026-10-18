// One generated asset only. No painting, background removal or synthetic artwork.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,renameSync,statSync} from 'node:fs';
import {createRequire} from 'node:module';
const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE??'sharp');
const file=process.argv[2];if(!file)throw new Error('Expected a generated-job JSON path.');
const job=JSON.parse(readFileSync(file));
assert.match(job.deck,/^(biopunk|panelak-3000|chalupa|papirovy-cirkus)$/);
assert.match(job.card.id,/^(hearts|diamonds|clubs|spades)-(7|8|9|10|J|Q|K|A)$/);
const {data,info}=await sharp(job.source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
let minX=info.width,minY=info.height,maxX=-1,maxY=-1,clear=0,edgePixels=0;
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
 const alpha=data[(y*info.width+x)*4+3];if(alpha===0)clear++;
 if(alpha>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 if(alpha>128&&(x===0||y===0||x===info.width-1||y===info.height-1))edgePixels++;
}
assert.ok(clear/(info.width*info.height)>.1,`${job.id}: missing genuine transparency`);
assert.ok(maxX>minX&&maxY>minY);
const dir=`packages/web/public/decks/${job.deck}/stickers`;mkdirSync(dir,{recursive:true});
const filename=`${job.card.suit}-${job.card.rank.toLowerCase()}.webp`,destination=`${dir}/${filename}`,temp=destination+'.tmp';
await sharp(job.source).extract({left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1})
 .resize(704,704,{fit:'inside',withoutEnlargement:true})
 .extend({top:32,bottom:32,left:32,right:32,background:{r:0,g:0,b:0,alpha:0}})
 .webp({quality:90,alphaQuality:100,effort:6}).toFile(temp);
renameSync(temp,destination);
const meta=await sharp(destination).metadata();assert.ok(meta.hasAlpha);
Object.assign(job,{status:'generated-awaiting-art-review',stickerAsset:`/decks/${job.deck}/stickers/${filename}`,width:meta.width,height:meta.height,bytes:statSync(destination).size,sourceBounds:[minX,minY,maxX,maxY],sourceEdgePixels:edgePixels});
writeFileSync(file,JSON.stringify(job,null,2)+'\n');
console.log(JSON.stringify({id:job.id,status:job.status,bytes:job.bytes,sourceEdgePixels:edgePixels}));
