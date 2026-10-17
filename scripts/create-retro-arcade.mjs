// Original BALÍK vector artwork. No external images, fonts or licensed characters.
import { mkdirSync, writeFileSync } from 'node:fs';
const dir = 'packages/web/public/decks/retro-arcade';
mkdirSync(`${dir}/stickers`, { recursive: true });
const ink = '#202338', cream = '#FFF6DB', pink = '#EE79B7', blue = '#528FFF', red = '#F34B61', yellow = '#F5C544', green = '#38BA87';
const p = (d, fill = cream, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const r = (x,y,w,h,fill=cream,rx=4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const c = (x,y,rad,fill=cream) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${fill}"/>`;
const line = d => p(d,'none');
const eye = (x,y) => r(x,y,9,14,ink,1);
const face = (x,y) => eye(x,y)+eye(x+27,y)+line(`M${x+10} ${y+26}h16`);
const boots = (a=86,b=146,y=190) => r(a,y,28,22,ink)+r(b,y,28,22,ink);
const entries = [];
function add(suit,rank,name,meaning,art) { entries.push({card:{id:`${suit}-${rank}`,suit,rank},name,meaning,archetype:({'7':'Glitch','8':'Obrana','9':'Maskot','10':'Dominanta',J:'Kurýr',Q:'Kapitán',K:'Boss',A:'Esence'})[rank],stickerAsset:`/decks/retro-arcade/stickers/${suit}-${rank.toLowerCase()}.svg`,art}); }
// POWER: industrial machines, angular red shells, warm light.
add('hearts','7','Zkratník','Přetížený bateriový bot s vyraženou pojistkou.',
 p('M84 64V44h32v20h50v20h22v104H66V84h18Z',red)+r(84,89,86,64,cream)+eye(99,108)+eye(135,108)+p('m127 72-12 24h16l-10 26 34-40h-18l10-10',yellow)+line('m52 58-14-9m163 14 17-17M50 160H34')+r(82,188,26,23,ink)+r(150,188,25,23,ink));
add('hearts','8','Nárazová rukavice','Pancéřová rukavice zachytí náraz stroje.',
 p('M79 170 56 142V97h26v24-65h26v42-51h26v51-38h26v38-24h26v75l-23 32v29H79Z',red)+r(87,169,72,30,ink)+r(98,177,48,14,yellow)+line('M82 121h26m0-33h26m0 0h26m0 0h26'));
add('hearts','9','Topík','Malý robot na pružných nohách hlídá zásobu energie.',
 p('M96 72 80 48h28l20 24 20-24h28l-16 24',yellow)+r(65,77,126,100,red,17)+r(82,93,92,56,cream,9)+face(101,103)+line('M100 177v16m53-16v16')+boots(78,148,194)+p('M64 102 43 124v30h22m127-52 21 22v30h-22',red));
add('hearts','10','Kabinet plamenů','Samostatný arkádový automat se šikmým ovládáním.',
 p('M79 39h105v112l-16 58H67l9-58-15-25 18-23Z',red)+r(89,55,79,66,ink)+p('m98 104 20-31 14 18 21-22v35Z',yellow)+p('M76 130h108l-16 29H67Z',cream)+c(105,141,7,red)+line('M106 141v-15')+c(144,143,5,blue)+r(95,173,45,18,ink));
add('hearts','J','Jiskřič na boardu','Mladý opravář veze energetický článek na prkně.',
 p('m81 112 42-17 40 30-17 48-54-16Z',red)+r(100,59,49,43,cream,9)+p('m95 63 12-20h49v23Z',red)+eye(127,77)+p('m91 139-21 24 35 20m40-34 23 21-17 20','none')+r(157,101,29,41,yellow)+line('M123 112h35')+p('m58 193 136-12-9 14-117 12Z',blue)+c(83,211,8,ink)+c(170,202,8,ink));
add('hearts','Q','Velitelka panelu','Kapitánka směny se štítem ovládací konzole.',
 boots()+p('M87 111h74l17 80H73Z',red)+r(102,58,52,52,cream,10)+p('M98 76V49h63v41h-15V69h-30v7Z',pink)+eye(116,79)+eye(138,79)+p('M85 120 58 147l30 18m76-47 28 35-24 16','none')+r(102,138,55,34,ink)+c(118,151,5,yellow)+line('M133 151h12'));
add('hearts','K','Pecní kolos','Těžký boss s kotlem místo trupu a dvěma písty.',
 boots(76,157)+p('M72 95h111l12 88H60Z',red)+r(96,58,62,40,ink)+p('m102 58 12-21 14 18 18-21 8 24',yellow)+r(84,113,87,50,ink)+p('M97 147v-18h14v18m18 0v-18h14v18m13 0v-18h8v18',yellow)+r(35,108,28,62,red)+r(193,108,28,62,red)+line('M48 109V87h25m134 22V87h-25'));
add('hearts','A','Prizmatické jádro','Tři záměrně posunuté plošky čisté energie.',
 p('m124 38 58 45-11 87-47 47-54-53 1-81Z',red)+p('m124 38 2 81 56-36Z',yellow)+p('m126 119-2 98-54-53Z',pink)+p('m71 83 55 36 45 51','none')+line('M49 76 36 67M196 54l11-14M190 190l14 13'));
// SPEED: track hardware, wheels and athletic silhouettes.
add('diamonds','7','Zubatý náboj','Zaseknuté závodní kolo s nepravidelným ozubením.',
 p('m104 39 16 18 25-20 8 29 28-4-4 29 27 12-20 22 18 23-29 8-2 28-29-9-16 20-18-24-28 10 2-30-25-10 18-25-13-23 31-2Z',yellow)+c(127,125,43,ink)+c(127,125,23,cream)+line('m103 115 48 20m-38 13 28-45'));
add('diamonds','8','Aeropřilba','Závodní přilba chrání i při glitchi trati.',
 p('M55 138c0-62 34-92 85-92 47 0 65 42 65 94l-29 6-9 52H74v-44Z',yellow)+p('M98 81h88l12 48h-95L85 111Z',ink)+p('M114 91h49l10 23h-48Z',blue)+line('M77 159h66m-60 17h53')+p('M56 139h44v24H61Z',cream));
add('diamonds','9','Rolík','Jednokolový pošťák s ušima z pružin.',
 c(128,178,35,ink)+c(128,178,16,yellow)+p('M102 65 84 40h20l22 30 26-30h22l-21 31',yellow)+p('M76 90 98 67h61l25 25-13 61H87Z',yellow)+r(91,93,76,43,cream,8)+face(108,101)+p('M77 109 52 129l9 20m122-40 21 20-9 20','none'));
add('diamonds','10','Cílová brána','Izolovaný časoměrný oblouk s jediným startovním pruhem.',
 p('M48 208V53h159v155h-34V90H83v118Z',yellow)+r(64,65,127,29,ink)+r(78,73,15,13,cream,0)+r(108,73,15,13,cream,0)+r(138,73,15,13,cream,0)+r(168,73,10,13,cream,0)+p('M44 182h42v26H44m128-26h40v26h-40Z',blue)+line('M58 110h15m-15 19h15m111-19h14m-14 19h14'));
add('diamonds','J','Sprint s balíčkem','Kurýr na kolečkových botách překládá zatáčku.',
 r(112,45,46,44,cream,9)+p('m111 56 5-20h46l7 22Z',blue)+eye(139,64)+p('m113 94 39 13-17 49-39-15Z',yellow)+p('M100 113 76 133l8 17m67-36 18-8M104 148l10 17-30 14m50-25 23 23h22','none')+r(61,173,38,16,blue)+r(155,176,40,16,blue)+c(69,195,6,ink)+c(91,195,6,ink)+c(164,198,6,ink)+c(186,198,6,ink)+r(169,91,33,35,red)+line('M151 111h18'));
add('diamonds','Q','Maršálka okruhu','Velitelka trati s vlajkou a rozhodným postojem.',
 boots()+p('M93 108h58l20 81H79Z',yellow)+r(104,56,47,48,cream,8)+p('M96 62 111 40h33l17 22Z',blue)+eye(116,75)+eye(137,75)+line('M92 122 65 139m86-18 26-21V49')+p('M178 49h37l-9 20 9 20h-37Z',red)+r(108,132,28,16,ink));
add('diamonds','K','Turboboss','Boss na široké nápravě se dvěma turbínami.',
 c(66,174,31,ink)+c(66,174,14,yellow)+c(190,174,31,ink)+c(190,174,14,yellow)+p('M64 141 84 95h88l20 46v37H64Z',yellow)+r(94,65,67,46,ink)+p('M105 81h16v11h-16m29-11h16v11h-16Z',red)+p('m87 96-24-33 16-15 28 41m62 7 24-33-16-15-28 41',blue)+line('M99 145h58m-50 15h42'));
add('diamonds','A','Orbitální turbo','Skládaná rychlostní kapsle prochází zkoseným orbitálem.',
 p('m122 43 45 36-18 100-35 26-32-39 15-97Z',yellow)+p('m122 43 4 69 41-33Z',cream)+p('m126 112 23 67-35 26Z',pink)+p('M67 132c-37 51 62 73 120-8s-7-81-48-52','none')+line('M57 78h31M44 94h31m104 100h25'));
// LIFE: toy creatures and mechanical gardens; no existing game mascots.
add('clubs','7','Past z kazety','Otevřená zubatá kazeta s klikatým kabelem.',
 p('M54 81h146v99H54Z',green)+p('M68 95h117v48H68Z',ink)+p('m70 96 13 23 13-23 14 23 14-23 13 23 13-23m-71 47 15-23 14 23 14-23 14 23 14-23',cream)+p('M105 180v24h39v-12h25v23','none')+r(72,159,22,7,yellow,0)+r(163,159,22,7,yellow,0));
add('clubs','8','Pružinový deštník','Skládací štít z listových panelů odráží shora.',
 p('M41 121 80 65l49-21 48 21 38 56-28-12-28 12-30-12-29 12-29-12Z',green)+line('M129 44v137q0 28 28 20l7-15M80 65l20 56m77-56-18 56')+c(129,44,7,yellow));
add('clubs','9','Žabák na pérku','Hranatý obojživelník se dvěma pružinovými nohami.',
 p('M75 89V64h35v23h36V64h35v25l13 24v51H62v-51Z',green)+r(80,72,16,20,cream)+r(151,72,16,20,cream)+c(89,81,3,ink)+c(158,81,3,ink)+p('M86 120h83v25H86Z',cream)+line('M90 164v11h20v11H90v11m76-33v11h-20v11h20v11')+r(67,199,48,14,ink)+r(142,199,48,14,ink));
add('clubs','10','Lovec kapslí','Průhledný automat s kleštěmi a dvěma semennými kapslemi.',
 p('M70 44h119v166H64V68Z',green)+r(82,62,92,100,ink)+p('M125 65v34m0 0-16 18 8 12m8-30 16 18-8 12','none','stroke="#FFF6DB"')+c(105,144,12,yellow)+c(149,144,12,pink)+p('M64 166h125v21H64Z',cream)+c(158,175,5,red)+r(91,192,47,13,ink));
add('clubs','J','Pogo průzkumník','Zvědavý průzkumník na skákací tyči veze sadbu.',
 p('M93 108h64l14 60H82Z',green)+r(106,57,47,47,cream,10)+p('M96 68V47l35-13 34 13v21Z',green)+eye(119,77)+eye(139,77)+r(47,112,35,46,yellow)+line('M82 130h18m55-10 31 11m-11-20v68m-18 0h36m-18 0v13h-15v10h30v10h-30m-54-44 12 22h34')+r(108,180,42,13,ink));
add('clubs','Q','Správkyně skleníku','Kapitánka s velkým ramenem pro mechanickou sazenici.',
 boots()+p('M89 110h71l16 79H77Z',green)+r(104,58,48,47,cream,9)+p('M95 76V46h25l10 16 14-16h18v45h-17V77Z',pink)+eye(117,78)+eye(139,78)+p('M87 119 62 137v26m99-41 29 16','none')+r(175,124,32,40,yellow)+p('M192 124v-22q-29 0-23-23 22 0 23 23 1-29 27-27 0 23-27 27Z',green)+r(110,134,29,24,cream));
add('clubs','K','Klepetový zahradník','Zavalitý mechanický krab nese růstovou nádrž.',
 p('M82 103h89l17 67-23 25H82l-20-25Z',green)+r(100,57,53,52,ink)+p('M115 86V64l13-17 14 17v22Z',green)+line('M83 180 59 202m112-22 23 22')+p('M69 128 45 108V78l18 17 18-17v30l-12 20m116 0 24-20V78l-18 17-18-17v30l12 20Z',yellow)+eye(99,130)+eye(147,130)+line('M113 161h27'));
add('clubs','A','Semínko života','Otevřený obal s geometrickým klíčkem a orbitou.',
 p('M128 76c-67 27-69 96 0 129 66-35 65-98 0-129Z',green)+p('M128 205V96l37 55Z',yellow)+p('M128 95V62q-35 1-40-26 35-2 40 26 9-28 39-24-5 26-39 24Z',green)+p('M76 108c-51 35-12 84 79 44 70-32 63-57 23-58','none'));
// SIGNAL: antennas, radios and angular translucent screens.
add('spades','7','Datový červ','Zubatý kabelový tvor prochází rozpojenými konektory.',
 p('M49 80h35v29h42V72h52v37h26v40h-61v38H89v-38H49Z',blue)+r(55,62,23,26,cream)+line('M59 49v14m15-14v14M95 187v20m20-20v20')+r(147,83,21,16,ink)+eye(154,117)+p('m181 55 9-13m-58 2-7-10','none'));
add('spades','8','Bublinový vysílač','Kapesní rádio obklopuje pevný ochranný prstenec.',
 c(128,125,82,blue)+c(128,125,61,cream)+r(94,92,66,76,blue)+line('M145 92V60m-31 58h27m-27 14h27m-27 14h14')+c(147,152,6,yellow)+p('M60 169 79 154m95-63 23-15','none'));
add('spades','9','Sova na příjmu','Malý anténový pták s širokými křídly a hranatýma očima.',
 p('M84 76 73 41l41 29h28l41-29-11 35 16 57-22 44H89l-23-44Z',blue)+r(84,87,37,37,cream,7)+r(135,87,37,37,cream,7)+eye(98,97)+eye(149,97)+p('m119 127 9 17 10-17Z',yellow)+p('m69 103-30 45 45-12m101-33 31 45-46-12',blue)+line('M106 177v23m44-23v23m-60 0h30m14 0h30'));
add('spades','10','Signální observatoř','Velká nakloněná parabola na členitém podstavci.',
 p('M87 165h83l24 46H62Z',blue)+r(113,121,32,45,ink)+p('M63 51q-16 114 105 99Z',blue)+p('M63 51q95-9 105 99Z',cream)+line('m115 104 43-47m-7 0h17v17')+c(166,50,8,yellow)+line('M179 48h18M183 68l16 9M179 33l11-11')+r(91,185,73,10,cream));
add('spades','J','Kapesní mixér','Mladý hráč drží handheld se dvěma ovladači.',
 boots(86,144)+p('M88 112h72l15 78H77Z',blue)+r(103,57,51,51,cream,10)+p('M98 78V52h63v35h-13V68h-34v10Z',ink)+p('M92 67H80v34h14m61-34h14v34h-14',pink)+eye(119,81)+eye(141,81)+r(80,132,96,38,blue)+r(111,140,33,21,ink)+line('M92 143v15m-7-8h14')+c(160,150,5,yellow));
add('spades','Q','Dirigentka vln','Velitelka signálu propojuje dvě vysílací tyče.',
 boots()+p('M94 108h57l25 80H73Z',blue)+r(104,58,48,48,cream,8)+p('M96 64 106 39h43l13 36-15-8h-36v14H96Z',cream)+eye(116,78)+eye(138,78)+line('M95 124 58 105V62m94 62 42-19V62')+c(58,56,8,pink)+c(194,56,8,yellow)+p('M111 122h31v42h-31Z',pink));
add('spades','K','Král rozbočovačů','Tříoký serverový boss stojí na čtyřech kabelových nohách.',
 r(75,56,107,115,blue,12)+p('M86 56V39h20v17m45 0V39h20v17',yellow)+r(89,78,79,32,ink)+c(102,93,5,pink)+c(127,93,5,yellow)+c(153,93,5,green)+line('M96 130h66m-66 16h45M83 169l-30 17v25m52-40v40m46-40v40m24-42 30 17v25')+r(38,202,24,14,ink)+r(94,202,23,14,ink)+r(140,202,23,14,ink)+r(194,202,24,14,ink));
add('spades','A','Nosná frekvence','Čistý pulz v kulovém krystalu mezi vysílacími rameny.',
 p('m128 48 56 30v81l-56 40-56-40V78Z',blue)+p('m128 48 1 75 55-45Z',cream)+p('m129 123-1 76 56-40Z',pink)+line('M91 127h14l9-25 17 46 12-29h22M51 87v80m-16-64v48m170-64v80m16-64v48'));
for (const {art, ...entry} of entries) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><filter id="cut" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="7" result="edge"/><feOffset in="edge" dx="5" dy="6" result="offset"/><feFlood flood-color="#6A4C81"/><feComposite in2="offset" operator="in" result="shadow"/><feFlood flood-color="#fffdf7"/><feComposite in2="edge" operator="in" result="white"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="white"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g stroke="${ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#cut)">${art}</g></svg>`;
  writeFileSync(`packages/web/public${entry.stickerAsset}`, svg+'\n');
}
const manifest = entries.map(({art, ...entry}) => entry);
writeFileSync('packages/web/src/themes/decks/retro-arcade/manifest.json', JSON.stringify(manifest,null,2)+'\n');
writeFileSync('docs/visual/RETRO_ARCADE_CARD_MAPPING.md', '# Retro Arcade — 32 původních motivů\n\nSymboly: srdce / Power (červená), káry / Speed (žlutá), kříže / Life (zelená), piky / Signal (modrá).\nIndexy a symboly vykresluje CardView, nejsou součástí ilustrací.\n\n| Identita | Archetyp | Název a význam |\n|---|---|---|\n'+manifest.map(e=>`| ${e.card.id} | ${e.archetype} | **${e.name}** — ${e.meaning} |`).join('\n')+'\n');
// Two edition-specific backs; these are allowed to carry the permanent BALÍK brand.
for (const [theme,bg,accent,detail] of [
 ['retro-arcade','#241E3C',pink,`${p('M28 40h22v22h22v22H50v22H28m144 146h-22v-22h-22v-22h22v-22h22',blue)}${p('m100 53 12 12-12 12-12-12Zm0 170 12 12-12 12-12-12Z',yellow)}`],
 ['stormpunk','#182B36',yellow,`${p('M25 76h37l15 15v17m98 96h-37l-15-15v-17','none')}${p('m100 40 17 29-17 29-17-29Zm0 162 17 29-17 29-17-29Z',red)}`],
]) {
 mkdirSync(`packages/web/public/decks/${theme}`,{recursive:true});
 writeFileSync(`packages/web/public/decks/${theme}/back.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280"><rect width="200" height="280" rx="16" fill="#FFFDF7"/><rect x="8" y="8" width="184" height="264" rx="11" fill="${bg}"/><g stroke="${accent}" stroke-width="2" stroke-linejoin="round"><path d="M18 18h164v244H18Z" fill="none"/>${detail}<path d="m100 100 46 40-46 40-46-40Z" fill="${accent}"/></g><text x="100" y="146" text-anchor="middle" fill="${bg}" font-family="sans-serif" font-size="21" font-weight="900">BALÍK</text></svg>\n`);
}
console.log(`Created ${entries.length} original stickers and two backs.`);
