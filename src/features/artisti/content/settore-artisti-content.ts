import type { LucideIcon } from "lucide-react";
import { BadgeCheck, Coins, Scale, Users } from "lucide-react";

export type SettoreBenefit = {
  icon: LucideIcon;
  title: string;
  body: string;
  color: string;
};

export type SettoreFaq = {
  q: string;
  a: string;
};

export type SettoreDocumentLink = {
  label: string;
  href: string;
};

export type TariffaTabella = {
  title: string;
  note?: string;
  headers: string[];
  rows: string[][];
};

export type SettoreTariffe = {
  validityNote: string;
  licenseBody: string;
  categories: string[];
  tables: TariffaTabella[];
  reductions: string[];
};

export type SettoreElencoOpere = {
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
  external?: boolean;
};

export type SettoreArtistiContent = {
  heroTitle: string;
  heroSubtitle: string;
  benefits: SettoreBenefit[];
  faq: SettoreFaq[];
  tariffe: SettoreTariffe;
  elencoOpere: SettoreElencoOpere;
  documents: SettoreDocumentLink[];
};

const DOCUMENTI_COMUNI: SettoreDocumentLink[] = [
  {
    label: "Regolamento conferimento mandato produttori",
    href: "/modulistica",
  },
  {
    label: "Informativa trattamento dati personali",
    href: "/modulistica",
  },
  {
    label: "Schede repertorio",
    href: "/modulistica",
  },
];

const RIDUZIONI_COMUNI = [
  "Trasmissione puntuale della rendicontazione dettagliata prevista dalla legge",
  "Sottoscrizione di accordi almeno biennali con RASI",
  "Adesione a organizzazioni che abbiano sottoscritto accordi quadro con RASI",
  "Riconoscimento di un acconto per gli anni successivi",
  "Definizione di un accordo entro quattro mesi dall'avvio dei negoziati",
];

const FAQ_QUANDO_VIDEO: SettoreFaq = {
  q: "Quando matura il compenso?",
  a: "Hai diritto a un compenso per i diritti connessi — distinti dal diritto d'autore — quando un'opera audiovisiva in cui hai interpretato, anche in un ruolo non primario, viene trasmessa in televisione, via cavo o satellite, diffusa in luoghi pubblici o utilizzata in altro modo pubblicamente. Rientrano film, telefilm, serie TV, soap opera, documentari, cortometraggi e opere d'animazione già registrate su supporto videografico. Gli artisti hanno inoltre diritto al compenso per copia privata, dovuto da chi fabbrica o importa supporti vergini e dispositivi di registrazione: le tariffe e i tipi di supporti sono stabiliti per decreto.",
};

const FAQ_QUANDO_MUSICA: SettoreFaq = {
  q: "Quando matura il compenso?",
  a: "Hai diritto a un compenso per i diritti connessi — distinti dal diritto d'autore — quando un brano già registrato su supporto fonografico (CD, file digitale, streaming, mobile) in cui compare la tua interpretazione o esecuzione, anche come artista non primario, viene trasmesso da un'emittente radiofonica o televisiva, diffuso in luoghi pubblici o utilizzato in altro modo pubblicamente. Gli artisti hanno inoltre diritto al compenso per copia privata, dovuto da chi fabbrica o importa supporti vergini e dispositivi di registrazione: le tariffe e i tipi di supporti sono stabiliti per decreto.",
};

const FAQ_CHI_PUO: SettoreFaq = {
  q: "Chi può dare il mandato?",
  a: "Possono aderire artisti primari e comprimari: cantanti, attori, attrici, doppiatori, interpreti ed esecutori musicali e audiovisivi, direttori d'orchestra e di coro, musicisti e orchestrali. Dare mandato a RASI non costa nulla.",
};

const FAQ_COSA_FA: SettoreFaq = {
  q: "Cosa fa RASI per chi ha dato il mandato?",
  a: "RASI è iscritta all'elenco AGCOM degli organismi autorizzati a incassare e ripartire i diritti connessi degli artisti, ai sensi della legge 633/1941. Su mandato firmato, negozia accordi con gli utilizzatori, incassa i compensi riferiti alle opere trasmesse in Italia e all'estero, li ripartisce tra gli artisti aventi diritto e conserva il repertorio di ciascun mandante in un archivio online accessibile con credenziali personali. Tratteniamo una commissione del 10% solo sui diritti effettivamente incassati.",
};

const VANTAGGI_COMUNI: Pick<SettoreBenefit, "icon" | "title" | "color">[] = [
  {
    icon: Scale,
    title: "RASI interviene al tuo posto",
    color: "text-rasi-logo-indigo",
  },
  {
    icon: BadgeCheck,
    title: "Riconosciuta e autorizzata dalla legge",
    color: "text-rasi-logo-cyan",
  },
  {
    icon: Users,
    title: "L'incasso collettivo conviene",
    color: "text-rasi-logo-magenta",
  },
];

