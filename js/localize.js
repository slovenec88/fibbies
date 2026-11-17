// Swaps the content (stretches, routines, rankings, Fibbies, chests, quests) into the
// current language in place, so the rest of the app keeps reading s.name, r.title, etc.
// English originals are snapshotted once so switching back is lossless.
import { STRETCHES, ROUTINES, RANKINGS, CATEGORIES } from './data.js';
import { FIBBIES, TIERS, QUESTS } from './rewards.js';
import { getLang } from './i18n.js';
import { CONTENT as DE } from './lang/de.js';
import { CONTENT as ES } from './lang/es.js';
import { CONTENT as FR } from './lang/fr.js';
import { CONTENT as IT } from './lang/it.js';
import { CONTENT as PT } from './lang/pt.js';

const SL = {
  stretches: {
    stand: ['Stoj vzravnano', 'Pripravi se', ['Stoj vzravnano in globoko vdihni.']],
    quad: ['Kvadriceps stoje', 'Kvadricepsi · Upogibalke kolka', [
      'Primi gleženj in peto potegni proti zadnjici.',
      'Kolena drži skupaj in stisni zadnjico.',
      'Stoj vzravnano, boke rahlo potisni naprej.']],
    calf: ['Meče ob steni', 'Meče · Ahilova tetiva', [
      'Roke na steni, zadnja noga iztegnjena, peta pritisnjena v tla.',
      'Počasi se nagni naprej, da se meče raztegnejo.',
      'Zadnja peta naj bo težka, prsti obrnjeni naprej.']],
    fold: ['Predklon stoje', 'Zadnje stegenske · Spodnji del hrbta', [
      'Stopala v širini bokov. Prepogni se v bokih in pusti, da zgornji del telesa visi.',
      'Po potrebi rahlo pokrči kolena. Glava naj bo težka.',
      'Izdihni in se spusti malo globlje.']],
    lunge: ['Nizek izpadni korak', 'Upogibalke kolka · Kvadricepsi', [
      'Zadnje koleno na tleh, sprednje koleno nad gležnjem.',
      'Podvij medenico in boke nežno potisni naprej.',
      'Obe roki iztegni visoko navzgor, da poglobiš raztezanje.']],
    pigeon: ['Golob', 'Zadnjica · Piriformis', [
      'Sprednja golen prečno pred tabo, zadnja noga dolga za tabo.',
      'Poravnaj boke in počasi pomikaj roke naprej.',
      'Dihaj v zunanjo stran kolka.']],
    seatedFold: ['Predklon sede', 'Zadnje stegenske · Meče', [
      'Sedi vzravnano z iztegnjenimi nogami, nato se iz bokov prepogni naprej.',
      'Seži proti prstom na nogah. Ni se jih treba dotakniti.',
      'Prsni koš naj ostane odprt, dihaj počasi.']],
    butterfly: ['Metulj', 'Notranja stegna · Boki', [
      'Podplata skupaj, kolena naj padejo navzven.',
      'Primi gležnje in sedi vzravnano.',
      'Nežno zamahuj s koleni, nato jih umiri.']],
    itband: ['IT trakt stoje', 'Zunanji kolk · IT trakt', [
      'Prekrižaj eno nogo za drugo in iztegni roki nad glavo.',
      'Nagni se stran od zadnje noge in začuti, kako se zunanji kolk odpira.',
      'Obe stopali ostaneta na tleh, dihaj v bok.']],
    child: ['Otrokov položaj', 'Hrbet · Boki · Gležnji', [
      'Sedi nazaj proti petam in pomikaj roke naprej.',
      'Čelo nasloni na tla in pusti, da se hrbet razširi.',
      'Počasi dihaj v spodnji del hrbta.']],
    catcow: ['Mačka-krava', 'Hrbtenica · Trup', [
      'Na vseh štirih. Vdihni, spusti trebuh in dvigni pogled.',
      'Izdihni in zaokroži hrbet proti stropu.',
      'Gibaj se počasi, v ritmu dihanja.']],
    downdog: ['Pes z glavo navzdol', 'Meče · Zadnje stegenske · Ramena', [
      'Roke in stopala na tleh. Boke dvigni gor in nazaj.',
      'Izmenično pritiskaj eno peto proti tlom, nato drugo.',
      'Podaljšaj hrbtenico in sprosti vrat.']],
    twist: ['Zasuk hrbtenice leže', 'Hrbtenica · Zadnjica', [
      'Uleži se na hrbet in eno koleno potegni čez telo.',
      'Roke razpri na široko, obe rami ostaneta na tleh.',
      'Naj gravitacija opravi delo. Dihaj in se sprosti.']],
    lyingHam: ['Zadnje stegenske leže', 'Zadnje stegenske mišice', [
      'Na hrbtu dvigni eno nogo in jo z obema rokama primi za stegnom.',
      'Nežno potegni nogo k sebi. Rahlo pokrčeno koleno je v redu.',
      'Druga noga ostane dolga na tleh, glava sproščena.']],
    swingFront: ['Zamahi z nogo naprej-nazaj', 'Boki · Zadnje stegenske', [
      'Drži se za ravnotežje in zamahuj z nogo naprej in nazaj.',
      'Trup naj ostane vzravnan. Delo opravi kolk.',
      'Gladko in sproščeno, vsak zamah malo višje.']],
    swingSide: ['Zamahi z nogo levo-desno', 'Primikalke · Boki', [
      'Obrni se proti steni za ravnotežje in zamahuj z nogo levo in desno.',
      'Pred telesom navznoter, nato široko navzven.',
      'Stoj vzravnano, boki naj gledajo naprej.']],
    hipCircles: ['Kroženje z boki', 'Boki · Spodnji del hrbta', [
      'Roke na bokih, stopala široko. Z boki riši velike, počasne kroge.',
      'Smer zamenjaj, kadar želiš.',
      'Sproščena kolena in ramena.']],
    buttKicks: ['Zametavanje goleni', 'Kvadricepsi · Ogrevanje', [
      'Teci na mestu in pete brcaj proti zadnjici.',
      'Hitri, lahki koraki. Ostani na blazinicah stopal.',
      'Delaj z rokami in ne pozabi dihati.']],
    highKnees: ['Visoki skiping', 'Upogibalke kolka · Ogrevanje', [
      'Kolena izmenično dviguj do višine bokov.',
      'Pristajaj mehko, prsni koš naj ostane pokonci.',
      'Z rokami zamahuj v ritmu.']],
    calfRaises: ['Dvigi na prste', 'Meče · Gležnji', [
      'Dvigni se na prste, nato se počasi spusti.',
      'Spust nadzoruj. Približno dve sekundi.',
      'Stoj vzravnano, trup rahlo aktiviran.']],
    armCircles: ['Kroženje z rokami', 'Ramena · Zgornji del hrbta', [
      'Roke razpri. Delaj majhne, nadzorovane kroge.',
      'Postopoma jih povečuj.',
      'Zdaj zamenjaj smer.']],
    worlds: ['Najboljše raztezanje na svetu', 'Boki · Hrbtenica · Zadnje stegenske', [
      'Stopi v globok izpadni korak, obe roki ob notranji strani sprednjega stopala.',
      'Zavrti se navzven in zgornjo roko iztegni proti nebu.',
      'S pogledom sledi roki, nato se vrni.']],
    lungeReach: ['Izpadni korak nazaj z iztegom', 'Upogibalke kolka · Zadnjica', [
      'Stopi nazaj v izpadni korak in obe roki iztegni nad glavo.',
      'Odrini se skozi sprednjo peto nazaj v stoječ položaj.',
      'Pri vsaki ponovitvi zamenjaj nogo.']],
    squat: ['Globok počep', 'Boki · Gležnji · Dimlje', [
      'Stopala širše od bokov, boke spusti v globok počep.',
      'S komolci nežno pritiskaj na notranjo stran kolen.',
      'Pete na tleh, če gre. Sicer si pomagaj z blazino.']],
    cobra: ['Kobra', 'Upogibalke kolka · Trebuh · Hrbtenica', [
      'Uleži se na trebuh, dlani pod rameni.',
      'Nežno se potisni gor in dvigni prsni koš. Boki ostanejo na tleh.',
      'Ramena sprosti stran od ušes.']],
    sideBend: ['Odklon stoje', 'Poševne trebušne · Široka hrbtna', [
      'Stopala trdno na tleh, obe roki iztegni nad glavo.',
      'Počasi se nagni na eno stran, nato na drugo.',
      'Obe strani pasu naj ostaneta dolgi.']],
    happyBaby: ['Srečni dojenček', 'Boki · Dimlje · Spodnji del hrbta', [
      'Na hrbtu primi zunanji rob stopal, kolena proti pazduham.',
      'Spodnji del hrbta naj se pogrezne v tla.',
      'Nežno se zibaj z ene strani na drugo.']],
    legsUpWall: ['Noge ob steni', 'Regeneracija · Cirkulacija', [
      'Boke primakni k steni in noge nasloni nanjo.',
      'Roke sproščene, dlani obrnjene navzgor. Samo dihaj.',
      'Noge naj postanejo lahke. Popolno za utrujene tekaške noge.']],
    bridge: ['Most', 'Zadnjica · Zadnje stegenske', [
      'Na hrbtu, kolena pokrčena, stopala na tleh.',
      'Stisni zadnjico in dvigni boke, nato jih počasi spusti.',
      'Rebra navzdol, potiskaj skozi pete.']],
    inchworm: ['Gosenica', 'Zadnje stegenske · Trup · Ramena', [
      'Prepogni se naprej in se z rokami sprehodi naprej v desko.',
      'Zadrži za en vdih, nato s stopali stopicaj proti rokam.',
      'Noge drži tako iztegnjene, kot ti prija.']],
    soleus: ['Meče s pokrčenim kolenom', 'Soleus · Ahilova tetiva', [
      'Roke na steni. Eno nogo postavi nazaj in to koleno pokrči.',
      'Zadnja peta ostane na tleh, boke spusti. Začutiš ga nizko v meči.',
      'Ta vaja cilja na soleus in Ahilovo tetivo, tekačeva delovna konja.']],
    kneeToChest: ['Koleno k prsim', 'Zadnjica · Spodnji del hrbta', [
      'Uleži se na hrbet in eno koleno objemi proti prsim.',
      'Druga noga ostane dolga in sproščena na tleh.',
      'Ob izdihu pusti, da se spodnji del hrbta stopi s tlemi.']],
    figureFour: ['Štirica leže', 'Zadnjica · Piriformis', [
      'Na hrbtu položi en gleženj čez nasprotno koleno.',
      'Spodnjo nogo potegni k sebi, da začutiš odpiranje zunanjega kolka.',
      'Nežnejši golob. Popolno za boleče zadnjice in pred spanjem.']],
    neckTilt: ["Raztezanje vratu vstran", "Vrat · Zgornji trapez", ["Uho nagni proti rami in dlan rahlo položi na glavo.", "Druga roka naj visi težko, s prsti seži proti tlom.", "Ne vleci. Teža roke je dovolj."]],
    shoulderCross: ["Rama čez prsi", "Ramena · Zgornji del hrbta", ["Eno roko iztegnjeno potegni čez prsi.", "Z drugo roko jo nad komolcem objemi bliže.", "Ramo drži spuščeno, stran od ušesa."]],
    tricep: ["Triceps nad glavo", "Triceps · Ramena", ["Eno roko dvigni, pokrči komolec in dlan spusti za glavo.", "Z drugo roko nežno potisni komolec nazaj.", "Stoj vzravnano in dihaj."]],
    chestOpener: ["Odpiranje prsi stoje", "Prsi · Sprednji del ramen", ["Dlani sklepi za hrbtom.", "Stisni lopatici in dvigni prsni koš.", "Roke malo dvigni, le toliko, kot ti prija."]],
    backBend: ["Zaklon stoje", "Spodnji del hrbta · Trebuh", ["Dlani na spodnji del hrbta, prsti obrnjeni navzdol.", "Boke nežno potisni naprej in se malo nagni nazaj.", "Mehko poglej navzgor. Majhen gib je po sedenju popoln."]],
    standingTwist: ["Zasuk stoje", "Hrbtenica · Poševne trebušne", ["Stopala v širini bokov. Zgornji del telesa obračaj levo in desno.", "Roke naj ohlapno zamahujejo in se ovijejo okoli tebe.", "Boki gledajo naprej, kolena mehka."]],
  },
  categories: { all: 'Vse', after: 'Po teku', before: 'Pred tekom', evening: 'Zvečer', quick: 'Hitro' },
  rankings: {
    after: [
      'Kvadricepsi trpijo pri vsakem koraku. Stoje, brez pripomočkov, na seznamu vsakega fizioterapevta.',
      'Meče in Ahilova tetiva vpijejo vsak doskok. Potrebuješ le steno.',
      'Sprosti upogibalke kolka, zakrčene od teka in sedenja. Fizioterapevti jo vedno omenijo.',
      'Zadnje stegenske in spodnji del hrbta v enem preprostem gibu stoje.',
      'Najljubša vaja fizioterapevtov za zadnjico in zunanje boke, ključne za stabilnost.',
      'S pokrčenim kolenom doseže globoko mečno mišico, ki jo iztegnjena noga zgreši.',
      'Meče, zadnje stegenske in ramena hkrati. Odlično, če se lahko spustiš na tla.',
      'Odpre dimlje in notranja stegna, jakost pa zlahka uravnavaš.',
      'Olajšanje za zunanji kolk in IT trakt, stoje, kjerkoli.',
      'Miren zaključek za hrbet in boke, ki umiri dihanje.',
    ],
    before: [
      'Najbolj priporočena vaja pred tekom. Odpre boke v natanko takem gibu kot pri teku.',
      'Aktivira zadnjico in razteza upogibalke kolka, hkrati pa uči pravilno vodenje kolena.',
      'Prebudi primikalke in stabilizatorje kolka, ki te držijo na ravni poti.',
      'Dvigne srčni utrip in utrdi močan dvig kolena.',
      'Dinamično raztezanje kvadricepsov, ki ogreje tudi zadnje stegenske.',
      'Boki, zadnje stegenske in zgornji del hrbta v enem tekočem gibu.',
      'Nežno zrahlja kolčni sklep. Brez učenja.',
      'Pripravi meče in Ahilovo tetivo na udarce.',
      'Ogrevanje celega telesa za zadnje stegenske, trup in ramena.',
      'Vklopi zadnjico, da prevzame del bremena.',
    ],
    evening: [
      'Klasična večerna sprostitev za hrbet, zadnjico in boke. Dihaj počasi in spusti.',
      'Dolgo raztezanje zadnjih stegenskih leže. Stalnica pred spanjem.',
      'Sprosti hrbtenico in zadnjico ter pomaga sprostiti celo telo.',
      'Preprosta, nežna sprostitev za spodnji del hrbta in zadnjico.',
      'Hrbtenico giba v ritmu dihanja in umiri živčni sistem.',
      'Nežnejši golob na hrbtu. Idealno za boleče zadnjice zvečer.',
      'Spočije utrujene noge in te umiri pred spanjem.',
      'Preprosto odpiranje notranjih kolkov, ki ga lahko delaš sede na postelji.',
      'Odpre boke in dimlje ter razbremeni spodnji del hrbta.',
      'Globlja sprostitev zadnjice, ko imaš malo več časa.',
    ],
    quick: [
      'Največ koristi v najkrajšem času za tekače, ki tudi veliko sedijo.',
      'Najhitrejše olajšanje za zakrčene meče in Ahilovo tetivo.',
      'Stoje, kjerkoli, 30 sekund na stran.',
      'Meče, zadnje stegenske in hrbet naenkrat.',
      'Boki, zadnje stegenske in hrbtenica v enem gibu. Največja pokritost.',
      'Hitra sprostitev zadnjih stegenskih in hrbta brez priprave.',
      'Doseže globoko mečno mišico, ki jo tekači pogosto spregledajo.',
      'Olajšanje za zunanji kolk, stoje.',
      'Hkrati odpre boke in gležnje.',
      'Podaljša stransko linijo telesa po sključenem sedenju za mizo.',
    ],
  },
  routines: {
    'top5-after': ['Top 5 po teku', 'Pet najučinkovitejših in najpreprostejših raztezanj po teku, razvrščenih po nasvetih fizioterapevtov in trenerjev. Vsako zadrži približno 30 sekund, dokler so mišice še tople.'],
    'post-run-reset': ['Ponastavitev po teku', 'Celotno ohlajanje: top 5, nato globoka mečna mišica, pes z glavo navzdol in miren zaključek.'],
    'long-run-recovery': ['Po dolgem teku', 'Dolga, počasna raztezanja na tleh za dneve z veliko kilometri. Potrebuješ le malo tal in steno.'],
    'top5-before': ['Top 5 pred tekom', 'Samo raztezanja v gibanju. Raziskave kažejo, da lahko dolgo statično zadrževanje pred tekom rahlo zmanjša zmogljivost, dinamični gibi pa te ogrejejo brez te cene.'],
    'dynamic-warmup': ['Dinamično ogrevanje', 'Top 5 za ogrevanje, nato še boki, meče in gosenica za celo telo. Naredi ga tik preden greš skozi vrata.'],
    'race-day-primer': ['Pred tekmo', 'Ostrih pet minut za štartni koridor. Zrahlja te, ne da bi te utrudilo.'],
    'top5-evening': ['Top 5 zvečer', 'Pet najnežnejših in najučinkovitejših raztezanj za sprostitev. Vse na tleh, vse preprosto. Naredi jih pol ure pred spanjem.'],
    'evening-unwind': ['Večerna sprostitev', 'Deset počasnih minut na tleh: top 5 večernih raztezanj, nato zadnjica, boki in utrujene noge.'],
    'bedtime-hips': ['Boki pred spanjem', 'Nežno odpiranje bokov, ki izniči ure sedenja in teka. Odlično tik pred spanjem.'],
    'five-minute-fix': ['Top 5 na hitro', 'Malo časa? Pet raztezanj z največjo koristjo za tekače, v približno petih minutah.'],
    'calf-sos': ['SOS za zakrčene meče', 'Meče in Ahilova tetiva nagajajo? Osredotočena vadba za spodnji del nog.'],
    'desk-reset': ['Po dnevu za mizo', 'Cel dan za mizo? Odpri boke in prebudi hrbtenico pred večernim tekom.'],
    "two-minute": ["Dve minuti", "Res nimaš časa? Pet gibov stoje v dveh minutah. Brez tal, brez stene, brez preoblačenja."],
    "work-break": ["Odmor v službi", "Za pet minut vstani od mize. Vrat, ramena, prsi in hrbet, vse stoje, brez pripomočkov."],
  },
  fibbies: {
    quaddy: [null, 'Nikoli ne izpusti dneva za kvadricepse.'],
    hammy: [null, 'Zadnja stegenska z energijo hrčka.'],
    calfy: [null, 'Poskočen, prožen in malce dramatičen.'],
    glutey: [null, 'Poganja vsak korak in ne zahteva ničesar.'],
    achi: [null, 'Drobna krila, mogočna tetiva.'],
    hippy: [null, 'Upogibalka kolka, otrok cvetja.'],
    sprinty: [null, 'Hitra vlakna in ponosen na to.'],
    zenny: [null, 'Vdih na štiri, izdih na osem.'],
    snoozy: [null, 'Najboljši prijatelj vaje Noge ob steni.'],
    bendy: [null, 'Toliko se je raztezal, da je zrasel.'],
    medalia: [null, 'Pretekla je maraton. To rada omeni.'],
    goldie: ['Zlati Fibbie', 'Legenda. Razteza se v čistem zlatu.'],
  },
  tiers: ['Lesena skrinja', 'Redka skrinja', 'Epska skrinja', 'Legendarna skrinja'],
  quests: { before: 'Ogrej se pred tekom', after: 'Ohladi se po teku', evening: 'Večerna sprostitev' },
};

