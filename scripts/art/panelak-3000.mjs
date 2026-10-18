import {p,r,c,e,l,g,eyes,star,wheel,boots,ink,paper,collection} from './vector.mjs';
const {cards,add}=collection('panelak-3000');
const apricot='#F5A16E', green='#A4C970', purple='#AF98D2', blue='#74B9E6';
const win=(x,y,color=paper)=>r(x,y,24,29,color,1)+l(`M${x+12} ${y}v29`);
const panel=(x,y,w,h,color)=>r(x,y,w,h,color,2)+l(`M${x} ${y+h/2}h${w}`);
const pot=(x,y,color=green)=>p(`m${x-15} ${y}h30l-5 24h-20Z`,apricot)+l(`M${x} ${y}v-25m0 11-17-12m17 5 15-14`)+c(x-18,y-29,9,color)+c(x+17,y-36,10,color);
const antenna=(x,y,color=blue)=>l(`M${x} ${y}v-55m-28 8h56m-21-12v25m-14-25v25`)+c(x,y-59,7,color);
// Byty: peach enamel, round appliances, square domestic robots.
add('hearts','7','Toustový poplach','Topinkovač vystřelil snídani rovnou na orbitu.',
 r(65,111,126,79,apricot,19)+r(82,99,91,17,ink)+g(p('M96 87V61q-13-23 7-26h47q20 3 7 26v26Z',paper)+p('M108 77V60h38v17Z',apricot),'rotate(-13 127 67)')+r(87,190,22,13,ink)+r(152,190,22,13,ink)+c(169,146,9,paper)+l('M89 132h51M55 72l-13-9m151 13 16-13'));
add('hearts','8','Dveře na tři západy','Bezpečnostní dveře s okénkem do jiného obýváku.',
 r(70,40,116,176,ink,6)+r(81,51,94,153,apricot,3)+e(128,101,24,29,paper)+p('m112 105 17-22 15 22Z',blue)+r(145,139,19,10,ink)+l('M91 160h42m-42 17h42m-42 17h42')+c(156,161,5,paper));
add('hearts','9','Luxík','Robotický vysavač si konečně našel vlastní pantofle.',
 e(128,162,72,39,apricot)+p('M56 150v17q72 49 144 0v-17',apricot)+e(128,145,72,35,paper)+r(99,132,57,24,ink,10)+eyes(115,144,25)+l('M128 110V85')+c(128,79,11,apricot)+r(72,188,43,22,purple,12)+r(146,188,43,22,purple,12));
add('hearts','10','Obývák na orbitě','Celý panelákový obývák drží pohromadě na jediné platformě.',
 p('m49 166 79-29 79 29-79 43Z',ink)+r(70,102,114,57,apricot,13)+r(61,127,30,43,apricot,9)+r(165,127,30,43,apricot,9)+r(91,130,74,31,paper,5)+l('M128 105v24M69 174v18m115-18v18')+r(92,49,70,42,blue,6)+l('M127 49 114 29m13 20 17-20')+r(105,166,46,15,paper));
add('hearts','J','Poslíček v papučích','Domácí robot doručuje balík přes jedinou chodbu.',
 boots()+r(94,105,64,78,apricot,12)+r(101,56,51,46,paper,10)+r(109,70,35,16,ink)+eyes(118,78,17)+l('M94 123 68 144m91-21 28 21')+r(61,133,46,40,paper,2)+l('M84 133v40m-23-22h46')+p('M108 57V40h36v17Z',apricot)+c(127,37,7,apricot));
add('hearts','Q','Správkyně domácí sítě','V županu řídí topení, Wi-Fi i sousedské přání ticha.',
 boots()+p('m103 104 49 1 24 83H79Z',apricot)+e(127,77,23,27,paper)+p('M100 72V50q27-21 54 0v22h-15V59h-25v13Z',purple)+eyes(117,80,21)+l('M128 111v64m-26-62 25 26 24-26M94 123 65 145m94-22 28 22')+r(175,113,27,42,blue)+c(188,141,4,paper));
add('hearts','K','Předseda družstva','Impozantní soused s klíči od všech společných prostor.',
 boots()+p('M87 106h83l20 82H67Z',apricot)+r(103,59,50,48,paper,10)+p('M95 61q7-31 32-31t35 31Z',ink)+eyes(116,79,24)+p('m103 92 24-9 27 9-14 8-13-7-11 7Z',purple)+l('M98 123 67 145m98-22 26 22')+c(191,160,17,paper)+l('M191 176v26m0-10h15m-15 8h11')+p('m128 117 13 20-13 32-13-32Z',ink));
