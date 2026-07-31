import type { TariffaSection } from "./settore-artisti-content";

export const TARIFFE_MUSICA_SECTIONS: TariffaSection[] = [
  {
    id: "aeroporti",
    title: "Aeroporti",
    paragraphs: [
      "Le tariffe sono annuali, calcolate sull’ampiezza totale delle superfici interessate alla diffusione e riguardano esclusivamente le aree gestite direttamente dalla proprietà aeroportuale. I compensi sono riferiti ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali.",
      "Tabella non pubblicata sul sito attuale: contattare RASI per il listino relativo alle superfici aeroportuali.",
    ],
  },
  {
    id: "associazioni-circoli-scuole-e-società-sportive",
    title: "Associazioni, circoli, scuole e società sportive",
    paragraphs: [
      "Le tariffe sono annuali, calcolate sul numero di soci iscritti alle relative associazioni e società e cumulabili. I compensi sono riferiti ad una diffusione effettuata con supporti originali.",
    ],
    tables: [
      {
        headers: ["Numero soci", "Musica d’ambiente", "Corsi", "Eventi"],
        rows: [
          ["Da 1 a 200", "€ 25,00", "€ 35,00", "fino a n.10 € 6,00"],
          ["Da 201 a 400", "€ 30,00", "€ 50,00", "Oltre i 10 € 12,00"],
          ["Da 401 a 700", "€ 35,00", "€ 70,00", ""],
          ["Da 701 a 1000", "€ 45,00", "€ 100,00", ""],
          ["Oltre 1001", "€ 60,00", "€ 150,00", ""],
        ],
      },
    ],
  },
  {
    id: "gare-e-saggi",
    title: "Gare e saggi",
    paragraphs: [
      "Le tariffe sono annuali e si basano sulla capienza della struttura che ospita la gara o il saggio. I compensi sono riferiti ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali.",
      "Tabella non pubblicata sul sito attuale: contattare RASI per il listino basato sulla capienza della struttura.",
    ],
  },
  {
    id: "centri-sociali-anziani",
    title: "Centri sociali, anziani",
    paragraphs: [
      "Le tariffe sono annuali, calcolate sul numero di soci iscritti ai rispettivi centri anziani e cumulabili.",
      "Le tariffe sono annuali e relative alla diffusione effettuata nelle forme consentite dalla legge e con supporti originali.",
    ],
    tables: [
      {
        headers: ["Numero soci", "Musica d’ambiente", "Corsi", "Eventi"],
        rows: [
          ["Da 1 a 200", "€ 15,00", "€ 15,00", "fino a n.10 € 5,00"],
          ["Da 201 a 400", "€ 20,00", "€ 30,00", "Oltre i 10 € 10,00"],
          ["Da 401 a 700", "€ 25,00", "€ 50,00", ""],
          ["Da 701 a 1000", "€ 35,00", "€ 70,00", ""],
          ["Oltre 1001", "€ 50,00", "€ 100,00", ""],
        ],
      },
    ],
  },
  {
    id: "centri-per-la-salute-e-per-il-benessere-fisico",
    title: "Centri per la salute e per il benessere fisico",
    paragraphs: [
      "Le tariffe riguardano gli esercizi nei quali all’interno si svolgono attività professionali organizzate dirette alla salute ed al benessere, palestre, centri sportivi, fitness, estetici ecc. per l’utilizzo di opere musicali come musica d’ambiente e corsi. Le tariffe sono annuali, calcolate sull’ampiezza totale delle superfici interessate e riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali.",
      "Le tariffe musica d’ambiente e corsi sono cumulabili.",
    ],
    tables: [
      {
        title: "Musica d’ambiente",
        headers: ["Ampiezza superficie in Mq.", "Tariffe"],
        rows: [
          ["Da 1 a 250", "€ 50,00"],
          ["Da 251 a 500", "€ 70,00"],
          ["Da 501 a 750", "€ 90,00"],
          ["Da 751 a 1000", "€ 110,00"],
          ["Da 1001 a 1250", "€ 130,00"],
          ["Da 1251 a 1500", "€ 160,00"],
          ["Da 1501 a 2000", "€ 190,00"],
          ["Da 2001 a 3000", "€ 220,00"],
          ["Oltre i 3001", "€ 250,00"],
        ],
      },
      {
        title: "Corsi",
        headers: ["Ampiezza superficie in Mq.", "Tariffe"],
        rows: [
          ["Da 1 a 1000", "€ 120,00"],
          ["Da 1001 a 2000", "€ 240,00"],
          ["Da 2001 a 3000", "€ 340,00"],
          ["Oltre i 3001", "€ 500,00"],
        ],
      },
    ],
    reductions: [
      "sottoscrizione di accordi almeno biennali con la R.a.s.i",
      "puntuale pagamento della tariffa annuale",
      "adesione ad organizzazioni che abbiano sottoscritto accordi quadro con la R.a.s.i.",
      "riconoscimento di un acconto per gli anni successivi.",
    ],
  },
  {
    id: "cinema-spazi-teatrali-ecc",
    title: "Cinema, spazi teatrali ecc.",
    paragraphs: [
      "Le tariffe sono annuali, calcolate sul numero dei posti delle strutture interessate e riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali.",
    ],
    tables: [
      {
        headers: ["POSTI A SEDERE", "AUDIO", "VIDEO"],
        rows: [
          ["Da 1 a 300", "€ 30,00", "€ 35,00"],
          ["Da 301 a 600", "€ 50,00", "€ 55,00"],
          ["Da 601 a 900", "€ 70,00", "€ 80,00"],
          ["Da 901 a 1200", "€ 100,00", "€ 150,00"],
          ["Oltre i 1200", "€ 150,00", "€ 200,00"],
        ],
      },
    ],
  },
  {
    id: "circhi-e-spettacolo-viaggiante",
    title: "Circhi e spettacolo viaggiante",
    paragraphs: [
      "Le tariffe sono annuali, calcolate sul numero dei posti delle strutture interessate e riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali.",
    ],
    tables: [
      {
        headers: ["POSTI A SEDERE", "CIRCHI SOLO CON ATTIVITA’ CIRCENSE", "CIRCHI CON SPETTACOLO VIAGGIANTE"],
        rows: [
          ["Da 1 a 200", "€ 50,00", "€ 70,00"],
          ["Da 201 a 500", "€ 100,00", "€ 120,00"],
          ["Da 501 a 1000", "€ 200,00", "€ 230,00"],
          ["Da 1001 a 1500", "€ 300,00", "€ 340,00"],
          ["Oltre i 1501", "€ 500,00", "€ 550,00"],
        ],
      },
    ],
  },
  {
    id: "concerti",
    title: "Concerti",
    paragraphs: [
      "Le tariffe sono unitarie per ciascun concerto e si basano sul numero di spettatori presenti in ogni concerto e riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali.",
    ],
    tables: [
      {
        headers: ["SPETTATORI", "TARIFFE"],
        rows: [
          ["Da 1 a 500", "€ 40,00"],
          ["Da 501 a 1500", "€ 110,00"],
          ["Da 1501 a 5000", "€ 225,00"],
          ["Da 5001 a 15000", "€ 320,00"],
          ["Oltre i 15001", "€ 400,00"],
        ],
      },
    ],
  },
  {
    id: "discopub",
    title: "Discopub",
    paragraphs: [
      "Le tariffe sono annuali, calcolate sull’ampiezza totale delle superfici interessate alla diffusione e riguardano sia le aree interne che esterne di disponibilità della struttura. I compensi sono riferiti ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali.",
    ],
    tables: [
      {
        headers: ["Superficie in metriquadri", "Tariffe"],
        rows: [
          ["0 – 200", "€ 5"],
          ["201 – 400", "€ 9"],
          ["401 a 600", "€ 15"],
          ["Oltre i 601", "€ 20"],
        ],
      },
    ],
  },
  {
    id: "discoteche",
    title: "Discoteche",
    paragraphs: [
      "Le tariffe sono annuali e calcolate sull’ampiezza totale delle superfici interessate e riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali .",
    ],
    tables: [
      {
        headers: ["Ampiezza superficie in Mq.", "Tariffe"],
        rows: [
          ["Da 1 a 200", "€ 20,00"],
          ["Da 201 a 500", "€ 29,00"],
          ["Da 501 a 800", "€ 35,00"],
          ["Da 800 a 1100", "€ 50,00"],
          ["Da 1101 a 1600", "€ 55,00"],
          ["Oltre i 1600", "€ 65,00"],
        ],
      },
    ],
  },
  {
    id: "esercizi-commerciali-e-ristorazione-bar-ristoranti-pizzerie-ecc",
    title: "Esercizi commerciali e ristorazione (bar, ristoranti, pizzerie ecc.)",
    paragraphs: [
      "Le tariffe sono annuali e calcolate sulla superficie in metri quadrati dell’esercizio commerciale nonchè riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali .",
    ],
    tables: [
      {
        headers: ["METRI QUADRATI SUPERFICIE", "TARIFFE"],
        rows: [
          ["Da 1 a 150", "€ 50,00"],
          ["Da 151 a 300", "€ 96,00"],
          ["Da 301 a 600", "€ 160,00"],
          ["Da 601 a 1200", "€ 270,00"],
          ["Da 1201 a 2000", "€ 350,00"],
          ["Da 2001 a 5000", "€ 490,00"],
          ["Da 5001 a 10000", "€ 920,00"],
          ["Oltre i 10001", "€ 1400,00"],
        ],
      },
    ],
  },
  {
    id: "estetica-parrucchieri-barbieri-estetisti",
    title: "Estetica (parrucchieri barbieri estetisti)",
    paragraphs: [
      "Le tariffe sono annuali e calcolate sulla superficie in metri quadrati dell’esercizio commerciale nonchè riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali .",
    ],
    tables: [
      {
        headers: ["METRI QUADRATI SUPERFICIE", "TARIFFE"],
        rows: [
          ["Da 0 a 100 mq", "€ 8,00"],
          ["Da 101 a 200 mq", "€ 15,00"],
          ["Oltre i 200 mq", "€ 30,00"],
        ],
      },
    ],
  },
  {
    id: "eventi-aziendali-privati-proloco-locali",
    title: "Eventi (aziendali,privati,proloco locali)",
    paragraphs: [
      "Le tariffe sono unitarie per ciascuna giornata in cui si articola l’evento e si basano sul numero partecipanti. Gli eventi aziendali sono gli intrattenimenti offerti da ditte, aziende, imprese, enti, organizzazioni in occasione di raduni e/o riunioni aziendali. Gli eventi privati sono feste, compleanni, matrimoni ecc. Per le pro loco a livello locale la tariffa è unitaria per ciascuna giornata in cui si articola la manifestazione e si basa sul numero di abitanti del luogo dove si tiene l’iniziativa. Le tariffe sono riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali .",
    ],
    tables: [
      {
        headers: ["PRESENZE", "TARIFFE EVENTI PRIVATI", "TARIFFE EVENTI AZIENDALI"],
        rows: [
          ["Da 1 a 150", "€30", "€50"],
          ["Da 151 a 300", "€45", "€65"],
          ["Oltre i 301", "€65", "€90"],
        ],
      },
      {
        headers: ["N.ABITANTI", "TARIFFE EVENTI PRO LOCO LOCALI"],
        rows: [
          ["Fino a 2000", "€ 10"],
          ["Da 2001 a 5000", "€ 15"],
          ["Da 5001 a 10000", "€ 21"],
          ["Da 10001 a 25000", "€ 28"],
          ["Da 25001 a 50000", "€ 35"],
          ["Da 50001 a 100.000", "€ 43"],
          ["Oltre i 100.000", "€ 52"],
        ],
      },
    ],
  },
  {
    id: "farmacie",
    title: "Farmacie",
    paragraphs: [
      "Le tariffe sono annuali e calcolate sulla superficie in metri quadrati delle aree sonorizzate della farmacia nonchè riferite ad una diffusione effettuata nelle forme consentite dalla legge . e con supporti originali",
    ],
    tables: [
      {
        headers: ["MQ SUPERFICIE", "TARIFFE"],
        rows: [
          ["Da 1 a 200", "€ 50,00"],
          ["Da 201 a 300", "€ 60,00"],
          ["Da 301 a 500", "€ 75,00"],
          ["Oltre i 501", "€ 90,00"],
        ],
      },
    ],
  },
  {
    id: "gallerie-commerciali",
    title: "Gallerie commerciali",
    paragraphs: [
      "Le tariffe sono annuali e calcolate sulla superficie in metri quadrati degli spazi comuni sonorizzati delle gallerie commerciali. Le tariffe sono riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali .",
      "Eventi: In presenza di eventi organizzati da gallerie commerciali con utilizzo di musica registrata le seguenti tariffe unitarie cumulabili relative a ciascun evento sono calcolate sul numero di presenze registrate nell’area di svolgimento dell’evento. Le tariffe sono riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali .",
    ],
    tables: [
      {
        headers: ["METRI QUADRATI SUPERFICIE", "TARIFFE"],
        rows: [
          ["Da 1 a 150", "€ 52,00"],
          ["Da 151 a 300", "€ 98,00"],
          ["Da 301 a 600", "€ 163,00"],
          ["Da 601 a 1200", "€ 273,00"],
          ["Da 1201 a 2000", "€ 354,00"],
          ["Da 2001 a 5000", "€ 494,00"],
          ["Da 5001 a 10000", "€ 925,00"],
          ["Oltre i 10001", "€ 1405,00"],
        ],
      },
      {
        headers: ["PRESENZE", "TARIFFE"],
        rows: [
          ["Da 1 a 200", "€ 78,00"],
          ["Da 201 a 400", "€ 135,00"],
          ["Da 401 a 700", "€ 215,00"],
          ["Da 701 a 1500", "€ 320,00"],
          ["Oltre i 1501", "€ 500,00"],
        ],
      },
    ],
  },
  {
    id: "impianti-di-risalita",
    title: "Impianti di risalita",
    paragraphs: [
      "La tariffa annuale è pari ad euro 80,00 per ciascun impianto di risalita ed è forfettaria. Le tariffe sono riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali.",
    ],
    flatRates: [
      "Tariffa annuale forfettaria per ciascun impianto di risalita: € 80,00",
    ],
  },
  {
    id: "impianti-sportivi-polivalenti",
    title: "Impianti sportivi polivalenti",
    paragraphs: [
      "Le tariffe sono annuali e calcolate sulla superficie in metri quadrati dell’impianto sportivo. Le tariffe sono riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali.",
    ],
    tables: [
      {
        headers: ["METRI QUADRATI SUPERFICIE", "TARIFFE"],
        rows: [
          ["Da 1 a 2000", "€ 500,00"],
          ["Da 2001 a 3000", "€ 800,00"],
          ["Da 3001 a 5000", "€ 1300,00"],
          ["Oltre i 5001", "€ 2000,00"],
        ],
      },
    ],
  },
  {
    id: "mezzi-di-trasporto",
    title: "Mezzi di trasporto",
    paragraphs: [
      "Le tariffe riguardano aerei, navi da crociera e traghetto, treni ecc. di compagnie italiane che offrano ai propri clienti l’ascolto di opere musicali, anche attraverso servizi, portali e piattaforme web che facciano capo alle rispettive compagnie. Le tariffe sono annuali e si applicano a ciascun mezzo di trasporto nel quale la diffusione venga effettuata nelle forme consentite dalla legge e con supporti originali .",
    ],
    tables: [
      {
        headers: ["Mezzo", "Criterio", "Tariffa"],
        rows: [
          ["Aerei", "Per ciascuna postazione idonea alla diffusione", "€ 0,80"],
          ["Navi da crociera", "Per ciascun passeggero trasportabile (annua)", "€ 0,70"],
          ["Navi traghetto", "Per ciascun passeggero trasportabile (annua)", "€ 0,50"],
          ["Treni", "Per ciascun passeggero trasportabile (annua)", "€ 0,40"],
        ],
      },
    ],
    reductions: [
      "Sottoscrizione di accordi almeno biennali con RASI",
      "Puntuale pagamento della tariffa annuale",
      "Adesione a organizzazioni che abbiano sottoscritto accordi quadro con RASI",
      "Riconoscimento di un acconto per gli anni successivi",
    ],
  },
  {
    id: "mostre-fiere-spazi-pubblici",
    title: "Mostre, fiere, spazi pubblici",
    paragraphs: [
      "Le tariffe sono calcolate sulla durata delle mostre e sono riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali.",
    ],
    tables: [
      {
        headers: ["DURATA", "TARIFFE"],
        rows: [
          ["Fino a 30 gg", "€ 55,00"],
          ["Da 31 a 60 gg", "€ 105,00"],
          ["Da 61 a 120gg", "€ 180,00"],
          ["Da 121 a 365gg", "€ 200,00"],
          ["Mostre permanenti", "€ 250,00"],
        ],
      },
    ],
  },
  {
    id: "musiche-per-attesa-telefonica",
    title: "Musiche per attesa telefonica",
    paragraphs: [
      "Le tariffe sono annuali e calcolate sul numero di linee telefoniche",
    ],
    tables: [
      {
        headers: ["NUMERO LINEE TELEFONICHE", "TARIFFE"],
        rows: [
          ["Da 1 a 5", "€ 15,00"],
          ["Da 6 a 20", "€ 35,00"],
          ["Da 21 a 40", "€ 70,00"],
          ["Da 40 a 60", "€ 140,00"],
          ["Oltre le 60 linee telefoniche", "€ 300,00"],
        ],
      },
    ],
  },
  {
    id: "night-club",
    title: "Night club",
    paragraphs: [
      "La tariffa è annuale ed unitaria e si riferisce a ciascun intrattenimento effettuato. E’ inoltre riferita ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali.",
    ],
    tables: [
      {
        headers: ["Criterio", "Tariffa"],
        rows: [
          ["Ciascun intrattenimento", "€ 3"],
        ],
      },
    ],
  },
  {
    id: "parcheggi-anche-di-aeroporti-aree-commerciali-cinema-ecc",
    title: "Parcheggi, anche di aeroporti, aree commerciali, cinema, ecc.",
    paragraphs: [
      "Le tariffe sono annuali e calcolate sulla superficie in metri quadrati dell’intera area del parcheggio. Le tariffe sono riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali.",
    ],
    tables: [
      {
        headers: ["METRI QUADRATI SUPERFICIE", "TARIFFE"],
        rows: [
          ["Da 1 a 200", "€ 50,00"],
          ["Da 201 a 400", "€ 65,00"],
          ["Da 401 a 700", "€ 85,00"],
          ["Da 701 a 1000", "€ 110,00"],
          ["Da 1001 a 1500", "€ 140,00"],
          ["Da 1501 a 2000", "€ 170,00"],
          ["Da 2001 a 3000", "€ 205,00"],
          ["Da 3001 a 5000", "€ 255,00"],
          ["Da 5001 a 7500", "€ 315,00"],
          ["Da 7501 a 10000", "€ 400,00"],
          ["Oltre i 10.001", "€ 500,00"],
        ],
      },
    ],
  },
  {
    id: "parchi-divertimento",
    title: "Parchi divertimento",
    paragraphs: [
      "Le tariffe sono annuali e calcolate sul numero di visitatori ugualmente annuali. Le tariffe sono riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali .",
    ],
    tables: [
      {
        headers: ["NUMERO VISITATORI ANNUALI", "TARIFFE SOLO MUSICA D’AMBIENTE", "TARIFFE MUSICA D’AMBIENTE E ANIMAZIONE"],
        rows: [
          ["Da 1 a 50000", "€ 772,60", "1004,38"],
          ["Da 50001 a 100000", "€ 1802,76", "2361,61"],
          ["Da 100001 a 150000", "€ 2768,52", "3654,44"],
          ["Da 150001 a 200.000", "€ 4184,99", "5566,03"],
          ["Da 200001 a 400.000", "€ 5472,68", "7333,39"],
          ["Da 400001 a 600.000", "€ 7726,15", "10430,30"],
          ["Da 6000001 a 800000", "€ 9935,76", "13512,63"],
          ["Da 800001 a 1000000", "€ 10945,37", "14995,15"],
          ["Oltre 1000001", "€ 13554,98", "18705,87"],
        ],
      },
    ],
  },
  {
    id: "parrocchie",
    title: "Parrocchie",
    paragraphs: [
      "Le tariffe sono annuali e forfettarie. Le tariffe sono riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali.",
    ],
    tables: [
      {
        headers: ["PERIODO", "TARIFFE FORFETTARIE"],
        rows: [
          ["ANNUALE", "€ 50,00"],
        ],
      },
    ],
  },
  {
    id: "podcast",
    title: "Podcast",
    paragraphs: [
      "Il Podcast è un sistema che permette di scaricare in modo automatico dalla rete programmi radiofonici o parti di essi già comunicati al pubblico in modo che l’utente ne possa usufruire in qualsiasi momento.",
      "Le visualizzazioni sono il numero complessivo di volte in cui i programmi radiofonici messi a disposizione siano stati ascoltati in modalità Podcast e/o Audio on demand dagli utenti dell’eventuale sito.",
    ],
    flatRates: [
      "A fronte della concessione del diritto di messa a disposizione del pubblico (art. 72, lett. d) L.d.A.) il Licenziatario verserà a R.a.s.i. un compenso pari a € 03,50 ogni 15.000 visualizzazioni per le prime 600.000 visualizzazioni e pari a € 5,00 per ogni 12.000 ulteriori eventuali visualizzazioni con un compenso minimo garantito annuo non restituibile pari ad Euro 280,00 (duecentoottanta/00).",
    ],
  },
  {
    id: "presentazione-in-showroom",
    title: "Presentazione in showroom",
    paragraphs: [
      "È l’esibizione, in una sala espositiva, di una determinata collezione dedicata ad una singola categoria di articoli e/o oggetti.",
      "Le tariffe sono riferite ad una diffusione effettuata nelle forme consentite dalla legge e con supporti originali",
    ],
    flatRates: [
      "Il compenso forfettario per ciascuna presentazione è pari ad euro 55,00",
    ],
  },
  {
    id: "radio",
    title: "Radio",
    paragraphs: [
      "1. Verifica delle programmazioni annuali in riferimento alle opere utilizzate ed alle ore annuali di programmazione musicale effettuate. Le tariffe sono relative all’equo compenso dovuto ai sensi dell’art. 72/a e 73 della legge 633 del 1941 e per la messa a disposizione dei fonogrammi tramite internet, siti web e social media e comunicazione al pubblico del repertorio sotto forma di sonorizzazione;",
      "Il calcolo delle tariffe si effettua per ciascun canale come segue:",
      "Numero di ascoltatori nei 7 giorni + Ore annuali di programmazione musicale",
      "__________________________________________________________________________________________ X Quota complessiva diritti",
      "Abbattimento per la diffusione culturale",
      "Il numero di ascoltatori nei 7 giorni è quello definito dal Tavolo degli Editori Radio attraverso le rilevazioni statistiche. Le ore annuali di programmazione musicale sono definite in modo analitico. La R.a.s.i. riconosce alle emittenti un coefficiente pari a 10 per l’attività di diffusione culturale svolta dalle emittenti. La quota complessiva pari all’1,5 comprende i diritti di cui all’art. 72/a e 73 della legge 633 del 1941, la messa a disposizione dei fonogrammi tramite internet, siti web e social media. Le emittenti garantiscono comunque a R.a.s.i. un compenso minimo garantito annuale di euro 120,00 e le radio comunitarie a livello locale di euro 80,00.",
    ],
    reductions: [
      "radio comunitarie",
      "puntuale trasmissione della rendicontazione prevista dalla legge",
      "sottoscrizione di accordi almeno biennali con la R.a.s.i",
      "adesione ad organizzazioni che abbiano sottoscritto accordi quadro con la R.a.s.i.",
      "riconoscimento di un acconto per gli anni successivi.",
    ],
  },
  {
    id: "sfilate-di-moda",
    title: "Sfilate di moda",
    paragraphs: [
      "La tariffa è unitaria per ciascuna sfilata e si basa sulla durata della stessa. Le tariffe sono riferite ad una diffusione effettuata nelle forme consentite dalla legge.",
    ],
    tables: [
      {
        headers: ["Durata", "Tariffe"],
        rows: [
          ["Fino ad 2 ore", "€ 150,00"],
          ["Fino a 3 ore", "€ 200,00"],
          ["Oltre le 3 ore", "€ 270,00"],
        ],
      },
    ],
  },
  {
    id: "sonorizzazione-siti-web",
    title: "Sonorizzazione siti web",
    flatRates: [
      "Euro 8,00 per ogni brano utilizzato all’interno del sito (limite 20 brani), con minimo garantito annuo non restituibile di Euro 50,00 (art. 72 lett. a e d L.d.A.).",
    ],
  },
  {
    id: "stabilimenti-balneari",
    title: "Stabilimenti balneari",
    paragraphs: [
      "La tariffa è stagionale e si basa sui metriquadri a disposizione dello stabilimento balneare. Le tariffe sono riferite ad una diffusione effettuata nelle forme consentite dalla legge.",
    ],
    tables: [
      {
        headers: ["Metri quadrati", "Tariffa musica d’ambiente", "Tariffa attività di animazione"],
        rows: [
          ["Fino a 1500 mq", "€ 10", "€ 35"],
          ["Da 1501 a 3000 mq", "€ 15", "€ 75"],
          ["Da 3001 a 5000 mq", "€ 25", "€ 125"],
          ["Da 5001 a 8000 mq", "€ 40", "€ 185"],
          ["Oltre gli 8001 mq", "€ 60", "€ 255"],
        ],
      },
    ],
  },
  {
    id: "strutture-ricettive-hotel-pensioni-residence-villaggi-turistici-bed-an",
    title: "Strutture ricettive hotel, pensioni, residence, villaggi turistici, bed and breakfast, agriturismo, campeggi ecc.",
    paragraphs: [
      "Le tariffe riguardano l’intrattenimento musicale utilizzato nell’ambito delle attività di svago degli ospiti. Le tariffe si applicano a ciascuna struttura e sono riferite ad una diffusione effettuata con supporto originale.",
    ],
    tables: [
      {
        title: "Tariffe annuali per ciascuna struttura",
        headers: ["Tipologia", "Fino a 25 camere", "Da 25 a 50 camere", "Oltre 50 camere"],
        rows: [
                ["Bed and breakfast, agriturismi, campeggi ecc.", "€ 100,00", "—", "—"],
          ["Hotel / residence 3 stelle", "€ 150,00", "€ 200,00", "€ 300,00"],
          ["Hotel / residence 4 stelle", "€ 250,00", "€ 350,00", "€ 400,00"],
          ["Hotel / residence 5 stelle", "€ 400,00", "€ 500,00", "€ 700,00"],
        ],
      },
    ],
    reductions: [
      "Sottoscrizione di accordi almeno biennali con RASI",
      "Puntuale pagamento della tariffa annuale",
      "Adesione a organizzazioni che abbiano sottoscritto accordi quadro con RASI",
      "Numero delle strutture ricettive",
    ],
  },
  {
    id: "tv-digitali-e-satellitari",
    title: "Tv digitali e satellitari",
    paragraphs: [
      "1. Verifica delle programmazioni annuali del/i canale/i in riferimento alle opere utilizzate ed alle ore annuali di programmazione musicale effettuate. L’equo compenso dovuto è relativo all’art. 72a e 73 della legge 633 del 1941, considerando l’eventuale messa a disposizione dei fonogrammi tramite internet, siti web, social media, on demand e cessioni dei programmi a soggetti terzi;",
      "Il calcolo delle tariffe si effettua per ciascun canale come segue:",
      "Media Share annuale X Ore annuali di programmazione musicale",
      "___________________________________________________________________________ X Quota complessiva diritti",
      "Abbattimento per la diffusione culturale",
      "Nello specifico lo share, riferito al dato Auditel è il rapporto percentuale tra gli spettatori di un certo canale e il totale degli spettatori che hanno la Tv accesa in quel momento.",
      "Le ore annuali di programmazione musicale sono definite in modo analitico. La R.a.s.i. riconosce alle emittenti un coefficiente pari a 10 per l’attività di diffusione culturale svolta dalle emittenti. La quota complessiva pari all’1,5 comprende i diritti di cui all’art. 72/a e 73 della legge 633 del 1941, l’utilizzo di videomusicali, nastri, basi playback e la messa a disposizione dei fonogrammi tramite internet, siti web e social media.",
    ],
    reductions: [
      "puntuale trasmissione della rendicontazione prevista dalla legge",
      "in base al numero dei canali rendicontati",
      "sottoscrizione di accordi almeno biennali con la R.a.s.i",
      "adesione ad organizzazioni che abbiano sottoscritto accordi quadro con la R.a.s.i.",
      "riconoscimento di un acconto per gli anni successivi.",
      "assenza di scopo di lucro",
      "piattaforme radiotelevisive",
    ],
  },
  {
    id: "uffici-studi-luoghi-di-lavoro",
    title: "Uffici, studi, luoghi di lavoro",
    paragraphs: [
      "Le tariffe sono annuali e calcolate sulla superficie in metri quadrati dello spazio. Le tariffe sono riferite ad una diffusione effettuata nelle forme consentite dalla legge.",
    ],
    tables: [
      {
        headers: ["METRI QUADRATI SUPERFICIE", "TARIFFE"],
        rows: [
          ["Da 1 a 100", "€ 50,00"],
          ["Da 101 a 200", "€ 75,00"],
          ["Da 201 a 300", "€ 110,00"],
          ["Da 301 a 500", "€ 170,00"],
          ["Per ogni ulteriori 200 Mq", "€ 100,00"],
        ],
      },
    ],
  },
  {
    id: "vodcast",
    title: "Vodcast",
    paragraphs: [
      "Il Vodcast è un sistema che permette di scaricare in modo automatico dalla rete programmi televisivi o parti di essi già comunicati al pubblico in modo che l’utente ne possa usufruire in qualsiasi momento.",
      "Le visualizzazioni sono il numero complessivo di volte in cui i programmi televisivi messi a disposizione siano stati fruiti in modalità Vodcast e/o Video on demand dagli utenti dell’eventuale sito.",
    ],
    flatRates: [
      "A fronte della concessione del diritto di messa a disposizione del pubblico (art. 72, lett. d) L.d.A.) il Licenziatario verserà a R.a.s.i. un compenso pari a € 01,50 ogni 15.000 visualizzazioni per le prime 600.000 visualizzazioni e pari a € 3,00 per ogni 12.000 ulteriori eventuali visualizzazioni con un compenso minimo garantito annuo non restituibile pari ad Euro 220,00 (duecentoventi/00).",
    ],
  },
  {
    id: "web-radio",
    title: "Web radio",
    paragraphs: [
      "Verifica delle programmazioni annuali in riferimento alle opere utilizzate ed alle ore annuali di programmazione musicale effettuate; Le tariffe sono annuali e calcolate sulle ore di diffusione musicale effettuate.",
    ],
    tables: [
      {
        headers: ["WEB RADIO COMMERCIALE Oltre le 2000 ore annuali di programmazione musicale", "WEB RADIO COMMERCIALE Sotto le 2000 ore annuali di programmazione musicale", "WEB RADIO NON COMMERCIALE"],
        rows: [
          ["€ 2100,00", "€ 1200,00", "€ 350,00"],
        ],
      },
    ],
    reductions: [
      "radio comunitarie",
      "puntuale trasmissione della rendicontazione prevista dalla legge",
      "sottoscrizione di accordi almeno biennali con la R.a.s.i",
      "adesione ad organizzazioni che abbiano sottoscritto accordi quadro con la R.a.s.i.",
      "riconoscimento di un acconto per gli anni successivi.",
    ],
  },
  {
    id: "web-tv",
    title: "WEB TV",
    paragraphs: [
      "Verifica delle programmazioni annuali in riferimento alle opere utilizzate ed alle ore annuali di programmazione musicale effettuate; Le tariffe sono annuali e calcolate sulle ore di diffusione musicale effettuate.",
    ],
    tables: [
      {
        headers: ["WEB TV GENERALISTE Oltre le 1000 ore annuali di programmazione musicale senza video musicali", "WEB TV GENERALISTE Sotto le 1000 ore annuali di programmazione musicale senza video musicali", "WEB TV MUSICALE Oltre le 2000 ore annuali di programmazione musicale con video musicali", "WEB TV MUSICALE Sotto le 2000 ore annuali di programmazione musicale con video musicali"],
        rows: [
          ["€ 1800,00", "€ 300,00", "€ 2300,00", "€ 1250,00"],
        ],
      },
    ],
    reductions: [
      "radio comunitarie",
      "puntuale trasmissione della rendicontazione prevista dalla legge",
      "sottoscrizione di accordi almeno biennali con la R.a.s.i",
      "adesione ad organizzazioni che abbiano sottoscritto accordi quadro con la R.a.s.i.",
      "riconoscimento di un acconto per gli anni successivi.",
    ],
  },
];
