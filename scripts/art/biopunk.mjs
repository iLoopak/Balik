import {p,r,c,e,l,g,eyes,leaf,star,boots,ink,paper,collection} from './vector.mjs';
const {cards,add}=collection('biopunk');
const acid='#ADE34B', violet='#B29AE8', coral='#F48A69', cyan='#63D7D1';
const root=d=>p(d,'none',`stroke="${ink}" stroke-width="9"`);
const chip=(x,y,color)=>r(x,y,46,39,ink)+r(x+9,y+9,28,21,color)+l(`M${x+8} ${y-8}v8m15-8v8m15-8v8M${x+8} ${y+39}v8m15-8v8m15-8v8`);
const cap=(x,y,color,s=1)=>g(p('M-46 0Q-34-55 0-51Q34-55 46 0Z',color)+e(0,0,46,10,paper)+r(-10,5,20,36,paper)+c(-17,-19,6,paper)+c(15,-29,8,paper),`translate(${x} ${y}) scale(${s})`);
// Thorn gardens: serrated petals, black circuitry and battery-seed amber.
add('hearts','7','Přepólovaný klíček','Prasklá baterie vypouští kořenový kabel místo proudu.',
 r(74,91,108,104,acid,14)+r(107,72,42,19,ink)+p('m128 99-18 31h23l-12 28 32-39h-24Z',paper)+root('M95 194q-25 4-36 24m92-24 29 18 24-7')+leaf(99,90,acid,-30)+leaf(151,92,acid,100)+l('m54 80-12-12m159 27 13-9'));
add('hearts','8','Trnový štít','Skládaný list chrání citlivé procesorové jádro.',
 p('m128 42 24 24 33-4-3 31 25 21-21 26 4 33-35 8-27 31-27-31-35-8 4-33-21-26 25-21-3-31 33 4Z',acid)+p('M128 65v121L91 160l4-67Z',paper)+chip(108,103,acid)+l('M96 93 75 79m83 14 22-14m-22 75 22 13M96 154l-20 13'));
add('hearts','9','Mucholapka na nožkách','Zubatý květ se sám přemisťuje za teplem nabíječek.',
 root('M129 146v39m0-6-35 29m35-29 34 28')+leaf(126,179,acid,-25)+p('M67 78q54-49 119 0l-17 44H85Z',acid)+p('M85 122h84l19 18q-62 52-121 0Z',acid)+p('m79 80 18 23 13-23 17 23 17-23 16 23 15-23m-96 61 19-14 12 17 17-17 18 17 16-17 14 14',paper)+eyes(106,59,43));
add('hearts','10','Skleník v serveru','Ze serverové skříně vyrostla klenba masožravých listů.',
 r(78,113,103,94,ink)+r(91,130,77,15,acid)+r(91,157,77,15,acid)+c(153,190,5,acid)+root('M126 114V64m0 24-40-20m40 9 43-26')+leaf(127,78,acid)+leaf(91,72,acid,-60)+leaf(165,58,acid,100)+p('m164 108 14-31 20 17-6 30Z',acid)+l('M97 138h37m-37 26h37'));
add('hearts','J','Sběrač slunce','Lehký zahradní kurýr nese nabitý semenný článek.',
 boots()+p('m99 107 47-7 23 77-82 8Z',ink)+p('M101 117h38l13 44-53 12Z',acid)+e(125,79,25,28,paper)+p('M91 70q29-44 68 0l-21-4-14 17-12-15Z',acid)+eyes(115,81,23)+l('m99 126-30 20 10 24m70-44 29 14')+r(176,117,28,45,acid)+leaf(191,118,acid,40));
add('hearts','Q','Královna roubů','Dirigentka živého obvodu spojuje stonek s měděnou sběrnicí.',
 boots()+p('M107 102h38l37 87H75Z',acid)+e(127,77,24,27,paper)+p('m96 65 3-24 22 11 8-22 14 22 20-11-3 24Z',acid)+eyes(117,79,21)+root('M90 120 63 144m99-23 25 27V82')+leaf(189,91,acid,70)+chip(106,133,acid));
