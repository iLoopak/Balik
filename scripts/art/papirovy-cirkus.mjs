import {p,r,c,e,l,g,eyes,star,ink,paper,collection} from './vector.mjs';
const {cards,add}=collection('papirovy-cirkus');
const coral='#DF7868', gold='#DAB863', blue='#729ACD', plum='#B28AB9';
// Angular, displaced shapes are deliberate paper layers, not raster texture.
const fold=d=>p(d,'none',`stroke="${paper}" stroke-width="3"`);
const mask=(x,y,color,s=1)=>g(p('M-31-28 0-36 32-28 25 16 0 35-26 16Z',color)+p('m-23-9 17-4 3 10-19 3Zm29-4 17 4-1 9-19-3Z',ink)+p('m-12 16 12-7 13 7-13 8Z',paper),`translate(${x} ${y}) scale(${s})`);
const crown=(x,y,color)=>g(p('M-25 6-29-20-10-9 0-30 10-9 29-20 25 6Z',color),`translate(${x} ${y})`);
const shoes=(y=207)=>p(`m86 ${y-20}h22v20H71v-9Zm61 0h22l15 11v9h-37Z`,ink);
const baton=(x,y)=>l(`M${x} ${y}l20-54`)+star(x+22,y-60,gold,.65);
// Masky: vermilion faces, fans, contrasting theatrical expressions.
add('hearts','7','Prasklý úsměv','Divadelní maska praskla mezi úsměvem a překvapením.',
 mask(127,123,coral,2)+p('m128 54-14 40 20 19-21 38 14 43','none')+p('m62 72-21-9 3 23 19 9m127 62 20 6-3 21-24-13Z',gold)+fold('M87 88 82 133m91-45-5 45'));
add('hearts','8','Vějíř opony','Papírový vějíř drží pohromadě křehkou scénickou obranu.',
 p('M128 198 43 110l16-38 35-15 34-16 35 16 34 15 16 38Z',coral)+p('m128 198-34-141 34-16 35 16Z',paper)+l('M128 198 59 72m69 126 69-126m-69 126V42')+p('m113 188 15-10 16 10-6 23h-18Z',gold)+fold('M49 110 104 167m103-57-55 57'));
add('hearts','9','Pantomimí pták','Poskládaný pták hraje potichu, zato s mimořádně hlasitým zobákem.',
 p('m64 142 35-54 54 8 27 53-31 38-61-12Z',coral)+p('m105 92 13-45 34-9 32 30-31 28Z',paper)+p('m180 62 34 16-37 12Z',gold)+c(158,62,5,ink)+p('m75 124-35-21 13 64 43-16Z',plum)+p('m112 110 42 35-40 23-21-24Z',paper)+l('M106 181v27m44-27v27m-56 0h28m17 0h27')+fold('M112 121 132 145'));
add('hearts','10','Jeviště dvou tváří','Miniaturní divadlo rozevírá dvě zcela odlišné nálady.',
 p('M55 77h147v129H55Z',ink)+p('M43 62h171v24H43Z',gold)+p('M55 83h42l-17 62 17 48H55Zm147 0h-42l17 62-17 48h42Z',coral)+p('m43 206 85-18 86 18v11H43Z',gold)+mask(113,126,paper,.7)+g(mask(152,140,plum,.7),'rotate(17 152 140)')+fold('M63 96v82m131-82v82'));
add('hearts','J','Posel v půlmasce','Akrobatický poslíček přináší roli svázanou červenou stuhou.',
 shoes()+p('m108 108 39-7 18 74-70 13Z',coral)+p('m105 61 30-18 25 26-9 36-37 2Z',paper)+g(mask(135,78,coral,.65),'rotate(-15 135 78)')+p('m105 113-39 20 11 24 34-19m39-24 30 17-13 25',plum)+g(r(51,140,43,25,gold,0)+l('M71 140v25'),'rotate(-15 72 152)')+fold('M126 121 136 173'));
