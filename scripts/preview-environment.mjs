import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Isolated SVG material/geometry study. This is not a browser screenshot or UI layout test.
const temporary = await mkdtemp(join(tmpdir(), 'balik-console-'));
try {
  const file = join(temporary, 'render.cjs');
  await build({
    stdin: {
      resolveDir: process.cwd(),
      loader: 'tsx',
      contents: `
      import {createElement} from 'react';
      import {renderToStaticMarkup} from 'react-dom/server';
      import {writeFileSync,mkdirSync} from 'node:fs';
      import {GameTableTheme} from './packages/web/src/table/GameTableTheme';
      import {consolePocket,CONSOLE_LABELS} from './packages/web/src/table/environment';
      import {computeGeometry} from './packages/web/src/table/layout';
      import {TABLE_THEMES} from './packages/web/src/themes/registry';

      let cells='';
      for(let i=0;i<6;i++){
        const game=['prsi','sedma','lhar'][Math.floor(i/2)],light=i%2===1;
        const theme=TABLE_THEMES[game==='lhar'?'retro-arcade':'stormpunk'];
        const mode=light?'light':'dark',material=light?theme.light:theme;
        let geo=computeGeometry(900,600,['me','a','b','c'],'me',7);
        if(game==='sedma')geo={...geo,discard:{x:450,y:geo.discard.y},deck:{x:28,y:geo.controlY-30},deckW:geo.cardW*.35,deckH:geo.cardH*.35};
        if(game==='lhar')geo={...geo,discard:{x:450,y:geo.discard.y}};
        const html=renderToStaticMarkup(createElement(GameTableTheme,{geo,suit:'spades',reduced:true,lite:false,myTurn:true,game,theme:theme.id,colorMode:mode}));
        let frame=html.match(/<svg class="arena-stage-structure"[^>]*>([\\s\\S]*?)<\\/svg>/)[1];
        const vars={'arena-surface':material.surface,'arena-rail':material.rail,'console-shell':light?'#d2bfa1':'#182435','console-shell-edge':light?'#8d744b70':'#65809c66','console-lip':light?'#fff6e7b3':'#8fa4bb44','console-gold':light?'#986222':'#e8ae51'};
        const paints={
          'console-cast-shadow':'fill:'+(light?'#6d4d2e38':'#02060d66'),
          'console-shell':'fill:'+vars['console-shell']+';stroke:'+vars['console-shell-edge']+';stroke-width:1',
          'arena-surface':'fill:'+material.surface,
          'arena-material-grain':'color:#6e5739;opacity:'+(light?'.26':'0'),
          'arena-rail-outer':'fill:none;stroke:'+vars['console-shell-edge']+';stroke-width:1.4',
          'arena-rail-inner':'fill:none;stroke:'+vars['console-lip']+';stroke-width:1.3',
          'console-packet-seal':'fill:none;stroke:'+vars['console-gold']+';stroke-width:1.8;opacity:.8',
          'console-corner-tabs':'fill:none;stroke:'+vars['console-gold']+';stroke-width:2.5;opacity:.8'
        };
        frame=frame.replace(/class="([^"]+)"/g,(_,name)=>'style="'+paints[name]+';vector-effect:non-scaling-stroke"');
        const stageW=Math.min(geo.w*.94,Math.max(geo.cardW*5.8,geo.w*.54)),stageH=Math.min(geo.h*.55,geo.pileH*1.9);
        const ink=light?'#62523c':'#bcc8d6',gold=vars['console-gold'];
        let pockets='';
        for(const kind of ['draw','play']){
          const label=kind==='draw'?CONSOLE_LABELS[game].input:CONSOLE_LABELS[game].output;if(!label)continue;
          const p=consolePocket(geo,game,kind),x=p.x-p.width/2,y=p.y-p.height/2;
          pockets+='<rect x="'+x+'" y="'+y+'" width="'+p.width+'" height="'+p.height+'" rx="10" fill="'+(light?'#ae957738':'#07111ce0')+'" stroke="'+(kind==='play'?gold:ink)+'" stroke-opacity=".5"/>'+
            '<rect x="'+(x+5)+'" y="'+(y+5)+'" width="'+(p.width-10)+'" height="'+(p.height-10)+'" rx="7" fill="none" stroke="'+ink+'" stroke-opacity=".15"/>'+
            '<text x="'+p.x+'" y="'+(y-9)+'" text-anchor="middle" font-size="9" fill="'+ink+'">'+label+'</text>'+
            '<path d="M'+(p.x-p.width*.15)+' '+(y+p.height-5)+'h'+p.width*.3+'" stroke="'+gold+'" stroke-width="2"/>';
        }
        const plateX=450-stageW/2+stageW*.09,plateY=geo.discard.y+stageH/2-stageH*.02-38;
        const x=24+(i%2)*620,y=95+Math.floor(i/2)*440;
        cells+='<g transform="translate('+x+' '+y+')"><text x="0" y="0" fill="#cbd2dc" font-size="16">'+game.toUpperCase()+' / '+mode+' / '+theme.name+'</text>'+
          '<svg x="0" y="16" width="596" height="397" viewBox="0 0 900 600">'+
          '<rect width="900" height="600" rx="16" fill="'+material.background+'"/>'+
          '<svg x="'+(450-stageW/2)+'" y="'+(geo.discard.y-stageH/2)+'" width="'+stageW+'" height="'+stageH+'" viewBox="0 0 1000 420" preserveAspectRatio="none">'+frame+'</svg>'+pockets+
          '<rect x="'+plateX+'" y="'+plateY+'" width="106" height="36" rx="8" fill="'+vars['console-shell']+'" stroke="'+gold+'"/>'+
          '<text x="'+(plateX+53)+'" y="'+(plateY+17)+'" text-anchor="middle" fill="'+gold+'" font-size="13" font-weight="bold">BALÍK</text>'+
          '<text x="'+(plateX+53)+'" y="'+(plateY+28)+'" text-anchor="middle" fill="'+ink+'" font-size="6">KARETNÍ STROJ</text>'+
          '</svg></g>';
      }
      mkdirSync('qa-output/environment',{recursive:true});
      writeFileSync('qa-output/environment/console-study.svg','<svg xmlns="http://www.w3.org/2000/svg" width="1268" height="1420"><rect width="1268" height="1420" fill="#10141f"/><g font-family="Arial"><text x="24" y="35" fill="#ffb23f" font-size="24" font-weight="bold">BALÍK / KARETNÍ STROJ</text><text x="24" y="62" fill="#a7b4c5" font-size="13">Static SVG study from actual frame paths and pocket geometry. Cards and UI omitted; not a browser screenshot.</text>'+cells+'</g></svg>');
      console.log('qa-output/environment/console-study.svg');
    `,
    },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: file,
    loader: { '.css': 'empty' },
    logLevel: 'silent',
  });
  await import(pathToFileURL(file).href);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
