// Reuse the selected POCs as real cards without overwriting existing reviewed exports.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
const configs=JSON.parse(readFileSync('docs/visual/premium-series/approved-pocs.json'));
const poc=JSON.parse(readFileSync('docs/visual/premium-poc/provenance.json'));
mkdirSync('docs/visual/premium-series/generated',{recursive:true});
for(const [deck,config]of Object.entries(configs)){
 const file=`docs/visual/premium-series/generated/${deck}--${config.suit}-${config.rank}.json`;
 if(existsSync(file)&&JSON.parse(readFileSync(file)).stickerAsset)continue;
 const source=poc.entries.find(e=>e.deck===deck),old=JSON.parse(readFileSync(`packages/web/src/themes/decks/${deck}/manifest.json`)).find(e=>e.card.suit===config.suit&&e.card.rank===config.rank);
 const job={id:`${deck}:${old.card.id}`,deck,card:old.card,name:config.name,meaning:config.meaning,archetype:old.archetype,prompt:source.prompt,reference:null,source:source.source,status:'approved-poc',approvedPoc:true};
 writeFileSync(file,JSON.stringify(job,null,2)+'\n');
}
console.log('Seeded missing selected POC descriptors; existing exports preserved.');