export const SETTORE_VIDEO: SettoreArtistiContent = {
  heroTitle: "Lavori nel settore video?",
  heroSubtitle:
    "Se hai interpretato un ruolo in un'opera cinematografica o televisiva trasmessa in Italia o all'estero, RASI gestisce i tuoi diritti connessi.",
  benefits: [
    {
      icon: Coins,
      title: "Ti spetta un compenso",
      body: "Ogni volta che film, telefilm, serie TV, soap opera, documentari, cortometraggi o opere d'animazione in cui hai interpretato — anche in un ruolo non primario — vengono trasmessi da un'emittente o diffusi pubblicamente, ti spetta un compenso dovuto dagli utilizzatori.",
      color: "text-rasi-ember",
    },
    {
      ...VANTAGGI_COMUNI[0],
      body: "Su mandato firmato, RASI ricerca, richiede, incassa e liquida i compensi al posto tuo, così non devi occupartene da solo.",
    },
    {
      ...VANTAGGI_COMUNI[1],
      body: "RASI è inserita nell'elenco AGCOM delle imprese abilitate all'intermediazione e all'amministrazione dei diritti connessi al diritto d'autore.",
    },
    {
      ...VANTAGGI_COMUNI[2],
      body: "I compensi vengono incassati collettivamente: se ogni artista agisse da solo, i costi supererebbero spesso l'importo dovuto.",
    },
  ],
  faq: [FAQ_QUANDO_VIDEO, FAQ_CHI_PUO, FAQ_COSA_FA],
  tariffe: {
    validityNote: "Tariffe diritti connessi video — in vigore fino al 31 dicembre 2025.",
    licenseBody:
      "Serve una licenza RASI ogni volta che un utilizzatore diffonde o sfrutta opere cinematografiche e assimilate. La richiesta si invia a info@reteartistispettacolo.it oppure chiamando lo 06.94359833. I compensi si negoziano sull'art. 84 della legge 633/1941 e sulle direttive europee in materia di copyright: devono essere adeguati e proporzionati al contributo dell'artista e allo sfruttamento dell'opera.",
    categories: [
      "Piattaforme televisive nazionali",
      "Canali televisivi nazionali",
      "Canali locali, digitale terrestre e satellitare",
      "Piattaforme video on demand e servizi di condivisione online",
      "Hotel, residence, villaggi turistici, agriturismo, B&B e campeggi",
      "Home video / fruizione privata",
      "Proiezioni pubbliche",
      "Mezzi di trasporto",
      "Esercizi del commercio, della ristorazione e del benessere",
    ],
    tables: [
      {
        title: "Strutture ricettive (forfait annuale)",
        note: "Art. 84 comma 3 L. 633/41. Forfait proporzionato a tipologia e numero di camere, come confermato dalla sentenza del Tribunale di Roma del 10 luglio 2013.",
        headers: ["Tipologia", "Fino a 25 camere", "Da 25 a 50", "Oltre 50"],
        rows: [
          ["B&B, agriturismi, campeggi", "€ 115,50", "—", "—"],
          ["Hotel / residence 3 stelle", "€ 173,25", "€ 231,00", "€ 346,50"],
          ["Hotel / residence 4 stelle", "€ 288,75", "€ 404,25", "€ 462,00"],
          ["Hotel / residence 5 stelle", "€ 442,00", "€ 577,50", "€ 808,50"],
        ],
      },
      {
        title: "Mezzi di trasporto (per ciascuna utilizzazione annua)",
        note: "Art. 84 comma 3 L. 633/41. Si applica a ciascun mezzo che offra accesso o visione di opere cinematografiche su tratte nazionali.",
        headers: ["Mezzo", "Tariffa"],
        rows: [
          ["Aerei", "€ 0,92"],
          ["Navi da crociera", "€ 0,80"],
          ["Navi traghetto", "€ 0,57"],
          ["Treni", "€ 0,46"],
        ],
      },
      {
        title: "Esercizi con apparecchi video (forfait annuale)",
        note: "Commercio, ristorazione, palestre e centri benessere con almeno uno schermo che trasmette opere cinematografiche. In caso di apertura stagionale la tariffa è proporzionale al periodo.",
        headers: ["Numero di TV / schermi", "Tariffa annuale"],
        rows: [
          ["Da 1", "€ 69,30"],
          ["Da 2 a 4", "€ 138,60"],
          ["Da 5 a 7", "€ 323,40"],
          ["Oltre 7", "€ 404,20"],
        ],
      },
    ],
    reductions: RIDUZIONI_COMUNI,
  },
  elencoOpere: {
    title: "Elenco opere video interpretate",
    body: "Consulta il repertorio pubblico delle opere audiovisive interpretate dagli artisti mandanti RASI. È lo stesso database usato per individuazione e ripartizione.",
    ctaLabel: "Apri elenco opere video",
    href: "https://award.reteartistispettacolo.com/rasi/pubblico/cinema",
    external: true,
  },
  documents: [
    {
      label: "Regolamento ripartizione artisti (Audiovisivo)",
      href: "/modulistica",
    },
    ...DOCUMENTI_COMUNI,
  ],
};

