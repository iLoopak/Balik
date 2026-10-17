import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Render the actual component without needing a browser or raster asset dependencies.
const temporary = await mkdtemp(join(tmpdir(), 'balik-brand-'));
try {
  const file = join(temporary, 'render.cjs');
  await build({ stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import {createElement} from 'react';
    import {renderToStaticMarkup} from 'react-dom/server';
    import {readFileSync,writeFileSync} from 'node:fs';
    import {BrandMascot,MASCOT_STATES} from './packages/web/src/brand/BrandMascot';
    const css=readFileSync('packages/web/src/brand/brand.css','utf8');
    const content=MASCOT_STATES.map((state,i)=>{
      const x=40+(i%3)*220,y=95+Math.floor(i/3)*230;
      return '<g transform="translate('+x+' '+y+')">'+
        renderToStaticMarkup(createElement(BrandMascot,{state,size:140,reduced:true,decorative:false}))+
        '<text x="70" y="194" text-anchor="middle" fill="#c9c6be" font-family="Arial" font-size="13">'+state+'</text></g>';
    }).join('');
    writeFileSync('docs/brand/blik-states.svg','<svg xmlns="http://www.w3.org/2000/svg" width="720" height="590" viewBox="0 0 720 590"><style><![CDATA['+css+']]></style><rect width="720" height="590" rx="24" fill="#10141f"/><text x="40" y="42" fill="#ffb23f" font-family="Arial" font-weight="700" font-size="23">BALÍK / BLIK</text><text x="40" y="67" fill="#98a1b4" font-family="Arial" font-size="12">Statický render skutečné SVG komponenty · reduced motion</text>'+content+'</svg>');
  ` }, bundle: true, platform: 'node', format: 'cjs', outfile: file, loader: { '.css': 'empty' }, logLevel: 'silent' });
  await import(pathToFileURL(file).href);
} finally { await rm(temporary, { recursive: true, force: true }); }