add('hearts','Q','Paní proměn','Vládkyně scény drží dvě masky, ale vlastní tvář si nechává pro sebe.',
 shoes()+p('M111 106h33l42 83H69Z',coral)+p('m104 54 25-15 23 19-4 40-20 17-22-17Z',paper)+p('m112 78 16-8 16 8-16 12Z',ink)+crown(128,47,gold)+l('M101 123 65 145V101m91 22 34 22V101')+mask(64,82,gold,.65)+mask(191,82,plum,.65)+p('m127 114-14 59h31Z',plum));
add('hearts','K','Principál ozvěn','Vysoký principál s dvojitou tváří nese celý potlesk na ramenou.',
 shoes()+p('M88 106h82l28 86H57Z',coral)+p('m87 112 41 23 42-23-18 55h-47Z',gold)+mask(128,79,paper,1)+crown(128,52,coral)+p('m128 48 1 61 23-20 6-36Z',plum)+l('M87 131 51 157m121-26 34 26V94')+p('m199 97 8-29 8 29Z',gold)+fold('M70 179 97 154m87 25-27-25'));
add('hearts','A','Tvář před oponou','Dvě vyřezané tváře a roztažené stuhy tvoří znak divadla.',
 p('m77 78-36-21 8 60 35 18m91-57 36-21-8 60-35 18M85 161l-20 52 39-15 24 19 26-19 39 15-22-52Z',gold)+g(mask(106,113,coral,1.3),'rotate(-19 106 113)')+g(mask(156,111,paper,1.25),'rotate(20 156 111)')+fold('M89 176 77 196m85-20 14 20'));
// Loutky: mustard wood, folded limbs, dark visible strings and joints.
add('diamonds','7','Zamotaný závěs','Loutkový kříž se stal obětí vlastních provázků.',
 p('M67 46h125v19H67Zm53-15h19v52h-19Z',gold)+l('M80 65v49l88 51-75 25V88m82-23v127L80 113m48-32v120')+p('m83 173 30-9 18 22-25 25-27-14Z',gold)+r(153,175,36,30,paper,0)+c(128,117,13,coral)+fold('M83 52h33'));
add('diamonds','8','Dřevěný paraván','Skládané kulisy tvoří pevnost pro všechna křehká vystoupení.',
 p('m53 69 50-16 49 16 49-16v140l-49 16-49-16-50 16Z',gold)+p('m103 53 49 16v140l-49-16Z',paper)+l('M103 53v140m49-124v140')+p('m65 113 25-7v58l-25 7Zm99-7 25-7v58l-25 7Z',plum)+star(127,132,coral,1.1)+fold('M61 81v20m99-12v10'));
add('diamonds','9','Kloubový koník','Malý dřevěný kůň má čtyři nohy, každou z jiné pohádky.',
 p('m68 118 67-1 17-55 31-13 18 20-16 15-6 63-33 16-78-6Z',gold)+p('m164 54-6-19 24 12m-2 39 27 13-24 13Z',coral)+c(176,67,5,ink)+p('m80 149-13 49 20 7 21-54m27 1 14 51 21-6-10-51Z',paper)+c(92,153,9,coral)+c(149,153,9,coral)+p('m68 121-27-24-6 12 30 40Z',plum)+fold('M96 129h31'));
add('diamonds','10','Točna provázků','Malé kruhové jeviště otáčí celým papírovým světem.',
 p('M58 165h141v34q-71 28-141 0Z',gold)+e(128,165,71,23,paper)+p('M70 157V63h17v94m83 0V63h17v94M62 49h133v20H62Z',gold)+l('M100 70v44m28-44v66m28-66v44')+star(100,129,coral,.8)+star(128,149,plum,.8)+star(156,129,blue,.8)+fold('M67 184v12m13-8v13m13-10v13m14-11v13m14-12v12'));
