import {p,r,c,e,l,g,eyes,leaf,star,wheel,boots,ink,paper,collection} from './vector.mjs';
const {cards,add}=collection('chalupa');
const red='#F07859', moss='#94B765', teal='#58BFC8', sun='#F2C75B';
const mushroom=(x,y,s=1)=>g(r(-10,0,20,42,paper)+p('M-40 0q1-49 40-49T40 0Z',red)+c(-16,-18,6,paper)+c(12,-30,7,paper),`translate(${x} ${y}) scale(${s})`);
const hat=(x,y,color=moss)=>e(x,y,43,10,color)+p(`M${x-27} ${y-4}l7-29h40l8 29Z`,color);
const bucket=(x,y,color)=>p(`m${x-25} ${y}h50l-6 47h-38Z`,color)+p(`M${x-22} ${y}q0-42 44 0`,'none');
const paddle=(x,y,angle=0)=>g(l('M0 0v103')+p('M-11 70H11V122Q0 145-11 122Z',sun),`translate(${x} ${y}) rotate(${angle})`);
// Zahrada: tomato enamel, fresh leaves, improvised weekend mechanics.
add('hearts','7','Hadice na útěku','Zahradní hadice udělala uzel a pustila se na výlet.',
 p('M65 186q-39-76 23-111 63-30 91 20 26 53-20 69-35 11-46-24-4-29 22-33','none',`stroke="${moss}" stroke-width="23"`)+g(r(124,96,54,29,red)+r(169,91,18,39,paper,2),'rotate(-18 155 111)')+p('m189 90 12-22m-1 31 19-7m-19 21 19 6','none',`stroke="${teal}"`)+l('M65 188h29'));
add('hearts','8','Kolečkový pancíř','Kolečko zaparkované na bok kryje víkendové zásoby.',
 p('M67 68h119l-23 91H92Z',red)+p('m79 82 17 63h56l17-63Z',paper)+l('M92 159 62 191m99-32 36 31M75 68 58 46m128 22 17-22')+wheel(126,194,moss)+r(82,44,18,31,ink)+r(159,44,18,31,ink));
add('hearts','9','Sekačkový jezevčík','Nízký zahradní pomocník má místo ocasu startovací šňůru.',
 wheel(79,186,moss)+wheel(166,186,moss)+r(67,128,115,53,red,16)+p('M146 135V94q33-29 57 9v38l-33 16Z',paper)+p('M148 103q-23-19-25 7l15 47 18-9Z',ink)+c(182,108,5,ink)+c(203,127,7,ink)+l('M80 129 62 90H42')+c(39,88,7,red)+r(84,111,43,20,moss)+eyes(99,148,26));
add('hearts','10','Grilovací modul','Improvizovaný gril vypadá jako malá víkendová kosmická loď.',
 p('M63 121h132q-7 58-65 59-58-1-67-59Z',red)+e(129,120,66,15,ink)+l('M99 176 80 212m77-36 21 36M81 200h96')+p('M76 91q7-50 54-49 48 0 54 49Z',red)+r(114,32,31,13,ink)+l('M87 112h83m-70-8v17m20-17v17m20-17v17m20-17v17')+p('M58 80q-14-15 0-30m145 37q16-16 0-31','none'));
add('hearts','J','Sazenicový kurýr','Chalupář v lacláčích převáží poslední rajče v kelímku.',
 boots()+p('M98 107h59l13 78H84Z',red)+r(107,118,42,42,paper)+e(127,78,24,27,paper)+hat(127,56,sun)+eyes(117,81,21)+l('M98 126 66 146m91-20 29 20')+p('M173 143h30l-6 31h-18Z',sun)+leaf(188,144,moss)+leaf(188,144,moss,100));
add('hearts','Q','Paní záhonů','Zahradnice s konví a slunečním kloboukem má vše pod kontrolou.',
 boots()+p('M109 106h35l36 83H76Z',red)+e(127,79,24,26,paper)+hat(127,56,sun)+eyes(117,81,21)+p('m111 115 17 21 16-21v61h-33Z',paper)+l('M99 125 64 144m91-19 32 18')+r(41,139,36,31,moss)+l('M78 147 94 132m-50 12q-23-26 0-30')+leaf(188,144,moss,-30));