add('hearts','K','Fotosyntetický kolos','Obří květ s mechanickou čelistí střeží poslední světlo.',
 root('M98 172 70 210m88-38 27 38M83 127 47 145m128-18 34 18')+p('m74 101 9-36 30 10 13-34 20 34 30-10 9 36 28 20-26 23-4 35-36-6-24 26-23-26-36 6-4-35-25-23Z',acid)+e(127,125,48,47,ink)+p('m91 107 17 18 18-18 18 18 18-18m-65 42 17-18 17 18 18-18 17 18',paper)+c(110,93,6,coral)+c(144,93,6,coral));
add('hearts','A','Semenný reaktor','Zubatá semenná kapsle je totemem růstu, který nic nezastaví.',
 p('M127 48q78 56 47 116l-47 46-47-46Q49 104 127 48Z',acid)+p('M127 77v113l33-51Z',ink)+c(128,129,21,paper)+p('m128 113-11 19h17l-8 15 22-22h-17Z',acid)+leaf(123,64,acid,-30)+leaf(132,62,acid,100)+l('M56 108 43 99m154 9 13-9M57 174l-12 12m152-12 12 12'));
// Mycosíť: umbrella caps, pale hyphae, spore sockets.
add('diamonds','7','Chybová spora','Prasklá datová kapsle omotaná myceliem hledá nový port.',
 p('M87 67h79l24 43-22 81H87l-22-81Z',violet)+p('m129 69-18 40 29 19-19 63','none')+c(100,117,8,paper)+c(153,151,11,paper)+root('M89 188 66 211m89-24 31 23M73 134H45v-24m137 17h27v24')+c(45,103,8,violet)+c(209,158,8,violet));
add('diamonds','8','Spórový deštník','Masivní houbový klobouk odstíní i datový déšť.',
 cap(127,116,violet,1.65)+root('M127 184v14q0 18 24 12')+l('M93 126v13m35-12v15m34-17v13')+star(60,65,violet,.6)+star(196,74,violet,.7));
add('diamonds','9','Šnek s hotspotem','Šnek nese na ulitě svítící houbový přístupový bod.',
 p('M51 177q14-29 46-23h80l24-34v61q-59 38-150 13Z',paper)+c(122,134,43,violet)+p('M132 111q-32-14-34 18 1 28 27 20 19-7 4-20','none')+cap(122,83,violet,.75)+l('M181 136V99m19 30 12-34')+c(181,96,7,violet)+c(214,92,7,violet)+eyes(181,154,20));
add('diamonds','10','Katedrála podhoubí','Tři plodnice tvoří živý síťový rozbočovač.',
 root('M127 147v37l-42 27m42-27 43 27m-43-27v30M92 143v37l-36 16m106-51v34l38 17')+cap(86,118,violet,.75)+cap(165,121,violet,.85)+cap(127,77,violet,1)+r(110,160,34,23,ink)+c(127,172,5,violet));
add('diamonds','J','Spóronoš','Úzký kurýr v pláštěnce doručuje lahvičku spór.',
 boots()+p('m107 107 36-2 26 83H83Z',violet)+r(109,77,36,34,paper)+eyes(119,91,17)+cap(127,70,violet,.9)+l('M100 128 64 151m90-22 29 21')+r(46,143,31,40,paper)+r(53,136,17,9,ink)+c(61,166,7,violet)+l('m127 131-10 45'));
add('diamonds','Q','Dirigentka hyf','Dva kabelové vějíře propojují celé podzemní město.',
 p('M111 110h32l40 82H73Z',violet)+r(109,74,36,39,paper)+eyes(118,90,18)+cap(127,66,violet,.85)+root('M97 126 65 151V97m91 29 34 25V97')+l('M65 97 43 77m22 20V68m0 29 20-20m105 20-20-20m20 20V68m0 29 21-20')+c(43,74,7,violet)+c(65,63,7,violet)+c(85,73,7,violet)+c(170,73,7,violet)+c(190,63,7,violet)+c(211,74,7,violet));
add('diamonds','K','Král kolonizátor','Houbový obr vyrostl přímo ze základové desky.',
 r(72,175,112,29,ink)+root('M99 169 60 208m66-35v39m28-41 43 37M82 143l-31 14m122-14 31 14')+p('M101 95h52l25 83H78Z',paper)+cap(127,104,violet,1.6)+eyes(109,126,35)+r(111,148,32,17,ink)+c(127,157,5,violet));