add('hearts','A','Svatý radiátor','Žebrovaný zdroj domácího tepla dostal vlastní oběžnou dráhu.',
 r(64,84,128,96,ink,9)+[72,96,120,144,168].map(x=>r(x,72,17,120,apricot,8)).join('')+l('M58 108H43v27m149-27h20v24M84 193v17m85-17v17')+c(211,141,11,paper)+p('M57 68q69-44 142 1M49 199q79 40 158-4','none')+star(128,42,apricot,.7));
// Balkony: green rails, floating laundry, small private jungles.
add('diamonds','7','Uprchlý sušák','Poryv větru proměnil prádlo v malou leteckou flotilu.',
 l('M55 94h143M72 94l-15 115m125-115 16 115M66 151h126')+p('m78 92 18 1 8 27-15 25-23-19Z',green)+p('m126 94 19-14 22 14 16-7 17 27-16 11-9-11v47h-46v-47l-10 11-16-11 17-27Z',paper)+r(78,82,7,18,apricot,1)+r(149,82,7,18,apricot,1)+l('M42 56h35m-22 16h29m98-24h28'));
add('diamonds','8','Sluneční markýza','Pruhovaná obrana malého balkonu před velkým vedrem.',
 p('M60 62h138l20 67H40Z',green)+p('m83 62-8 67h29l3-67Zm58 0 7 67h29l-13-67Z',paper)+p('M40 129q15 23 29 0 15 23 30 0 15 23 30 0 15 23 30 0 15 23 29 0 15 23 30 0','none')+l('M59 145v62m139-62v62M60 186h138')+c(128,175,17,apricot));
add('diamonds','9','Holub na nabíječce','Sídlištní pták obsadil květináč s bezdrátovým dobíjením.',
 p('M86 150h84l-13 61h-58Z',green)+r(90,158,76,12,paper,1)+p('M93 144q-19-54 16-66 11-44 44-25 23 14 8 41l18 34-34 23Z',paper)+p('M119 111q45-23 40 19l-36 20Z',blue)+p('m163 70 27 9-30 14Z',apricot)+c(149,70,5,ink)+l('M127 51V28m-12 7h24')+p('m116 176 20-8-10 17 16-6','none'));
add('diamonds','10','Zavěšená džungle','Samostatný balkon unese více zeleně než celý park.',
 p('m54 167 142-14v40L54 208Z',green)+l('M54 167v-40l142-12v38M77 127v37m29-40v38m29-41v39m30-42v40')+pot(90,118)+pot(151,109)+p('M151 74q-44-26-25-42 26 4 25 42 5-33 28-34 16 23-28 34Z',green)+r(57,172,141,13,paper,1));
add('diamonds','J','Balkonový převozník','Zručný soused dopravuje sazenice mezi patry na laně.',
 l('M41 44h174m-86 0v36')+c(129,45,13,paper)+p('m109 109 39-7 20 72-77 12Z',green)+e(128,83,23,25,paper)+eyes(118,85,21)+p('m99 72 8-24h40l16 24Z',apricot)+l('M103 119 72 143m77-28 34 27M108 178l-15 28m51-30 18 23')+pot(61,151)+r(173,136,29,35,paper));
add('diamonds','Q','Královna pelargonií','Zahradnice vládne závěsným květináčům i gravitaci.',
 boots()+p('M111 106h32l37 84H76Z',green)+e(127,77,23,27,paper)+p('M98 64q29-35 58 0Z',apricot)+c(105,51,10,green)+c(128,43,12,green)+c(151,51,10,green)+eyes(117,79,21)+l('M100 122 64 143m92-21 35 21')+pot(57,146)+pot(198,146)+p('m109 125 19 22 18-22v52h-37Z',paper));
add('diamonds','K','Pán devátého patra','Domácí mechanik s pancířem z truhlíků a satelitním kloboukem.',
 boots()+r(83,113,89,75,green,8)+e(128,83,29,31,paper)+p('M85 65q43-41 86 0Z',green)+l('m128 64 15-29')+c(145,31,7,blue)+eyes(116,84,24)+r(79,142,97,28,apricot,2)+pot(97,143)+pot(158,143)+l('M83 124 48 154m125-30 34 30'));