add('hearts','K','Trpaslík vedoucí směny','Monumentální zahradní trpaslík dohlíží na velmi malou směnu.',
 boots()+p('M87 115h82l19 77H67Z',red)+e(127,92,34,35,paper)+p('M87 77 119 31l28 7 21 39Z',red)+p('M94 98q33 23 67 0l-9 46-25 24-26-24Z',paper)+eyes(114,91,26)+c(128,106,11,sun)+l('M84 133 52 160m120-27 27 27V93')+p('m187 94 12-25 12 25Z',moss)+r(104,170,47,12,ink));
add('hearts','A','Zahradní slunce','Velká slunečnice vyrůstá z konve jako totem letní úrody.',
 p('m128 35 13 25 27-6-2 28 24 15-22 19 5 28-29 1-16 24-17-24-29-1 5-28-21-19 24-15-2-28 27 6Z',sun)+c(128,94,28,ink)+c(128,94,15,red)+l('M128 133v35')+leaf(128,158,moss)+r(91,166,70,45,red)+l('m161 175 37-22m-107 24q-37-37 0-30'));
// Les: moss, vermilion caps, baskets and compact woodland characters.
add('diamonds','7','Děravý košík','Houby si otvorem v košíku právě vyhlásily samostatnost.',
 p('M66 113h124l-19 80H87Z',sun)+p('M84 113q0-87 88 0','none')+l('M78 137h100m-92 21h86m-85 21h76M101 117v70m26-70v31m26-31v30')+p('m114 168 15-22 16 22-7 25h-19Z',ink)+mushroom(181,185,.65)+mushroom(76,208,.65));
add('diamonds','8','Mechový deštník','Houbový klobouk chrání před vytrvalou víkendovou přeháňkou.',
 mushroom(128,118,1.8)+l('M127 190v13q0 15 23 8')+leaf(77,153,moss,-60)+leaf(182,153,moss,110)+c(54,52,6,teal)+c(196,67,6,teal));
add('diamonds','9','Ježek houbař','Ježek nese úrodu tak pečlivě, až ji má po celých zádech.',
 p('m55 151 7-31 18 8 9-32 21 16 20-32 18 29 27-10 1 34 25 12-9 35-39 21H80Z',moss)+p('M148 144q26-9 42 11l23 25-42 17-37-11Z',paper)+c(181,162,5,ink)+c(211,179,7,ink)+r(83,187,20,21,ink)+r(153,188,20,20,ink)+mushroom(106,101,.65)+mushroom(151,116,.5));
add('diamonds','10','Posed s výhledem','Malý lesní posed nabízí výhled přesně na největší hřib.',
 l('M87 127 72 215m93-88 17 88M80 173h95m-90-29 84 61m3-61-87 61')+r(78,78,96,60,sun,1)+p('m62 78 65-44 64 44Z',moss)+r(108,91,38,28,ink,1)+mushroom(198,189,.6)+l('M52 202V133m-10 21 10-16 10 16m-21 21 11-16 11 16'));
add('diamonds','J','Průzkumník paseky','Houbař s lupou kontroluje každý nález ještě před košíkem.',
 boots()+r(98,108,61,78,moss,8)+e(128,78,25,28,paper)+hat(128,56,moss)+eyes(118,81,22)+l('M99 123 72 146m87-22 25 22')+bucket(60,155,sun)+c(188,131,17,teal)+l('m178 145-14 20')+r(109,130,39,25,sun));
add('diamonds','Q','Strážkyně podhoubí','Lesní průvodkyně má korunovaný klobouk a atlas pod paží.',
 boots()+p('M109 108h37l33 81H77Z',moss)+e(128,80,24,27,paper)+mushroom(128,64,.9)+eyes(118,83,21)+l('M101 126 65 146m90-20 30 20')+r(172,128,32,45,sun,1)+p('M117 125h22v43h-22Z',paper)+leaf(64,146,moss,30));
add('diamonds','K','Král pařezu','Lesní obr se zabydlel v pařezu a z hřibů si postavil korunu.',
 p('M83 104h88l13 83 20 24-43-4-33 13-30-13-45 4 20-24Z',moss)+e(128,102,37,38,paper)+p('M94 110q34 19 68 0l-9 42-25 25-26-25Z',sun)+eyes(113,100,29)+mushroom(104,58,.6)+mushroom(151,58,.6)+mushroom(128,58,.75)+l('M87 145 54 163m115-18 33 18M99 174v26m58-26v26'));