add('diamonds','J','Dřevěný doručovatel','Loutka na volných provázcích nese svitek za hranice kulis.',
 shoes()+p('m108 111 38-4 16 68-62 8Z',gold)+p('m107 62 31-11 19 23-11 32-31-6Z',paper)+eyes(121,78,20)+p('m142 86 25 6-24 7Z',gold)+l('M109 126 76 147m72-22 31 20M112 184l-13 15m48-17 12 17M115 57V29m34 44 31-44')+c(104,127,7,coral)+c(150,127,7,coral)+r(54,138,30,37,plum,0)+fold('M126 123 135 164'));
add('diamonds','Q','Vodička hvězd','Loutkářka vodí souhvězdí na dvou zlatých křížích.',
 shoes()+p('M110 109h36l35 80H74Z',gold)+p('m105 59 22-18 25 18-4 40-21 13-20-14Z',paper)+eyes(117,79,21)+p('M99 63 105 40l22-14 26 20 6 24-18-12-14 8-17-10Z',plum)+l('M100 125 65 139V82m89 43 35 14V82M47 74h36m-18-15v29m106-14h36m-18-15v29M52 83v53m143-53v53')+star(52,153,coral,.7)+star(195,153,blue,.7)+fold('m128 116-10 61'));
add('diamonds','K','Obr z rekvizit','Loutkový král má ramena z beden a srdce z červeného papíru.',
 shoes()+r(83,109,90,77,gold,0)+r(101,62,54,44,paper,0)+eyes(115,80,26)+crown(128,53,gold)+r(45,112,31,48,plum,0)+r(181,112,31,48,plum,0)+l('M76 126h7m90 0h8')+p('M127 142q-19-28-25-5 0 17 25 31 27-14 27-31-7-23-27 5Z',coral)+c(99,179,8,coral)+c(157,179,8,coral)+fold('M90 117h30'));
add('diamonds','A','Kříž nad scénou','Loutkářský kříž řídí geometrické srdce papírového světa.',
 p('M53 55h149v22H53Zm64-24h22v72h-22Z',gold)+l('M68 78v84m120-84v84m-60-59v32')+p('m128 133 32 28-32 46-32-46Z',coral)+p('m128 133 1 74 31-46Z',plum)+p('M55 168h26v28H55Zm120 0h26v28h-26Z',paper)+fold('M65 61h45m22 96 15 10'));
// Šelmy: cobalt angular animals, striped paper segments, quiet theatrical pride.
add('clubs','7','Rozstřižená obruč','Akrobatická obruč se rozpadla na zubaté papírové plameny.',
 p('m91 48 24 20 25-23 13 29 31-6-1 31 28 13-21 23 14 26-30 7-11 31-27-15-25 19-17-27-32 3 5-32-25-18 25-23-7-28 31-3Z',blue)+c(129,128,47,paper)+p('m165 157 30 19-9 31-32-7-18-23Z',coral)+fold('M77 83 92 96m76-14-13 16'));
add('clubs','8','Hříva z papíru','Skládaná lví hříva je ochranným erbem všech šelem.',
 p('m127 36 22 23 30-2 5 29 25 17-13 29 5 28-31 8-16 22-27-11-26 11-17-22-30-8 4-28-12-29 24-17 6-29 30 2Z',blue)+p('m91 83 36-18 38 18-5 66-33 34-32-34Z',gold)+p('m102 106 14 4-13 9m49-13-14 4 13 9M117 136h22l-11 14Z',ink)+l('M128 150v14m-14 0h28')+fold('m78 77 10 15m79-15-8 15M72 157l16-6m96 6-16-6'));