add('diamonds','A','Mykojádro','Jedna plodnice, nekonečná síť. Ikona sdílené paměti.',
 root('M127 137v45m0-7-43 27m43-27 44 27m-44-27v42M86 202H59m25 0v17m87-17h26m-26 0v17')+cap(127,111,violet,1.7)+p('M108 89h38v26h-38Z',ink)+c(127,102,6,violet)+c(60,202,8,paper)+c(196,202,8,paper));
// Chitin: segmented shells, amber joints, small feral machines.
add('clubs','7','Utržené kusadlo','Živý šroubovák s klepety překousl vlastní napájení.',
 p('m106 83-25-30-23 12 8 40 35 23 43-2 41-25 4-40-25-8-22 30Z',coral)+r(104,110,47,78,ink)+r(111,126,33,33,coral)+l('m116 188-8 24m32-24 10 24M99 147l-27 15m80-15 27 15')+c(88,85,7,paper)+c(167,85,7,paper));
add('clubs','8','Krovkový pancíř','Dvě krovky zavřou organický zámek nad napájecím článkem.',
 p('M127 43q-77 20-71 102 10 40 71 68 61-28 71-68 6-82-71-102Z',coral)+p('M127 43v170M65 102l62 33 62-33','none')+r(111,100,32,56,ink)+c(127,124,8,paper)+l('M85 74 99 95m70-21-14 21m-71 59 18 13m68-13-18 13'));
add('clubs','9','Měděný krab','Kabelový korýš sbírá konektory na svém hřbetě.',
 l('M87 146 57 178l-16-4m51-12-16 42m92-58 31 32 15-4m-56-12 16 42')+e(127,141,51,39,coral)+p('M81 132 49 105V66l23 17 17-24 9 44Zm92 0 32-27V66l-23 17-17-24-9 44Z',coral)+l('M107 110V90m40 20V90')+c(107,87,10,paper)+c(147,87,10,paper)+eyes(107,87,40)+r(110,145,34,15,ink));
add('clubs','10','Líheň dronů','Otevřené vajíčko vypouští čerstvého biomechanického brouka.',
 p('m70 119 19 14 18-18 21 20 22-20 17 18 20-14q16 87-59 93-75-6-58-93Z',coral)+e(128,159,32,15,ink)+p('M96 102 82 66l29-8 17 25 18-25 28 8-14 36Z',paper)+e(128,99,20,28,coral)+l('M128 75v49M107 94 87 101m62-7 20 7M115 66l-7-17m33 17 7-17')+c(128,86,5,ink));
add('clubs','J','Kudlankový posel','Okřídlený běžec svírá v kusadlech schránku se vzorkem.',
 p('M123 103Q50 61 57 145l59-13m23-29q65-42 57 42l-59-13',paper)+p('m113 105 27 1 15 60-29 19-26-20Z',coral)+p('m102 78 25-30 28 30-27 25Z',coral)+eyes(115,78,25)+l('m106 153-33 32 15 22m63-54 30 32-15 22M110 113 83 128m60-15 30 14')+r(55,115,31,31,paper));
add('clubs','Q','Matka roje','Přísná vládkyně se čtyřmi pažemi a korunou z tykadel.',
 p('m111 104 33 1 34 89H78Z',coral)+e(128,77,24,27,paper)+p('M104 69 94 42l23 12 11-24 12 24 23-12-11 27Z',coral)+eyes(117,80,21)+l('M104 120 72 101 58 115m46 27-35 20-17-8m97-34 31-19 15 14m-46 27 35 20 17-8')+c(128,151,15,ink)+c(128,151,6,coral));
add('clubs','K','Roháčový titán','Těžký obr s rozevřenými parohy a segmentovým hrudníkem.',
 boots()+p('M86 111h85l21 71-63 22-64-22Z',coral)+r(108,83,39,33,ink)+p('M111 88 81 66V35l23 18 7-19 12 18-3 32m22 4 30-22V35l-23 18-7-19-12 18 3 32',coral)+l('M128 122v68M90 139h75m-80 23h86M74 127l-30 41m138-41 30 41')+c(117,97,4,paper)+c(138,97,4,paper));
add('clubs','A','Chitinový erb','Okřídlený brouk s jantarovým reaktorem tvoří znak roje.',
 p('M118 106Q77 41 45 71l28 59-24 41 69 11m20-76q41-65 73-35l-28 59 24 41-69 11',coral)+e(128,143,29,64,ink)+e(128,143,18,37,coral)+l('M128 108v70m-19-82L92 52m55 44 17-44')+c(128,134,12,paper)+l('m78 103 28 31m-29 23 29 3m72-57-28 31m29 23-29 3'));