export const SETTORE_MUSICA: SettoreArtistiContent = {
  heroTitle: "Lavori nel settore musica?",
  heroSubtitle:
    "Se sei cantante, musicista, orchestrale, corista, direttore o strumentista — anche in un gruppo — e la tua interpretazione è stata trasmessa, RASI gestisce i tuoi diritti connessi.",
  benefits: [
    {
      icon: Coins,
      title: "Ti spetta un compenso",
      body: "Ogni volta che un brano già registrato su supporto fonografico in cui compare la tua interpretazione o esecuzione — anche come artista non primario — viene trasmesso da un'emittente o diffuso pubblicamente, ti spetta un compenso dovuto dagli utilizzatori.",
      color: "text-rasi-ember",
    },
    {
      ...VANTAGGI_COMUNI[0],
      body: "Su mandato firmato, RASI ricerca, richiede, incassa e liquida i compensi al posto tuo, così non devi occupartene da solo.",
    },
    {
      ...VANTAGGI_COMUNI[1],
      body: "RASI è inserita nell'elenco AGCOM delle imprese abilitate all'intermediazione e all'amministrazione dei diritti connessi al diritto d'autore.",
    },
    {
      ...VANTAGGI_COMUNI[2],
      body: "I compensi vengono incassati collettivamente: se ogni artista agisse da solo, i costi supererebbero spesso l'importo dovuto.",
    },
  ],
  faq: [FAQ_QUANDO_MUSICA, FAQ_CHI_PUO, FAQ_COSA_FA],
  tariffe: {
    validityNote:
      "Tariffe diritti connessi musica — listino di riferimento per la diffusione di musica registrata e video musicali. Per importi aggiornati e casistiche specifiche, contatta gli uffici.",
    licenseBody:
      "Serve una licenza RASI ogni volta che si diffonde musica registrata o video musicali. La richiesta si invia a info@reteartistispettacolo.it oppure chiamando lo 06.94359833. Le tariffe includono la quota degli artisti senza mandato di competenza RASI e sono al netto di IVA.",
    categories: [
      "Aeroporti",
      "Associazioni, circoli, scuole e società sportive",
      "Centri sociali e anziani",
      "Centri per la salute e il benessere",
      "Circhi e spettacolo viaggiante",
      "Discoteche e night club",
      "Eventi privati, aziendali e Pro Loco",
      "Gallerie commerciali",
      "Hotel e strutture ricettive",
      "Impianti sportivi e di risalita",
      "Mezzi di trasporto",
      "Mostre, fiere e spazi pubblici",
      "Musiche di attesa telefonica",
      "Parchi divertimento e stabilimenti balneari",
      "Parrocchie",
      "Showroom e sfilate di moda",
      "Sonorizzazione siti web",
      "TV digitali e satellitari",
      "Uffici, studi e luoghi di lavoro",
      "Web radio e web TV",
    ],
    tables: [
      {
        title: "Associazioni, circoli, scuole e società sportive (annuale)",
        note: "Tariffe annuali sul numero di soci, riferite a diffusione con supporti originali. Cumulabili tra musica d'ambiente, corsi ed eventi.",
        headers: ["Numero soci", "Musica d'ambiente", "Corsi"],
        rows: [
          ["Da 1 a 200", "€ 25,00", "€ 35,00"],
          ["Da 201 a 400", "€ 30,00", "€ 50,00"],
          ["Da 401 a 700", "€ 35,00", "€ 70,00"],
          ["Da 701 a 1000", "€ 45,00", "€ 100,00"],
          ["Oltre 1001", "€ 60,00", "€ 150,00"],
        ],
      },
      {
        title: "Centri sociali e anziani (annuale)",
        note: "Tariffe annuali sul numero di soci, riferite a diffusione nelle forme consentite dalla legge e con supporti originali.",
        headers: ["Numero soci", "Musica d'ambiente", "Corsi"],
        rows: [
          ["Da 1 a 200", "€ 15,00", "€ 15,00"],
          ["Da 201 a 400", "€ 20,00", "€ 30,00"],
          ["Da 401 a 700", "€ 25,00", "€ 50,00"],
          ["Da 701 a 1000", "€ 35,00", "€ 70,00"],
          ["Oltre 1001", "€ 50,00", "€ 100,00"],
        ],
      },
    ],
    reductions: RIDUZIONI_COMUNI,
  },
  elencoOpere: {
    title: "Elenco opere musicali interpretate",
    body: "Consulta il repertorio pubblico delle opere musicali interpretate dagli artisti mandanti RASI. È lo stesso database usato per individuazione e ripartizione.",
    ctaLabel: "Apri elenco opere musicali",
    href: "https://award.reteartistispettacolo.com/rasi/pubblico/musica",
    external: true,
  },
  documents: [
    {
      label: "Regolamento ripartizione artisti (Musica)",
      href: "/modulistica",
    },
    {
      label: "Regolamento ripartizione artisti (Audiovisivo)",
      href: "/modulistica",
    },
    ...DOCUMENTI_COMUNI,
  ],
};