add('clubs','9','Tygr na kolečkách','Papírový tygr zůstává důstojný, i když stojí na tahací hračce.',
 wheelArt(78,194)+wheelArt(177,194)+p('M61 173v-53l84-10 13-44 39-9 15 39-28 44-12 33Z',blue)+p('m158 68-8-25 25 17 23-22 8 31Z',blue)+p('m65 123 20-2v35H65m38-37 18-2v38h-18m47-45 16-3-8 32Z',ink)+p('m171 108 23-3-11 19Z',paper)+c(176,85,5,ink)+l('M62 132 41 116V89')+p('M55 175h137v11H55Z',gold));
function wheelArt(x,y){return c(x,y,17,ink)+c(x,y,7,coral);}
add('clubs','10','Aréna modrých stínů','Prázdný piedestal a velká obruč čekají na přesný skok.',
 c(129,102,66,blue)+c(129,102,48,paper)+p('M82 155h94l23 51H59Z',gold)+p('M59 206h140v12H59Z',blue)+p('m83 158 16 48h20l-8-48m29 0-8 48h20l18-48Z',coral)+fold('M92 64 83 75m89-11 9 11M73 210h39'));
add('clubs','J','Krotitel stínů','Mladý akrobat doprovází šelmy jen světlem papírové lucerny.',
 shoes()+p('m107 108 40-8 18 80-68 8Z',blue)+p('m107 59 24-17 24 25-9 36-34 0Z',paper)+eyes(119,79,20)+p('M98 61 104 40h45l11 21Z',gold)+l('M103 124 70 142m82-19 31 19v-25')+p('m169 117 14-14 15 14-4 40h-21Z',gold)+star(183,136,paper,.5)+p('m99 109-30-8 17 40Z',coral));
add('clubs','Q','Lvice rovnováhy','Akrobatická lvice drží dva míče na jediné napnuté linii.',
 p('M111 107h32l29 75H84Z',blue)+p('m96 67 10-26 24 8 23-8 12 26-15 37h-41Z',blue)+p('m109 66 37 1-3 27-15 16-16-16Z',paper)+eyes(118,79,20)+l('M103 119 68 140l-17-25m101 4 35 21 17-25M103 180l-20 27m67-27 20 27M43 210h170')+c(51,100,18,coral)+c(204,100,18,gold)+p('m127 120-12 40h25Z',gold));
add('clubs','K','Lev principál','Král šelem má kabát s výraznými klopami a skládací korunu.',
 shoes()+p('M85 111h87l24 82H60Z',blue)+p('M82 62 99 41l29-11 29 11 19 21-6 38-42 26-40-26Z',blue)+mask(128,81,gold,.9)+crown(128,52,coral)+p('m89 113 39 28 43-28-22 56-21-21-18 21Z',paper)+l('M87 136 51 157m122-21 30 21V99')+star(203,89,gold,.65)+fold('M77 180 94 155m85 25-17-25'));
add('clubs','A','Skok do světla','Lev vystřižený z jediného archu proskakuje emblémovou obručí.',
 c(128,125,76,blue)+c(128,125,58,paper)+p('m58 149 36-45 58-1 19-34 28 9-3 37-33 31-22 34-31-10-26 20-20-13 19-30Z',gold)+p('m172 73-3-25 20 18 20-9-8 27Z',coral)+c(187,85,5,ink)+p('m106 106 12 27h-17l-12-27m42-2 7 31-16 3-9-34Z',ink)+l('M61 144 40 129V98')+fold('M88 65 77 77'));
// Iluze: plum negative space, folded stars, improbable magic mechanisms.
add('spades','7','Uprchlá hvězda','Z kouzelnické krabičky utekl jeden nepatřičně velký nápad.',
 p('m65 135 64-21 65 21-65 25Z',paper)+p('M65 135v61l64 23v-59Zm64 25 65-25v61l-65 23Z',plum)+p('m65 135-20-29 63-22 21 30 42-30 42 22-19 29-65-21Z',gold)+star(130,68,plum,1.65)+l('m73 65-14-11m126 21 15-13')+fold('M76 154v32m65-20 39-13'));