// Gene baths: translucent pods, looping tendons, smooth lab shells.
add('spades','7','Zběhlá ampule','Zkumavka praskla a její obsah už má vlastní nohy.',
 g(r(96,56,62,126,paper,24)+r(93,49,68,20,cyan)+p('M101 117q27-21 52 0v39q-26 34-52 0Z',cyan)+eyes(113,139,25)+l('M111 182 84 207m58-25 27 25M98 126 68 113m89 13 29-13'), 'rotate(12 128 128)')+c(189,75,10,cyan)+c(69,66,7,cyan));
add('spades','8','Membránový kokon','Vrstvená buněčná skořápka izoluje zranitelný obvod.',
 p('M127 40q81 51 57 118l-57 56-57-56Q46 91 127 40Z',cyan)+p('M127 65q51 33 37 78l-37 42-37-42Q76 98 127 65Z',paper)+e(127,123,22,33,cyan)+l('m103 102 46 42m-47-24 37 36')+c(127,123,8,ink));
add('spades','9','Axolotl z laboratoře','Obojživelník s konektory místo žaber si oblíbil teplou zásuvku.',
 p('M88 150q-9 39 39 43 52-4 41-43l28 37q-3 34-65 26',cyan)+e(128,118,51,42,cyan)+p('m81 100-25-23-10 16 27 21-29 1 2 19 34-4m95-30 25-23 10 16-27 21 29 1-2 19-34-4',cyan)+eyes(108,115,39)+l('M114 135q14 12 28 0M98 177l-25 12m84-12 25 12')+r(110,158,35,17,paper));
add('spades','10','Genová kolébka','Plovoucí zárodek roste v otevřené servisní kapsli.',
 r(71,58,113,141,ink,37)+r(84,72,87,111,cyan,30)+p('M139 97q-42-15-38 26 0 34 32 26 19-8 7-25','none')+c(133,116,7,paper)+r(90,194,77,17,paper)+l('M72 110H47v25m136-25h25v25')+c(47,141,8,cyan)+c(208,141,8,cyan)+r(106,46,43,17,cyan));
add('spades','J','Nosič vzorků','Symbiotický potápěč doručuje buněčnou kapsli.',
 boots()+p('M101 109h48l20 78H85Z',cyan)+e(127,77,30,33,cyan)+r(107,67,40,24,ink,10)+c(118,79,5,paper)+l('M99 121 74 144m81-22 24 21')+r(52,136,29,44,paper)+c(66,159,7,cyan)+p('M96 79H75V54h20','none')+c(96,52,8,cyan));
add('spades','Q','Správkyně symbióz','Plášť z membrán a dvě dávkovací paže udržují rovnováhu.',
 p('M110 106h33l42 86H71Z',cyan)+e(127,77,23,27,paper)+p('M99 70q-5-38 28-38t28 38l-27-14Z',cyan)+eyes(117,80,20)+l('M100 124 66 145V89m89 35 34 21V89')+r(54,66,23,40,paper)+r(178,66,23,40,paper)+c(65,88,6,cyan)+c(190,88,6,cyan)+p('M113 137h28v34h-28Z',ink));
add('spades','K','První organismus','Mnohoruký živý stroj prorostl laboratorní exoskelet.',
 root('M85 147 52 165l-7 35m126-53 32 18 7 35M98 183l-18 28m74-28 18 28')+p('M86 104q41-44 83 0l15 67-56 34-56-34Z',cyan)+e(128,80,32,37,cyan)+r(107,68,43,23,ink,10)+eyes(118,80,20)+r(106,123,44,53,paper,18)+p('m125 132-8 18 18 13-9 7','none')+c(57,112,13,cyan)+c(201,112,13,cyan)+l('m72 123-15-11m127 11 17-11'));
add('spades','A','Dvojitá evoluce','Dvě živé šroubovice uzavírají zářící buněčné jádro.',
 p('M91 42q93 36 0 86t0 86m73-172q-93 36 0 86t0 86','none',`stroke="${cyan}" stroke-width="19"`)+l('M102 52h51m-38 29h25m-35 87h45m-49 31h54')+e(127,127,39,32,cyan)+e(127,127,20,16,paper)+c(127,127,6,ink));
export default cards;