const snap = (o, keys) => Object.fromEntries(keys.map((k) => [k, Array.isArray(o[k]) ? [...o[k]] : o[k]]));
const EN = {
  stretches: Object.fromEntries(Object.entries(STRETCHES).map(([id, s]) => [id, snap(s, ['name', 'target', 'cues'])])),
  routines: Object.fromEntries(ROUTINES.map((r) => [r.id, snap(r, ['title', 'blurb'])])),
  rankings: Object.fromEntries(Object.entries(RANKINGS).map(([c, rows]) => [c, rows.map(([, why]) => why)])),
  categories: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])),
  fibbies: Object.fromEntries(FIBBIES.map((f) => [f.id, snap(f, ['name', 'blurb'])])),
  tiers: TIERS.map((x) => snap(x, ['name', 'label'])),
  quests: Object.fromEntries(QUESTS.map((q) => [q.cat, q.label])),
};

const CONTENT = { sl: SL, de: DE, es: ES, fr: FR, it: IT, pt: PT };

export function localizeContent(lang = getLang()) {
  const L = CONTENT[lang] || null;
  for (const [id, s] of Object.entries(STRETCHES)) {
    const e = EN.stretches[id];
    const x = L && L.stretches[id];
    s.name = x ? x[0] : e.name;
    s.target = x ? x[1] : e.target;
    s.cues = x ? x[2] : e.cues;
  }
  for (const r of ROUTINES) {
    const x = L && L.routines[r.id];
    r.title = x ? x[0] : EN.routines[r.id].title;
    r.blurb = x ? x[1] : EN.routines[r.id].blurb;
  }
  for (const [c, rows] of Object.entries(RANKINGS)) {
    rows.forEach((row, i) => { row[1] = (L && L.rankings[c]?.[i]) || EN.rankings[c][i]; });
  }
  for (const c of CATEGORIES) c.label = (L && L.categories[c.id]) || EN.categories[c.id];
  for (const f of FIBBIES) {
    const x = L && L.fibbies[f.id];
    f.name = (x && x[0]) || EN.fibbies[f.id].name;
    f.blurb = (x && x[1]) || EN.fibbies[f.id].blurb;
  }
  TIERS.forEach((tier, i) => {
    tier.label = (L && L.tiers[i]) || EN.tiers[i].label;
    tier.name = EN.tiers[i].name; // rarity word, used only for English voice
  });
  for (const q of QUESTS) q.label = (L && L.quests[q.cat]) || EN.quests[q.cat];
}