add('diamonds','A','Balkonový vesmír','Kulatá planeta s vlastním balkonem, sušákem a jednou kytkou.',
 c(128,121,65,green)+p('M68 120q57 34 120-5v50q-62 44-120-1Z',paper)+l('M68 120v-19l120-7v21M92 101v28m26-30v34m27-36v32m26-34v27')+pot(129,86)+p('M46 171q53 63 158-61M49 160q-19-34 22-61m115 62q30 6 26-26','none')+star(181,48,apricot,.75));
// Podzemí: violet pipes, utility wheels, portals in concrete.
add('clubs','7','Přetlak v potrubí','Odpojené koleno vypouští bubliny z jiného patra reality.',
 p('M67 197V97q0-35 34-35h78v43h-65v92Z',purple)+r(56,183,70,22,paper,2)+r(166,51,25,65,paper,2)+c(206,82,14,blue)+c(189,132,20,blue)+c(207,171,9,blue)+l('M81 122h30M95 75v28'));
add('clubs','8','Kočárkový tank','Obrněný kočárek ochrání náklad před sklepením i schody.',
 wheel(85,189,purple)+wheel(173,189,purple)+p('M63 135h127l-19 44H82Z',purple)+p('M98 135q-4-80 63-79l35 79Z',paper)+p('m140 60 9 75h27l-22-78Z',purple)+l('M64 138 48 112H34m47 67h95')+r(99,147,51,15,ink,1));
add('clubs','9','Sklepní ježek','Ježek s klíčovým hřbetem našel dokonalé bydlení mezi trubkami.',
 p('m65 147-9-30 22-5-1-29 27 5 11-30 23 22 27-18 8 31 29 2-8 29 20 21-38 30H85Z',purple)+p('M143 143q29-18 47 9l22 22-29 20h-45Z',paper)+c(182,160,5,ink)+c(211,174,7,ink)+r(79,186,22,20,ink)+r(152,187,22,20,ink)+l('M99 114v35m25-55v49m25-32v26')+c(99,110,8,paper)+c(124,91,8,paper));
add('clubs','10','Výtah do mezipatra','V kabině chybí patro. Místo něj se otvírá obloha.',
 r(65,40,121,173,purple,4)+r(79,57,93,139,ink,1)+p('M87 65h40v122H87Zm47 0h30v122h-30Z',blue)+e(125,126,29,47,purple)+star(125,126,paper,1.3)+l('M83 205h87')+r(195,101,16,49,paper,2)+c(203,113,3,purple)+c(203,135,3,purple));
add('clubs','J','Potrubní kurýr','Sklepní údržbář vozí náhradní ventil na skládacím vozíku.',
 boots()+r(99,108,60,77,purple,9)+e(129,79,25,28,paper)+p('M95 68q2-32 34-32t33 32Z',purple)+r(115,55,28,20,paper)+eyes(118,84,23)+l('M101 126 72 149m86-22 29 22')+l('M47 125v71h35')+wheel(58,204,purple)+r(39,142,36,44,blue)+c(57,163,10,paper));
add('clubs','Q','Strážkyně prádelny','Paní podzemního provozu se žezlem z kartáče a pěnovým pláštěm.',
 boots()+p('M104 108h46l27 81H78Z',purple)+e(128,78,24,27,paper)+c(108,52,14,paper)+c(130,45,17,paper)+c(151,54,13,paper)+eyes(118,82,21)+l('M98 125 66 145m88-21 32 20V71')+r(177,51,20,35,blue,1)+l('M181 50V37m7 13V35m7 15V37')+r(107,139,42,29,paper)+c(127,154,10,purple));
add('clubs','K','Kotelník nultého patra','Mohutný živý kotel má knír z trubek a nezměrné zásoby tepla.',
 boots()+r(79,74,99,120,purple,24)+r(110,46,37,32,ink,2)+c(128,128,31,paper)+c(128,128,17,purple)+l('M128 111v34m-17-17h34M80 109H47v61m132-61h30v61')+c(109,89,6,ink)+c(147,89,6,ink)+p('M105 103q-25 25-40 0m83 0q25 25 40 0','none')+r(99,171,58,11,ink));
