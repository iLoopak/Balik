import {readFileSync,existsSync} from 'node:fs';
const queue=JSON.parse(readFileSync('docs/visual/premium-series/queue.json'));
const missing=queue.filter(entry=>{
 const file=`docs/visual/premium-series/generated/${entry.deck}--${entry.card.id}.json`;
 if(!existsSync(file))return true;
 const job=JSON.parse(readFileSync(file));
 return !job.stickerAsset||!existsSync('packages/web/public'+job.stickerAsset);
});
console.log(JSON.stringify(missing.map(e=>e.id)));
