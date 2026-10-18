/**
 * Readable rules for every game, shown in the rules panel during play, in the lobby and on
 * the home screen. Each text describes the variant the shared engine implements.
 */
export interface RulesSection { title: string; items: string[] }
export interface GameRules { goal: string; sections: RulesSection[] }

export const RULES: Record<string, GameRules> = {
  prsi: {
    goal: 'Zbav se všech karet jako první.',
    sections: [
      { title: 'Průběh', items: [
        '2–4 hráči, každý dostane 4 karty. Jedna karta se otočí na odhazovací balíček.',
        'Přikládáš kartu stejné barvy nebo stejné hodnoty jako vrchní karta.',
        'Nemáš co hrát? Lízni si kartu. Pokud líznutá karta sedí, můžeš ji hned zahrát, jinak dej „Nehraju“.',
      ] },
      { title: 'Zvláštní karty', items: [
        '7: další hráč bere 2 karty, nebo přiloží svou sedmu a trest se sčítá (+4, +6 …). Proti trestu jde hrát jen sedma.',
        'Svršek (Q) jde na cokoli kromě aktivní sedmy a určíš jím novou barvu.',
        'Eso: další hráč stojí. Ve dvou hraješ hned znovu.',
      ] },
      { title: 'Konec', items: [
        'Vyhrává, kdo se první zbaví karet, i když je poslední karta 7 nebo eso.',
        'Dojde-li balíček, odhozené karty kromě vrchní se zamíchají zpět.',
      ] },
    ],
  },
  sedma: {
    goal: 'Získej se svým týmem víc bodů za esa a desítky.',
    sections: [
      { title: 'Průběh', items: [
        '2 nebo 4 hráči, ve čtyřech tvoří tým protější sedadla. Každý drží 4 karty.',
        'Hraješ jakoukoli kartu, barva nerozhoduje.',
        'Štych drží poslední zahraná sedma nebo karta stejné hodnoty jako první karta štychu.',
      ] },
      { title: 'Pokračování štychu', items: [
        'Po oběhu může vynášející štych ukončit, nebo pokračovat sedmou či původní hodnotou.',
        'Vítěz štychu dobírá první, ostatní po něm do 4 karet.',
      ] },
      { title: 'Body', items: [
        'Eso a desítka mají po 10 bodech. Poslední štych podle nastavení +10.',
        'Vyhrává tým s více body, při shodě je remíza.',
      ] },
    ],
  },
  lhar: {
    goal: 'Zbav se karet. Blafuj, nebo prohlédni blaf ostatních.',
    sections: [
      { title: 'Průběh', items: [
        'Polož 1–4 karty rubem a prohlas, že jsou povinné hodnoty. Hodnota postupuje 7 → 8 → … → eso → 7.',
        'Další hráč tvrzení přijme a pokračuje, nebo ho zpochybní.',
      ] },
      { title: 'Výzva', items: [
        'Pokud tvrzení lhalo, bere celý střed autor. Pokud bylo pravdivé, bere ho vyzyvatel.',
        'Vítěz sporu začíná hodnotou napadeného tvrzení.',
      ] },
      { title: 'Konec', items: [
        'Poslední karta vyhrává až po přijetí nebo vyřešení výzvy.',
        'Ve třech se rozdává 11/11/10 od začínajícího.',
      ] },
    ],
  },
  snaps: {
    goal: 'Jako první dosáhni 66 bodů ve štyších a hláškách.',
    sections: [
      { title: 'Karty a body', items: [
        'Hraje se s 24 kartami: devítky až esa. Eso 11, desítka 10, král 4, svršek 3, spodek 2, devítka 0.',
        'Každý dostane 6 karet. Otočená karta pod talonem určuje trumf.',
      ] },
      { title: 'Otevřený talon', items: [
        'Dokud talon leží otevřený, nemusíš přiznávat barvu ani přebíjet.',
        'Štych bere vyšší karta vynesené barvy, nebo trumf. Vítěz dobírá první.',
        'Na výnosu můžeš vyměnit trumfovou devítku za otočený trumf.',
        'Na výnosu můžeš talon zavřít. Pak už se nedobírá.',
      ] },
      { title: 'Zavřený nebo dobraný talon', items: [
        'Musíš přiznat barvu a přebít, když to jde. Nemáš-li barvu, musíš trumfovat.',
      ] },
      { title: 'Hlášky', items: [
        'Krále a svrška stejné barvy hlásíš při vynesení jednoho z nich: 20 bodů, v trumfech 40.',
        'Body za hlášku se ti připíšou, jakmile vyhraješ aspoň jeden štych.',
      ] },
      { title: 'Konec hry', items: [
        'Kdo dosáhne 66 bodů, hned vyhrává. Za soupeře bez štychu 3 body, pod 33 bodů 2 body, jinak 1 bod.',
        'Kdo zavře talon a 66 nedosáhne, prohrává a soupeř bere 2 body.',
        'Když 66 nedosáhne nikdo, vyhrává poslední štych.',
      ] },
    ],
  },
  durak: {
    goal: 'Zbav se karet. Kdo zůstane poslední s kartami, je durak (hlupák).',
    sections: [
      { title: 'Rozdání', items: [
        '2–4 hráči, 32 karet, každý 6 karet. Spodní karta talonu leží otočená a určuje trumf.',
      ] },
      { title: 'Útok a obrana', items: [
        'Útočník vynese kartu. Obránce ji přebije vyšší kartou stejné barvy nebo trumfem (trumf jen vyšším trumfem), nebo bere.',
        'Po každém přebití můžou útočníci přihodit kartu hodnoty, která už na stole leží. Nejdřív hlavní útočník, pak ostatní kromě obránce.',
        'Na stole může být nejvýš 6 útoků a ne víc, než měl obránce na začátku kola karet.',
      ] },
      { title: 'Konec kola', items: [
        'Když všichni útočníci odmítnou přihodit a vše je přebito, karty jdou pryč a obránce útočí v dalším kole.',
        'Když obránce bere, sebere všechny karty ze stolu a útočí hráč za ním.',
        'Po kole se dobírá do 6 karet: nejdřív útočníci, obránce poslední.',
      ] },
      { title: 'Konec hry', items: [
        'Po dobrání talonu z hry odchází, kdo nemá karty. Poslední hráč s kartami je durak, všichni ostatní vyhrávají.',
      ] },
    ],
  },
  marias: {
    goal: 'Volený mariáš ve třech. Volič hraje proti dvěma obráncům.',
    sections: [
      { title: 'Volba', items: [
        'Volič dostane 7 karet a jednu z nich vybere jako trumf. Pak dostane dalších 5, ostatní po 10.',
        'Volič odhodí 2 karty do talonu a zvolí hru: Hra nebo Kilo (s trumfy, do talonu ne eso ani desítku), Betl nebo Durch (bez trumfů).',
        'K Hře nebo Kilu může volič přidat sedmu, když drží trumfovou sedmu.',
      ] },
      { title: 'Pořadí a povinnosti', items: [
        'Ve Hře a Kilu platí pořadí 7, 8, 9, spodek, svršek, král, desítka, eso. V Betlu a Durchu 7–10, spodek, svršek, král, eso a bez trumfů.',
        'Musíš přiznat barvu a přebít, když to jde. Nemáš-li barvu, musíš trumfovat (jen ve Hře a Kilu).',
      ] },
      { title: 'Hra', items: [
        'Eso a desítka mají po 10 bodech, poslední štych 10. Body se počítají ve Hře i v Kilu.',
        'Král a svršek stejné barvy jsou hláška 20 bodů, v trumfech 40. Hlásí se sama při zahrání jednoho z nich, když držíš i druhého.',
        'Hra vyjde, když má volič víc bodů než oba obránci dohromady. Shoda je pro obránce.',
      ] },
      { title: 'Kilo a sedma', items: [
        'Kilo: volič musí držet trumfovou hlášku (krále a svrška v trumfech), vyhlásit ji a uhrát aspoň 60 bodů ze štychů. Body z hlášek se do těch 60 nepočítají.',
        'Sedma: volič musí vzít poslední štych trumfovou sedmou. Zahraje-li ji dřív, nebo štych nevezme, sedma nevyšla.',
        'Sedma se počítá zvlášť: Hra může vyjít a sedma ne, i naopak.',
      ] },
      { title: 'Betl a Durch', items: [
        'Betl: volič nesmí vzít ani jeden štych. Durch: volič musí vzít všechny štychy.',
      ] },
      { title: 'Flekování', items: [
        'Před první kartou můžou obránci (nejdřív ten po voliči) dát flek. Na flek může volič dát re, na re obránci tutti, pak volič boty a obránci kalhoty.',
        'Každý flek zdvojí celou sázku včetně sedmy. „Dobrý“ flekování ukončí a vynáší volič.',
      ] },
      { title: 'Sázka', items: [
        'Hra 1, sedma 2, Kilo 4, Betl 5, Durch 10, vynásobeno flekem (×2, ×4, ×8 …).',
        'Volič bere sázku od každého obránce, nebo ji každému platí. Vyhrává ta strana, která je v plusu. Večer počítá výhry, sázky se mezi partiemi nesčítají.',
      ] },
    ],
  },
  petr: {
    goal: 'Hlavně ať ti na konci nezůstane Černý Petr (pikový spodek).',
    sections: [
      { title: 'Rozdání', items: [
        'Z balíčku se vyřadí tři spodci. Zbylý pikový spodek je Černý Petr.',
        'Rozdají se všechny karty. Dvojice stejné hodnoty se hned samy odloží.',
      ] },
      { title: 'Tah', items: [
        'Na tahu si naslepo vytáhneš jednu kartu od dalšího hráče. Jeho karty se před tahem zamíchají.',
        'Vznikne-li dvojice, odloží se. Pak táhne další hráč.',
      ] },
      { title: 'Konec', items: [
        'Kdo se zbaví karet, je venku a vyhrává. Kdo zůstane s Petrem, prohrává.',
      ] },
    ],
  },
  oko: {
    goal: 'Dostaň se co nejblíž k 21, ale nepřetáhni. Hraje se jen o body, bez sázek.',
    sections: [
      { title: 'Hodnoty karet', items: [
        '7–10 podle čísla, spodek 1, svršek 1, král 2, eso 11.',
        'Dvě esa jsou „oko“ a porazí všechno.',
      ] },
      { title: 'Průběh', items: [
        'Bankéř se každé kolo střídá. Každý dostane 1 kartu a vidí jen svoje karty.',
        'Hráči po bankéři si říkají o další kartu, nebo stojí. Přes 21 prohráváš hned.',
        'Bankéř hraje poslední.',
      ] },
      { title: 'Vyhodnocení', items: [
        'Každý hráč se porovná s bankéřem. Vyšší součet do 21 bere bod, shoda je pro bankéře.',
        'Přetáhne-li bankéř, berou body všichni, kdo nepřetáhli. Výhra okem má 2 body.',
        'Partie má dvě kola bankéře na hráče (aspoň 4 kola). Vyhrává nejvíc bodů.',
      ] },
    ],
  },
  pexeso: {
    goal: 'Najdi co nejvíc dvojic.',
    sections: [
      { title: 'Dvojice', items: [
        'Všech 32 karet leží rubem nahoru. Dvojici tvoří karty stejné hodnoty a stejné barvy: červená (srdce, káry) nebo černá (kříže, piky).',
      ] },
      { title: 'Tah', items: [
        'Otoč dvě karty. Když tvoří dvojici, bereš si je a hraješ znovu.',
        'Když ne, otočí se zpět a hraje další. Pamatuj si, co už bylo vidět.',
      ] },
      { title: 'Konec', items: [
        'Vyhrává, kdo má nejvíc dvojic, při shodě všichni nejlepší. Sólo hraješ na co nejméně tahů.',
      ] },
    ],
  },
};