add('diamonds','A','Královský hřib','Tři hřiby v mechu tvoří silnou siluetu lesního pokladu.',
 p('M57 200q32-30 70-10 40-23 73 10l-72 19Z',moss)+mushroom(80,160,.75)+mushroom(177,164,.75)+mushroom(127,112,1.4)+leaf(72,202,moss,-40)+leaf(185,202,moss,100));
// Voda: turquoise inflatable forms, graphic ripples and reed gold.
add('clubs','7','Píchlá labuť','Nafukovací labuť ztrácí vzduch, ale drží si důstojnost.',
 e(116,161,68,35,teal)+e(116,154,39,16,paper)+p('M158 153V91q-2-45 31-45 32 0 22 36l-26 8v63Z',paper)+p('m208 68 16 12-19 9Z',sun)+c(194,62,5,ink)+p('M74 154 52 133l-5 32Z',paper)+p('m120 173 9-11 8 14-12 7Z',ink)+l('M69 207h112m-135-9h26m126-7h18'));
add('clubs','8','Kruhová záchrana','Velký kruh s lepicí záplatou je připravený na každou mělčinu.',
 c(128,126,79,teal)+c(128,126,42,paper)+p('m71 72 27 26-17 19-30-21m115-24-27 26 17 19 30-21m-115 84 27-26-17-19-30 21m115 24-27-26 17-19 30 21',sun)+g(r(98,181,48,19,paper,2),'rotate(-15 122 190)')+l('M56 50 43 39m158 11 13-11'));
add('clubs','9','Kapr v ploutvích','Rybniční maskot si pořídil vybavení pro vlastní koupání.',
 e(124,127,62,46,teal)+p('m175 125 36-34v69Z',teal)+p('m95 88 23-26 32 25m-56 76-19 37 41-10 7-20m29-4 4 33 36-5-21-28',sun)+c(91,115,17,paper)+c(89,115,6,ink)+l('M68 143q16 8 27-1m38-34 14 16-14 16m22-32 14 16-14 16')+c(61,63,10,teal)+c(48,90,6,teal));
add('clubs','10','Molo pro dva','Dřevěné molo s jediným lehátkem a velkým letním klidem.',
 p('m53 158 110-44 45 48-111 47Z',sun)+l('M72 151 115 202m-20-60 43 51m-20-60 43 51m-20-60 43 51M64 177v27m127-23v28')+p('m102 115 8-51 42-8-7 51 22 16-42 16Z',teal)+l('m104 127-12 28m63-34 16 22')+p('M45 219h40m79 0h46','none',`stroke="${teal}"`));
add('clubs','J','Pádlař z mělčiny','Letní kurýr ve vestě dopravuje vzkazy na druhý břeh.',
 boots()+r(99,111,59,73,teal,8)+p('M99 112h26v62H99m34-62h25v62h-25Z',sun)+e(128,79,25,28,paper)+p('M99 67q1-32 29-32 30 0 31 32Z',teal)+eyes(118,82,22)+l('M99 128 69 145m90-17 31 17')+paddle(187,74,-9));
add('clubs','Q','Pán plovárny','Plavčík s píšťalkou a záchranným válcem hlídá letní pohodu.',
 boots()+p('M110 106h35l27 82H84Z',teal)+e(128,78,24,27,paper)+p('M99 66q29-31 58 0l-15 8h-28Z',sun)+eyes(118,81,21)+l('M102 124 65 145m89-21 29 21M120 107l9 33 12-33')+c(129,142,7,sun)+g(r(172,119,29,66,red,14),'rotate(-18 187 150)')+c(62,151,11,paper));
add('clubs','K','Admirál bazénu','Mohutný král malého nafukovacího bazénu nese slunečník jako žezlo.',
 boots()+p('M89 108h78l24 76H65Z',teal)+e(128,79,31,32,paper)+p('M91 62 100 37h56l10 25Z',paper)+p('M107 38v-9h41v9Z',sun)+eyes(115,81,26)+p('M110 97q18-13 36 0l-18 10Z',ink)+e(128,170,67,26,teal)+e(128,164,40,10,paper)+l('M81 124 51 145m125-21 25 21V68')+p('M174 66q27-42 54 0Z',sun));
add('clubs','A','Rybniční léto','Slunce, vlna a rákosí tvoří jeden vodní totem.',
 c(127,91,49,sun)+p('M48 141q32-32 62 0t62 0q-5 57-60 63-48-7-64-63Z',teal)+p('M67 155q23-20 45 0t44 0','none',`stroke="${paper}"`)+l('M182 197V83m15 114V66M182 140l-17-21m32 39 17-21')+r(176,66,12,42,moss,6)+r(191,49,12,41,moss,6));