add('clubs','A','Hlavní uzávěr reality','Ikonický ventil drží všechna patra v jediném rozměru.',
 p('M45 147h166v38H45Z',purple)+r(111,117,34,36,purple,1)+c(128,93,52,ink)+c(128,93,37,purple)+l('M128 56v74M91 93h74M102 67l52 52m-52 0 52-52')+c(128,93,12,paper)+r(38,137,19,58,paper,1)+r(199,137,19,58,paper,1)+star(128,210,purple,.6));
// Střechy: blue dishes, slim aerials, weather instruments and rooftop royalty.
add('spades','7','Přeladěná anténa','Anténa chytila počasí, které do sídliště vůbec nepatří.',
 antenna(125,195,blue)+l('M76 209h99')+p('M100 86q-37-7-27-30 7-17 28-13 9-30 35-14 26-14 35 15 37-3 32 24-3 22-36 18Z',paper)+p('m123 83-15 25h22l-7 23 32-36h-25l11-12Z',blue)+c(64,111,8,blue)+star(191,116,apricot,.6));
add('spades','8','Parabolický štít','Satelitní talíř je dokonalý kryt před vesmírným krupobitím.',
 e(125,122,70,80,blue)+e(125,122,50,62,paper)+p('M89 89q34 18 73 62l-37-16Z',purple)+l('M125 122 178 57')+c(180,54,12,apricot)+p('M100 189h50l18 23H81Z',ink)+star(51,49,blue,.6));
add('spades','9','Kočka s příjmem','Střešní kočka přijímá signál ušima a vysílá ocasem.',
 p('M82 134 75 66l34 25h36l35-25-7 68-13 25 10 40H90l10-40Z',blue)+eyes(108,121,38)+p('m121 136 7 9 9-9Z',paper)+l('M105 148 83 144m68 4 22-4M171 185q39-1 28-44')+antenna(199,143,blue)+r(100,171,58,19,paper)+l('M129 172v17'));
add('spades','10','Střešní observatoř','Větrací věž s vlastním dalekohledem a otočnou střechou.',
 panel(77,119,101,88,blue)+p('M64 119 128 68l64 51Z',ink)+r(111,63,33,35,purple)+g(r(104,39,90,29,paper,3)+r(179,33,23,41,blue,1),'rotate(-22 147 54)')+win(93,148)+win(139,148)+l('M70 207h116'));
add('spades','J','Anténní běžec','Kurýr ve větru přenáší poslední analogový signál.',
 boots()+p('m105 107 41-8 26 80-80 9Z',blue)+e(129,79,24,28,paper)+eyes(120,81,22)+p('M98 65q7-30 31-30t33 30Z',blue)+l('M129 36V21m-24 99-34 21m77-25 31 21')+r(175,128,32,42,apricot)+antenna(191,129,blue)+p('M94 109 61 85l-8 38Z',purple));
add('spades','Q','Paní počasí','Meteoroložka velí větru větrníkem a mrakům čajovou konvicí.',
 boots()+p('M111 104h31l37 85H76Z',blue)+e(127,77,23,27,paper)+p('M95 64q33-32 65 0Z',purple)+eyes(117,79,21)+l('M101 121 64 143m91-22 31 22V66')+p('m187 68-27-18 25-7 2-25 22 18-22 6 17 21-17 5Z',apricot)+c(186,66,6,paper)+r(43,132,29,26,paper)+l('m73 138 12 12-12 5'));
add('spades','K','Král vysílačů','Střešní obr má korunu z antén a plášť z izolační fólie.',
 boots()+p('M87 103h82l26 90H60Z',blue)+r(103,64,51,43,paper,9)+p('M98 65V46h16V31h14v18h16V31h15v34Z',purple)+eyes(117,81,23)+l('M91 121 58 153m109-32 32 32')+r(92,128,70,46,ink)+p('m103 154 10-14 15 16 14-16 10 14','none',`stroke="${blue}"`)+c(58,159,13,paper)+c(199,159,13,paper));
add('spades','A','Signál nad sídlištěm','Čtyři panelové bloky nesou jedinou společnou vysílací korunu.',
 panel(62,131,43,75,blue)+panel(105,102,45,104,paper)+panel(150,144,43,62,blue)+win(71,148)+win(115,121,blue)+win(158,158)+antenna(128,102,blue)+p('M80 71q-12-29 8-51m82 51q12-29-8-51M63 84Q39 36 66 21m124 63q24-48-3-63','none')+l('M53 211h151'));
export default cards;
