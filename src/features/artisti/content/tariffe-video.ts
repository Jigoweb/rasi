import type { TariffaSection } from "./settore-artisti-content";

const WP = "https://www.reteartistispettacolo.it/wp-content/uploads";

const RIDUZIONI_STANDARD = [
  "Puntuale trasmissione della rendicontazione dettagliata prevista dalla legge",
  "Sottoscrizione di accordi almeno biennali con RASI",
  "Adesione a organizzazioni che abbiano sottoscritto accordi quadro con RASI",
  "Riconoscimento di un acconto per gli anni successivi",
  "Definizione di un accordo entro quattro mesi dall'avvio dei negoziati",
];

export const TARIFFE_VIDEO_SECTIONS: TariffaSection[] = [
  {
    id: "piattaforme-televisive-nazionali",
    title: "Piattaforme televisive nazionali",
    paragraphs: [
      "DIGITALE TERRESTRE, SATELLITARE, ON DEMAND ECC. (Art. 84 L. 633/41).",
      "Le piattaforme televisive nazionali lineari e/o on demand che trasmettono opere cinematografiche ed assimilate (film, telefilm, soap, serie ecc.) sono tenute al pagamento di compensi adeguati e proporzionati agli artisti (interpreti primari, comprimari, doppiatori) sulla base degli artt. 84 e 180 della legge 633/1941 e della Direttiva Copyright.",
      "Tariffa A — valore economico: ricavi diretti e indiretti della società utilizzatrice relativi all'anno interessato, con abbattimento negoziale della quota estranea alle opere cinematografiche ed assimilate, diviso il numero complessivo di opere cinematografiche utilizzate nell'anno.",
      "Suddivisione del valore economico per categoria: primari 45%, comprimari 45%, doppiatori 10%.",
      "Valore economico medio per interpretazione: primario = valore opera / 3; comprimario = valore opera / 8; doppiatore = valore opera / 11 (presenze medie in un'opera cinematografica).",
      "Rappresentatività: il valore medio di ciascuna interpretazione viene moltiplicato per il numero di utilizzazioni di artisti di cui RASI è rappresentativa.",
      "In assenza dei dati di legge può essere applicata una tariffa annuale pari all'1,5% dei ricavi lordi.",
    ],
    pdfUrl: `${WP}/PIATTAFORME-TELEVISIVE-NAZIONALI.pdf`,
    pdfLabel: "Scarica PDF piattaforme televisive nazionali",
    reductions: RIDUZIONI_STANDARD,
  },
  {
    id: "canali-televisivi-nazionali",
    title: "Canali televisivi nazionali",
    paragraphs: [
      "DIGITALE TERRESTRE, SATELLITARE ECC. (Art. 84 L. 633/41).",
      "I canali televisivi nazionali lineari e/o on demand che trasmettono opere cinematografiche ed assimilate sono tenuti al pagamento di compensi adeguati e proporzionati agli artisti (interpreti primari, comprimari, doppiatori) sulla base degli artt. 84 e 180 della legge 633/1941 e della Direttiva Copyright.",
      "Tariffa A — valore economico: ricavi diretti e indiretti della società utilizzatrice relativi all'anno interessato, con abbattimento negoziale della quota estranea alle opere cinematografiche ed assimilate, diviso il numero complessivo di opere cinematografiche utilizzate nell'anno.",
      "Suddivisione del valore economico per categoria: primari 45%, comprimari 45%, doppiatori 10%.",
      "Valore economico medio per interpretazione: primario = valore opera / 3; comprimario = valore opera / 8; doppiatore = valore opera / 11.",
      "Rappresentatività: il valore medio di ciascuna interpretazione viene moltiplicato per il numero di utilizzazioni di artisti di cui RASI è rappresentativa.",
      "In caso di mancata trasmissione dei dati previsti dalla legge, RASI applica un costo per ciascuna utilizzazione/visualizzazione in base al ruolo, alle caratteristiche della trasmissione e alla tipologia delle opere, sulla base di accordi già conclusi.",
    ],
    pdfUrl: `${WP}/CANALI-TELEVISIVI-NAZIONALI.pdf`,
    pdfLabel: "Scarica PDF canali televisivi nazionali",
    reductions: RIDUZIONI_STANDARD,
  },
  {
    id: "canali-televisivi-locali",
    title: "Canali televisivi locali, digitale terrestre, satellitare ecc.",
    paragraphs: [
      "Il listino dettagliato per i canali televisivi locali è pubblicato come documento PDF sul sito attuale.",
    ],
    pdfUrl: `${WP}/Tariffe-Tv-locali.pdf`,
    pdfLabel: "Scarica PDF tariffe TV locali",
  },
  {
    id: "piattaforme-vod",
    title:
      "Piattaforme video on demand, fornitori di servizi media audiovisivi e prestatori di servizi di condivisione di contenuti online",
    paragraphs: [
      "Art. 102 sexies e seguenti del Titolo II quater della legge 633/1941.",
      "Le piattaforme VOD, i fornitori di servizi media audiovisivi e i prestatori di servizi di condivisione di contenuti online sono tenuti al pagamento di compensi adeguati e proporzionati agli artisti interpreti esecutori per ciascuna utilizzazione dell'opera cinematografica (art. 84 L.d.A.).",
      "Valore economico: ricavi diretti e indiretti della società utilizzatrice relativi all'anno interessato, con abbattimento negoziale della quota estranea alle opere cinematografiche ed assimilate, diviso il numero complessivo di opere cinematografiche utilizzate nell'anno.",
      "Suddivisione: primari 45%, comprimari 45%, doppiatori 10%.",
      "Valore medio per interpretazione: primario / 3, comprimario / 8, doppiatore / 11.",
      "Rappresentatività: il valore medio viene moltiplicato per il numero di utilizzazioni di artisti RASI individuati.",
      "In assenza dei dati di legge può essere applicata una tariffa annuale pari all'1,5% dei ricavi lordi.",
    ],
    pdfUrl: `${WP}/Tariffe-piattaforme-on-demand-e-prestatori-di-servizi-di-condivisione-di-contenuti-on-line-1.pdf`,
    pdfLabel: "Scarica PDF piattaforme on demand e sharing",
    reductions: RIDUZIONI_STANDARD,
  },
  {
    id: "strutture-ricettive",
    title:
      "Hotel, residence, villaggi turistici, agriturismo, bed and breakfast, campeggi ecc.",
    paragraphs: [
      "Art. 84 comma 3 L. 633/41. Come confermato dalla sentenza del Tribunale di Roma del 10 luglio 2013, le strutture ricettive che diffondono opere cinematografiche ed assimilate attraverso apparecchi televisivi o altri dispositivi (camere, spazi comuni ecc.) sono tenute al pagamento di compensi adeguati e proporzionati.",
      "Non essendoci la possibilità materiale di definire le utilizzazioni effettuate dalle singole strutture, RASI prevede tariffe a forfait proporzionate al numero delle camere e alla tipologia delle strutture, elaborate su: media della presenza degli artisti RASI nelle programmazioni delle piattaforme nazionali; rappresentanza RASI; tariffe vigenti sul mercato; accordi già conclusi.",
    ],
    tables: [
      {
        title: "Tariffe annuali per ciascuna struttura",
        headers: ["Tipologia", "Fino a 25 camere", "Da 25 a 50 camere", "Oltre 50 camere"],
        rows: [
          ["Bed and breakfast, agriturismi, campeggi ecc.", "€ 115,50", "—", "—"],
          ["Hotel / residence 3 stelle", "€ 173,25", "€ 231,00", "€ 346,50"],
          ["Hotel / residence 4 stelle", "€ 288,75", "€ 404,25", "€ 462,00"],
          ["Hotel / residence 5 stelle", "€ 442,00", "€ 577,50", "€ 808,50"],
        ],
      },
    ],
    reductions: RIDUZIONI_STANDARD,
  },
  {
    id: "home-video",
    title: "Fruizione di opere audiovisive in ambito privato — Home video",
    paragraphs: [
      "Valore economico utilizzo interpretazione: (ricavi supporti venduti × numero supporti venduti abbattuti del 75%) / numero complessivo di supporti venduti nell'anno interessato.",
      "Suddivisione del valore economico per categoria: primari 50%, comprimari 40%, doppiatori 10%.",
      "Valore economico per interpretazione: primario / 3, comprimario / 8, doppiatore / 11.",
      "Rappresentatività: il valore di ciascuna interpretazione viene moltiplicato per il numero di utilizzazioni di artisti RASI individuati nei supporti venduti.",
      "In assenza dei dati di legge può essere applicata una tariffa annuale pari all'1,5% dei ricavi lordi.",
    ],
    pdfUrl: `${WP}/Tariffe-home-video.pdf`,
    pdfLabel: "Scarica PDF tariffe home video",
    reductions: RIDUZIONI_STANDARD,
  },
  {
    id: "proiezioni-pubbliche",
    title: "Proiezioni pubbliche",
    paragraphs: [
      "Art. 84 L. 633/41. I soggetti che gestiscono un luogo pubblico adibito alla proiezione e alla visione di opere cinematografiche ed assimilate (es. sala cinematografica) sono tenuti al pagamento di compensi adeguati e proporzionati.",
      "Valore economico di ciascun utilizzo: ricavi diretti e indiretti della società utilizzatrice relativi all'anno interessato, abbattuti della quota estranea all'utilizzo di opere cinematografiche, diviso il numero complessivo degli utilizzi delle opere cinematografiche nell'anno.",
      "Suddivisione: primari 50%, comprimari 40%, doppiatori 10%.",
      "Valore per interpretazione: primario / 3, comprimario / 8, doppiatore / 11.",
      "Rappresentatività: il valore medio viene moltiplicato per il numero di utilizzazioni di artisti RASI individuati.",
      "In assenza della trasmissione integrale dei dati di legge, RASI può adottare tariffe annuali forfettarie proporzionate ai ricavi e al numero medio annuale di utilizzi, subordinatamente all'impegno alla regolare trasmissione delle informazioni e alla sottoscrizione di un accordo di licenza annuale fino a revoca.",
    ],
    pdfUrl: `${WP}/Tariffe-Sale-cinematografiche.pdf`,
    pdfLabel: "Scarica PDF tariffe proiezioni pubbliche / sale",
    reductions: [
      "Puntuale trasmissione della rendicontazione dettagliata prevista dalla legge",
      "Sottoscrizione di accordi almeno biennali con RASI",
      "Adesione a organizzazioni che abbiano sottoscritto accordi quadro con RASI",
    ],
  },
  {
    id: "mezzi-di-trasporto",
    title: "Mezzi di trasporto",
    paragraphs: [
      "Art. 84 comma 3 L. 633/41. Le tariffe riguardano aerei, navi da crociera e traghetto, treni ecc. di compagnie che offrano ai propri clienti l'accesso e/o la visione di opere cinematografiche ed assimilate su tratte nazionali, anche attraverso servizi, portali e piattaforme web delle rispettive compagnie. Si applicano a ciascun mezzo di trasporto.",
    ],
    tables: [
      {
        headers: ["Mezzo", "Tariffa annua per ciascuna utilizzazione"],
        rows: [
          ["Aerei", "€ 0,92"],
          ["Navi da crociera", "€ 0,80"],
          ["Navi traghetto", "€ 0,57"],
          ["Treni", "€ 0,46"],
        ],
      },
    ],
    reductions: RIDUZIONI_STANDARD,
  },
  {
    id: "esercizi-commercio-ristorazione-benessere",
    title: "Esercizi del commercio, della ristorazione, della salute e del benessere",
    paragraphs: [
      "Art. 84 comma 3 L. 633/41. Le tariffe riguardano gli esercizi in cui si svolgono attività professionali organizzate (commercio, ristorazione, bar, ristoranti, pizzerie, pub, discoteche ecc.) e quelli del benessere (palestre, centri sportivi, estetici ecc.) dotati di almeno un apparecchio video all'interno dei locali che trasmetta opere cinematografiche.",
      "Le tariffe sono annuali e rapportate al numero di TV/schermi presenti nei locali. In caso di apertura stagionale la tariffa è proporzionale al periodo di apertura.",
    ],
    tables: [
      {
        headers: ["Numero di TV / schermi", "Tariffa annuale"],
        rows: [
          ["Da 1", "€ 69,30"],
          ["Da 2 a 4", "€ 138,60"],
          ["Da 5 a 7", "€ 323,40"],
          ["Oltre i 7", "€ 404,20"],
        ],
      },
    ],
    reductions: RIDUZIONI_STANDARD,
  },
];