add('spades','8','Zrcadlová clona','Dvě přeložená zrcadla chrání vše, co se právě nemá ukázat.',
 p('m62 61 66-23 66 23v128l-66 28-66-28Z',gold)+p('m75 71 53-18 53 18v108l-53 22-53-22Z',plum)+p('m128 53 0 148 53-22V71Z',paper)+l('M128 53v148')+star(107,101,paper,.8)+star(152,152,plum,.9)+fold('M85 82v51'));
add('spades','9','Králík z rohu papíru','Králík se složil sám a odmítá se vrátit do klobouku.',
 p('M95 103 84 42l20-9 24 58 23-58 20 9-10 61 17 34-20 42H94l-20-42Z',paper)+p('m95 49 14 42 8-4-14-42m52 0-14 42 8 4 14-42Z',plum)+eyes(108,122,38)+p('m120 137 8 10 9-10Z',coral)+p('m82 170 47 18 46-18-8 35H91Z',plum)+p('m91 206-24 12h123l-23-12Z',ink)+fold('m88 145 10 13'));
add('spades','10','Stroj na nemožné','Magický kabinet skládá hvězdy z prázdného prostoru.',
 p('M70 56h117v147H70Z',plum)+p('M82 70h93v84H82Z',ink)+star(127,110,gold,1.7)+r(85,166,37,23,paper,0)+c(153,178,11,gold)+l('M70 114H47V89m141 25h21v31M86 204v13m84-13v13')+star(46,76,paper,.6)+p('M59 43h139v15H59Z',gold)+fold('M76 67v38'));
add('spades','J','Asistent za záhybem','Hbitý asistent přináší kouzelnický klobouk složený naplocho.',
 shoes()+p('m108 109 39-7 20 77-72 9Z',plum)+p('m107 60 24-17 24 25-8 35-35 0Z',paper)+eyes(119,80,20)+p('m98 59 11-28 40 3 11 25Z',plum)+p('m104 110 23 20 24-20-9 35h-28Z',gold)+l('M103 125 67 148m86-23 30 23')+p('M47 151h49l-6 31H53Zm-8 31h66v10H39Z',ink)+star(185,136,gold,.8));
add('spades','Q','Kartografka snů','Iluzionistka rozkládá dvě papírové hvězdy jako mapy nemožných cest.',
 shoes()+p('M111 106h33l44 83H69Z',plum)+p('m104 58 23-18 25 20-6 38-19 14-20-14Z',paper)+eyes(117,80,21)+p('M97 64 128 29l30 35-31-12Z',plum)+star(128,40,gold,.4)+l('M100 124 65 145m91-21 35 21')+star(56,142,gold,1.1)+star(199,142,blue,1.1)+p('m128 118-18 60h37Z',ink)+fold('M128 136v29'));
add('spades','K','Mistr posledního triku','Principál iluzí má plášť jako noční oblohu a hlavu z prázdného rámu.',
 shoes()+p('M88 111h82l29 82H57Z',plum)+p('m101 60 27-16 27 16v36l-27 18-27-18Z',gold)+p('m111 68 17-10 17 10v22l-17 11-17-11Z',ink)+p('M103 44h51l-5-22h-41Zm-12 0h75v13H91Z',plum)+star(128,81,paper,.65)+l('M86 132 52 159m121-27 28 27')+baton(201,157)+p('m96 119 32 25 32-25-18 54-14-19-14 19Z',paper));
add('spades','A','Oko za oponou','Otevřené oko v papírové hvězdě je znakem každé dobré iluze.',
 p('m128 33 24 47 52-9-23 49 29 44-54 3-28 47-28-47-54-3 29-44-23-49 52 9Z',plum)+p('M66 126q61-66 124 0-63 65-124 0Z',paper)+p('m128 89 29 37-29 37-29-37Z',gold)+c(128,126,15,ink)+c(133,120,5,paper)+fold('M128 46v21m-64 88 21-4m86 0 21 4'));
export default cards;