// Výpravy: warm canvas, yellow equipment, crisp travel silhouettes.
add('spades','7','Stan po větru','Stan si přeložil návod po svém a teď stojí na jediné tyčce.',
 p('m62 183 51-117 82 99-54 40Z',sun)+p('m113 66 12 115 70-16Z',red)+p('m113 66-18 133 30-18Z',ink)+l('M61 184 39 208m157-43 22 31M113 66l12-30M44 86h31m-19 17h25m92-53h29')+r(34,201,17,10,ink,1)+r(208,191,17,10,ink,1));
add('spades','8','Pláštěnkový štít','Složená pláštěnka ochrání výpravu i před neplánovaným piknikem.',
 p('M97 88q-9-43 30-47 39 4 31 47l44 53-29 19-16-23 14 73H83l14-73-16 23-29-19Z',sun)+e(127,79,19,24,ink)+l('M127 104v92m-29-39h20m19 0h20M85 196h84'));
add('spades','9','Turistický šnek','Domov si nese s sebou a na zádech ještě stan pro hosty.',
 p('M49 179q22-21 47-10h73l22-40 10 15-5 48q-65 34-147 3Z',paper)+c(119,136,49,sun)+p('M130 109q-41-13-38 26 4 32 30 20 16-8 7-23','none')+p('m80 95 37-56 43 56Z',red)+p('m117 39 1 56h20Z',ink)+l('M184 141V112m14 24 13-25')+c(184,109,7,sun)+c(213,107,7,sun)+eyes(179,162,20));
add('spades','10','Karavan na louce','Malý obytný přívěs má velké plány a venkovní hrnek.',
 wheel(102,191,sun)+wheel(171,191,sun)+r(51,72,146,112,sun,22)+r(67,92,49,39,teal,4)+l('M92 92v39')+r(135,91,45,84,paper,3)+r(144,101,27,31,teal,1)+c(169,145,4,ink)+l('M197 174h21v21M73 60h101')+r(104,50,46,20,red,4)+r(42,146,28,23,paper)+l('M42 150q-18-4-12 12h12'));
add('spades','J','Posel posledního buřtu','Pěší kurýr s batohem chrání poslední večeři na klacku.',
 boots()+r(80,106,36,69,red,10)+r(101,107,57,76,sun,8)+e(129,78,24,28,paper)+hat(129,56,moss)+eyes(119,81,22)+l('M105 129 69 149m89-20 30 17V73')+g(r(178,54,24,48,red,10),'rotate(25 190 77)')+l('M109 138h34m-17-24v62'));
add('spades','Q','Vedoucí výpravy','Průvodkyně s mapou a kompasem zná cestu i ke stánku.',
 boots()+p('M108 106h39l27 83H81Z',sun)+e(128,78,24,27,paper)+hat(128,56,red)+eyes(118,81,21)+l('M100 124 70 142m86-18 29 18')+p('m48 135 20 7 19-7 18 7v38l-18-7-19 7-20-7Z',paper)+l('M68 142v38m19-45v38')+c(191,150,17,teal)+p('m191 138 7 13-14 0Z',paper));
add('spades','K','Velmistr ohniště','Zavalitý táborník má korunu z větviček a plášť z deky.',
 boots()+p('M86 106h84l25 87H60Z',sun)+e(128,81,31,33,paper)+p('M99 102q29 14 58 0l-12 34-17 17-19-17Z',red)+eyes(115,80,26)+l('M100 60 92 36l21 12 15-22 16 22 20-12-9 24M89 130 52 156m116-26 32 26')+r(108,153,39,31,paper)+p('m117 170 11-13 11 13-11 8Z',red)+l('M70 179h20m78 0h20'));
add('spades','A','Víkendový kompas','Kompas s malým stanem ukazuje jediný směr: ven.',
 c(128,128,72,sun)+c(128,128,53,paper)+p('m128 76 18 52-18 51-18-51Z',red)+p('m128 128 18 0-18 51Z',ink)+r(111,39,34,20,ink)+c(128,31,12,sun)+p('m64 200 25-34 24 34m30 0 25-34 24 34',moss)+l('M75 128h14m78 0h14M128 185v13'));
export default cards;
