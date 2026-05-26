# RASI — Report mapping formati emittenti
### Documento per il cliente · Anno di riferimento: 2024

> **Destinatari:** Direzione e gestione RASI  
> **Scopo:** Illustrare i risultati dell'analisi tecnica dei file di rendicontazione ricevuti da ciascun emittente, le criticità rilevate e le azioni pianificate per garantire un'elaborazione corretta e affidabile.  
> **Data:** 2026-05-18

---

## Premessa

Nel corso dell'analisi abbiamo esaminato i file di rendicontazione forniti da tutti i 22 emittenti per l'anno 2024. Lo scopo era verificare la struttura di ciascun file e capire come ricondurre i dati ricevuti al formato standard richiesto dal sistema RASI per l'elaborazione delle programmazioni.

Ogni emittente consegna i propri dati in modo autonomo — formato, struttura e unità di misura variano significativamente da uno all'altro. Questo documento riepiloga cosa abbiamo trovato, quali problemi presentano i dati ricevuti e cosa è necessario fare (o sarà fatto in automatico dal sistema) per renderli utilizzabili.

**Cosa significa "conforme":** un dato è conforme quando può essere importato nel sistema RASI senza correzioni manuali. Quando non lo è, il sistema deve applicare una trasformazione automatica; se la trasformazione non è possibile, il dato va segnalato o escluso.

---

## Indice

1. [Campi standard RASI](#1-campi-standard-rasi)
2. [Panoramica dei 22 emittenti](#2-panoramica-dei-22-emittenti)
3. [RAI](#3-rai--rai1-rai-premium)
4. [RTI-Mediaset](#4-rti-mediaset--canale5-cine-comico-infinity-free)
5. [SKY](#5-sky--sky-atlantic-sky-cinema-action-cielo-tv8)
6. [Netflix](#6-netflix)
7. [LA7](#7-la7)
8. [Discovery](#8-discovery--nove-giallo-warner-tv)
9. [Viacom](#9-viacom--comedy-central-nickelodeon-super)
10. [Disney Plus](#10-disney-plus)
11. [Amazon Video](#11-amazon-video--channels--tvod)
12. [Apple TV](#12-apple-tv--svod--tvod)
13. [TIMVision](#13-timvision--svod--tvod)
14. [CHILI](#14-chili--avod--tvod)
15. [Sony Culver Digital](#15-sony-culver-digital)
16. [Samsung TV Plus](#16-samsung-tv-plus)
17. [Italolive](#17-italolive)
18. [TV2000](#18-tv2000)
19. [Criticità trasversali](#19-criticit%C3%A0-trasversali)
20. [Matrice di conformità](#20-matrice-di-conformit%C3%A0)
21. [Riepilogo interventi pianificati](#21-riepilogo-interventi-pianificati)

---

## 1. Campi standard RASI

Il sistema RASI prevede un insieme definito di informazioni per ogni trasmissione o contenuto. Di seguito i campi principali con una breve descrizione:

| Campo | Obbligatorio | Descrizione |
|---|---|---|
| Titolo | ✅ | Titolo italiano dell'opera o dell'episodio |
| Titolo originale | | Titolo nella lingua originale di produzione |
| Tipo | ✅ | Categoria del contenuto (Film, Serie TV, Documentario…) |
| Canale | | Nome del canale trasmittente |
| Emittente | | Ragione sociale dell'emittente |
| Data trasmissione | | Giorno in cui il contenuto è andato in onda |
| Ora inizio / Ora fine | | Fascia oraria della trasmissione |
| Durata (minuti) | | Durata effettiva del contenuto in minuti interi |
| Numero episodio | | Numero progressivo dell'episodio (per serie) |
| Titolo episodio | | Titolo del singolo episodio |
| Numero stagione | | Numero della stagione (per serie) |
| Anno di produzione | | Anno in cui l'opera è stata prodotta |
| Casa di produzione | | Produttore o distributore |
| Regia | | Nome del regista |
| Visualizzazioni / Stream | | Numero di fruizioni (per piattaforme on-demand) |
| Ricavi | | Ricavi advertising o da vendita (per piattaforme commerciali) |

Tutti i file ricevuti dagli emittenti devono essere ricondotti a questi campi. La difficoltà nasce dal fatto che ogni emittente utilizza nomi di colonne, formati e unità di misura proprie.

---

## 2. Panoramica dei 22 emittenti

La tabella seguente offre una visione d'insieme dei file ricevuti, indicando il tipo di file e la principale criticità sulla durata — il campo più variabile tra gli emittenti.

| Emittente | Tipo file | Nota principale sulla durata |
|---|---|---|
| RAI (RAI1, RAI Premium) | CSV | Durata in **secondi** — da convertire in minuti |
| RTI-Mediaset (CSV) | CSV | Durata con carattere speciale (`128'`) — da pulire |
| RTI-Mediaset (Canale5 lineare) | TXT a larghezza fissa | Formato proprietario — durata indica solo i minuti musicali, non la durata totale |
| SKY (4 canali) | TXT separato da tab | Durata in formato `OO:MM:SS` — da convertire |
| Netflix | CSV | Durata in minuti con decimali (`89.3`) — da arrotondare |
| LA7 | Excel | Durata in **ore decimali** (`0.454 h`) — da convertire |
| Discovery Nove | Excel legacy | Durata in formato `OO:MM:SS` — da convertire |
| Discovery Giallo | Excel | Durata come oggetto ora — da convertire |
| Discovery Warner TV | Excel | Durata in formato `OO:MM:SS` — da convertire |
| Viacom (3 canali) | Excel legacy | Durata in **minuti decimali** (`21.7`) — da arrotondare |
| Disney Plus | Excel | ⚠️ Durata non unitaria — dato non utilizzabile per il singolo contenuto |
| Amazon CHANNELS | CSV | Durata già in minuti — conforme |
| Amazon TVOD | CSV | Durata già in minuti — conforme |
| Apple TV+ (SVOD) | Excel | Durata in formato tecnico ISO (`PT0H22M0S`) — da convertire |
| Apple TVOD | Excel | Durata in **millisecondi** — da convertire |
| TIMVision (SVOD + TVOD) | Excel (2 fogli) | Durata già in minuti — conforme |
| CHILI AVOD | Excel | Durata già in minuti — conforme |
| CHILI TVOD | Excel | ⚠️ Durata come frazione di giorno (`0.0743`) — da convertire |
| Sony Culver Digital | Excel | ❌ Durata non presente |
| Samsung TV Plus | Excel | ❌ Dati di audience, nessuna programmazione |
| Italolive | Excel | ❌ Durata non presente |
| TV2000 | Excel | Durata come oggetto ora — da convertire |

---

## 3. RAI — RAI1, RAI Premium

**Cosa contiene il file:** palinsesto completo dell'anno 2024, con titoli, date, orari, durata e informazioni sull'opera.

**Cosa funziona bene:** la struttura è chiara e i dati sono completi. RAI Premium include anche informazioni sugli episodi.

**Criticità rilevate:**

- **Durata in secondi invece di minuti.** Il campo durata contiene valori come `5670` (che significa 94 minuti e 30 secondi). Il sistema deve dividere per 60 per ottenere i minuti. Questo vale per entrambi i canali.
- **Formato data diverso tra i due file.** RAI1 usa il formato italiano (`giorno/mese/anno`), RAI Premium usa il formato internazionale (`anno-mese-giorno`). Il sistema deve gestire entrambi.
- **Genere trasmissione come codice numerico.** Il campo genere contiene valori come `1502` o `1022` invece di etichette leggibili. Non disponiamo della tabella di corrispondenza codice→descrizione — da richiedere a RAI se necessario.
- **Colonne senza intestazione nelle ultime posizioni.** Alcune colonne (attori, regia) non hanno un nome formale nel file — vengono identificate in base alla posizione, con rischio di disallineamento se la struttura cambia.
- **RAI Premium: durata spesso zero** per trasmissioni brevi o spot pubblicitari — queste righe vengono filtrate automaticamente.

**Azioni pianificate:** conversione automatica della durata da secondi a minuti; normalizzazione del formato data; filtraggio righe con durata zero.

---

## 4. RTI-Mediaset — Canale5, Cine Comico, Infinity Free

RTI-Mediaset consegna dati in due formati molto diversi tra loro.

### File CSV (Cine Comico e Infinity Free)

**Cosa contiene:** dati SVOD/AVOD con informazioni su titoli, episodi, prezzi e vendite.

**Criticità rilevate:**

- **Una riga per ogni persona coinvolta nell'opera.** Lo stesso film appare nel file tante volte quanti sono gli attori e i registi elencati (ogni riga riporta un nome diverso: attore, regista, sceneggiatore…). Se il dato venisse importato così com'è, ogni film risulterebbe contato decine di volte. Il sistema deve raggruppare e deduplicare prima dell'import.
- **Durata con apostrofo finale.** Il campo durata contiene valori come `128'` (con un apice/apostrofo finale). Il sistema deve rimuovere quel carattere per ottenere il numero.
- **Codici paese invece di nomi.** I campi paese contengono sigle (`I`, `F`, `USA`) invece di nomi per esteso. Accettabile ai fini del sistema.

### File TXT (Canale5 lineare — formato AIE/IMAIE)

**Cosa contiene:** rendicontazione dei diritti musicali per le trasmissioni di Canale5 (formato speciale per IMAIE/AIE).

**Criticità rilevate:**

- **Non è un palinsesto standard.** Il file non descrive le trasmissioni in senso classico, ma i diritti musicali attribuiti a ciascuna trasmissione. La "durata" indica i minuti di musica presenti nel programma, non la durata totale del programma.
- **Struttura a larghezza fissa.** Le informazioni non sono separate da virgole o punti e virgola ma occupano posizioni fisse all'interno di ogni riga di testo. Richiede un parser dedicato.
- **Una riga per ogni opera musicale.** Lo stesso programma può apparire più volte, una per ogni brano musicale in esso contenuto.

**Utilizzo consigliato:** questo file è utile per i diritti musicali, non come fonte primaria del palinsesto trasmissivo.

---

## 5. SKY — Sky Atlantic, SKY Cinema Action, Cielo, TV8

**Cosa contiene:** palinsesto dei quattro canali SKY per l'anno 2024 (un file per canale).

**Cosa funziona bene:** struttura omogenea e coerente tra tutti i canali SKY. Include titoli, titoli originali, episodi, anno di produzione, regia e tipologia.

**Criticità rilevate:**

- **Durata in formato ore:minuti:secondi invece di minuti.** Il campo durata riporta valori come `01:04:51` (1 ora, 4 minuti, 51 secondi = 65 minuti). Il sistema converte automaticamente.
- **Numero episodio non ha colonna dedicata.** Per le serie, il numero dell'episodio è incorporato nel titolo (`"House Of The Dragon 02 Ep.02 - Rhaenyra La Crudele"`). L'estrazione richiede un'analisi del testo del titolo — operazione più fragile rispetto a un campo separato.
- **Copertura potenzialmente parziale.** Il campione analizzato copre solo la seconda metà del 2024. Per avere l'anno intero potrebbero essere necessari file aggiuntivi.

**Azioni pianificate:** conversione automatica della durata; estrazione del numero episodio dal titolo ove possibile.

---

## 6. Netflix

**Cosa contiene:** dati di visualizzazione per l'intero anno 2024, con informazioni su titoli, episodi, durata, distributore e paese di origine.

**Criticità rilevate:**

- **Nessuna data di trasmissione precisa.** Il file Netflix non contiene la data in cui un contenuto è stato visualizzato, ma solo la data di fine del periodo di rendicontazione (`31/12/2024`). Non è possibile ricostruire quando esattamente un contenuto è stato visto.
- **Durata con decimali.** I valori come `89.3` minuti vengono arrotondati all'intero più vicino.
- **Formato data americano.** La data usa il formato `mese/giorno/anno` (es. `12/31/2024`) invece del formato italiano — conversione automatica necessaria.
- **Episodio non presente per film e contenuti singoli.** Per questi contenuti il campo episodio contiene `"--"` invece di un numero — trattato come assenza di dato.
- **Titoli con caratteri speciali.** Alcuni titoli contengono virgolette doppie all'interno (`"Sr."`), gestite automaticamente.

---

## 7. LA7

**Cosa contiene:** palinsesto annuale 2024 con dati molto completi: titoli, orari, durata, episodi, stagioni, anno, produttore, regia.

**Cosa funziona bene:** LA7 è uno degli emittenti con il maggior numero di campi compilati e con struttura chiara.

**Criticità rilevate:**

- **Durata in ore decimali invece di minuti.** Il campo durata riporta valori come `0.454` che significano 0.454 ore = circa 27 minuti. Il sistema moltiplica per 60 per ottenere i minuti. Attenzione: questa unità (ore decimali) è diversa da quella di Viacom (minuti decimali) — aspetto che richiede configurazione per-emittente.
- **Righe senza titolo.** Alcune righe non hanno un titolo associato (probabilmente spot o promo) — vengono filtrate automaticamente.
- **Molte colonne vuote in fondo al file.** Le ultime circa 38 colonne del file sono vuote — ignorate.

---

## 8. Discovery — Nove, Giallo, Warner TV

**Cosa contiene:** palinsesto dei tre canali del gruppo Discovery per il 2024.

**Cosa funziona bene:** schema delle colonne molto simile tra i tre canali — titoli, episodi, stagioni, anno, regia.

**Criticità rilevate:**

- **Tre formati file diversi per lo stesso gruppo.** Discovery Nove usa un formato Excel "vecchio" (`.xls`), mentre Giallo e Warner TV usano il formato moderno (`.xlsx`). Richiedono strumenti di lettura diversi.
- **Durata in formati diversi tra i tre canali.** Nove e Warner TV usano il formato `OO:MM:SS`; Giallo usa un oggetto tecnico "ora". Entrambi richiedono conversione.
- **Colonna "ANNO/STAGIONE" con nome fuorviante.** Nonostante il nome, questa colonna contiene il numero di stagione, non l'anno. Il nome induce in errore ma il dato è corretto.
- **Valori "N/A" come campo vuoto.** Dove non c'è un dato (es. regia non disponibile), il file riporta la stringa `N/A` invece di lasciare il campo vuoto — normalizzato automaticamente.
- **Titoli tutti in maiuscolo.** I titoli sono scritti interamente in MAIUSCOLO — il sistema li converte in formato standard (prima lettera maiuscola per parola).

---

## 9. Viacom — Comedy Central, Nickelodeon, Super!

**Cosa contiene:** palinsesto dei tre canali Viacom per il 2024 (un file per canale nel formato Excel legacy).

**Criticità rilevate:**

- **Le intestazioni delle colonne non sono nella prima riga.** Il file usa le prime due righe per note legali e raggruppamenti. Le intestazioni vere e proprie si trovano alla terza riga, e i dati iniziano dalla quinta. Il sistema deve saltare le righe iniziali per leggere correttamente.
- **Formato Excel "vecchio" (`.xls`).** Come Discovery Nove, richiede strumenti di lettura specifici.
- **Durata in minuti decimali.** Valori come `21.683` minuti vengono arrotondati a 22.
- **Data e orario in formato tecnico Excel.** Le date non sono scritte in forma leggibile ma come numeri seriali interni a Excel (es. `45292.0`) che il sistema converte nella data corrispondente.
- **Orario come frazione numerica.** L'orario `0.25` corrisponde alle 06:00:00 (un quarto del giorno). Conversione automatica.

---

## 10. Disney Plus

**Cosa contiene:** dati di fruizione mensile per l'intero anno 2024 — oltre 436.000 righe — con informazioni su titoli, stagioni, episodi, visualizzazioni e dati di produzione.

**Criticità principali:**

- **⚠️ La durata presente nel file NON è la durata del singolo contenuto.** Il campo `RUN_TIME_DURATION_MINS` riporta il totale cumulativo di minuti fruiti da tutti gli utenti per quel contenuto in quel mese (es. un episodio con 6 visualizzazioni riporta `23.153.667` minuti totali). Questo dato non può essere usato per determinare la durata dell'opera. La durata unitaria del contenuto è assente dal file.
- **Valori nulli scritti come testo.** Dove non c'è un dato, il file riporta la parola `NULL` come testo invece di lasciare il campo vuoto — riconosciuto e normalizzato automaticamente.
- **File molto grande (79 MB).** Richiede procedure di lettura ottimizzate.

**Cosa funziona bene:** include identificatori standard internazionali (ISAN, EIDR) che possono essere utili per il matching con il catalogo RASI.

---

## 11. Amazon Video — CHANNELS & TVOD

Amazon consegna due file separati: uno per le vendite attraverso Amazon Channels (abbonamenti a canali terzi), uno per il TVOD (noleggio/acquisto singolo).

### Amazon CHANNELS

**Cosa funziona bene:** struttura chiara, durata già in minuti, dati completi su titoli, episodi, stagioni, anno e regia. File molto grande (~95 MB) ma leggibile con procedure ottimizzate.

**Criticità rilevate:**
- **Nessuna data di trasmissione precisa.** Solo il trimestre di riferimento (`Q1`, `Q2`…) — non la data esatta.

### Amazon TVOD

**Cosa funziona bene:** durata già in minuti.

**Criticità rilevate:**
- **Separatore diverso dal file CHANNELS.** Il file CHANNELS usa la virgola come separatore, il file TVOD usa il punto e virgola. Dettaglio tecnico che richiede configurazione separata.
- **Schema ridotto.** Mancano numero episodio, numero stagione e nome canale.
- **Nessuna data precisa** — solo trimestre.

---

## 12. Apple TV — SVOD & TVOD

Apple consegna due file separati: uno per i contenuti in abbonamento (SVOD) e uno per noleggio/acquisto (TVOD).

### Apple TV+ SVOD

**Cosa funziona bene:** file molto ricco — 47 colonne, include identificatori standard ISAN ed EIDR utili per il matching, numero episodio, stagione, regia, casa di produzione, visualizzazioni.

**Criticità rilevate:**
- **Durata in formato tecnico ISO 8601.** Il valore `PT0H22M0S` significa 22 minuti (0 ore, 22 minuti, 0 secondi). Conversione automatica.
- **Campo stagione a volte scritto in forma testuale.** Il numero stagione può comparire come `"Season 2"` invece del numero `2` — il sistema estrae il numero dal testo.

### Apple TVOD

**Criticità rilevate:**
- **Durata in millisecondi.** Il valore `6014000` millisecondi corrisponde a 100 minuti. Il sistema divide per 60.000.
- **Data di uscita come numero intero.** Il valore `20231231` corrisponde al 31 dicembre 2023 — il sistema lo converte in data.
- **Prezzo come testo.** Il valore del prezzo (`10.65`) arriva come stringa di testo invece che come numero — conversione automatica.

---

## 13. TIMVision — SVOD & TVOD

**Cosa contiene:** un unico file Excel con due fogli separati — uno per SVOD e uno per TVOD — con dati aggregati per il 2024.

**Cosa funziona bene:** struttura chiara, durata già in minuti (campo dedicato `DURATA_MINUTI_CONTENUTO`), dati di visualizzazioni, informazioni su titolo, regia (fino a 3 registi), paese di produzione (fino a 7 paesi).

**Criticità rilevate:**

- **Valore "N.D." usato per i campi vuoti.** TIMVision indica l'assenza di dato con la stringa `N.D.` invece di lasciare il campo vuoto — normalizzato automaticamente.
- **Attenzione al campo durata.** Il file contiene due campi durata: `DURATA_MINUTI_CONTENUTO` (durata del singolo contenuto — quella corretta) e `DURATA_ORE` / `DURATA_MINUTI` (totale aggregato di fruizione, che può essere centinaia di ore). Il sistema usa solo il primo campo.
- **Nessuna data di trasmissione.** Solo dati aggregati senza data precisa.

---

## 14. CHILI — AVOD & TVOD

CHILI consegna file trimestrali separati per AVOD (pubblicità) e TVOD (noleggio/acquisto). Il campione analizzato copre il primo trimestre 2024.

**Criticità rilevate:**

- **⚠️ Unità di durata completamente diverse tra AVOD e TVOD, nello stesso emittente:**
  - AVOD: la colonna `Track Duration` contiene minuti interi (`121`) — già conforme.
  - TVOD: la colonna `Truck Duration` (sic) contiene una frazione di giorno (`0.0743`) che corrisponde a circa 107 minuti. Il sistema moltiplica per 24 e poi per 60.
- **Errori di digitazione nel file TVOD.** Il nome della colonna durata è `Truck Duration` invece di `Track Duration`, e il nome del foglio Excel contiene un errore di battitura (`REDNICONTAZIONE` invece di `RENDICONTAZIONE`). Questi errori sono nella fonte — il sistema li gestisce identificando le colonne per nome esatto.
- **Intestazione in riga diversa tra i due file.** Nel file AVOD, le intestazioni delle colonne si trovano alla riga 3; nel file TVOD alla riga 2. Configurazione separata per i due file.
- **File trimestrali.** Per avere l'anno completo occorrono 4 file per tipo. Da verificare se tutti i trimestri sono stati consegnati.

---

## 15. Sony Culver Digital

**Cosa contiene:** lista di opere del catalogo Sony con titolo, titolo originale, anno e tipologia. Solo 4 colonne.

**Criticità rilevate:**

- **Schema molto ridotto.** Non contiene date, durate, episodi, produttore o regia — funziona come lista di catalogo, non come rendicontazione di trasmissioni.
- **Alcuni "titoli italiani" non sono in italiano.** Alcuni valori nel campo titolo italiano sono in spagnolo (`"El Sueño De Mi Vida"`).
- **Nessuna informazione commerciale o di audience.** Utile per confrontare i titoli con il catalogo RASI, ma non per elaborare dati di palinsesto.

---

## 16. Samsung TV Plus

**Cosa contiene:** dati di audience aggregati per canale e anno (utenti unici che hanno guardato il canale per almeno 15 minuti). Dati dal 2020 al 2024 per diversi canali Samsung TV Plus.

**Criticità principali:**

- **Non è un file di palinsesto.** Non contiene titoli di opere, date di trasmissione né durate dei contenuti. Non è importabile nel sistema RASI come programmazione.
- **Struttura non standard (tabella pivot).** I dati sono organizzati con i canali in righe e gli anni in colonne — formato non importabile direttamente.

**Utilizzo possibile:** come riferimento per verificare quali canali Samsung sono attivi in Italia e con quale bacino di audience, ma non per le operazioni di matching e rendicontazione.

---

## 17. Italolive

**Cosa contiene:** lista di titoli con anno e numero di visualizzazioni. Solo 3 colonne.

**Criticità rilevate:**

- **Schema ultra-ridotto.** Nessuna data di trasmissione, nessuna durata, nessuna informazione su episodi o tipo di contenuto.
- **Visualizzazioni con decimali.** I valori come `8.083` o `10.67` potrebbero rappresentare migliaia (8.083 = 8.083 visualizzazioni) oppure numeri reali con cifre decimali — da chiarire con l'emittente per interpretare correttamente i dati.
- **Utile solo per conteggio view.** Non utilizzabile come palinsesto.

---

## 18. TV2000

**Cosa contiene:** palinsesto mensile con tutti i dati principali: titoli, orari, durata, anno, produttore, regia, episodi.

**Cosa funziona bene:** struttura completa e leggibile, con date e orari già in formato standard.

**Criticità rilevate:**

- **Una riga per segmento, non per trasmissione intera.** TV2000 divide ogni trasmissione in segmenti (probabilmente divisi dagli stacchi pubblicitari). Lo stesso film viene quindi elencato su più righe (`29 min`, `30 min`, `34 min`…) invece di una sola riga con la durata totale. Per ottenere la durata complessiva è necessario sommare i segmenti per titolo e data.
- **Campo prima/replica come numero.** Il campo che indica se si tratta di prima o replica contiene un numero intero (`1`) invece di una descrizione — la corrispondenza esatta non è documentata nel file.
- **File mensili.** La disponibilità del dato annuale richiede la raccolta e unione di 12 file mensili.

---

## 19. Criticità trasversali

Alcune problematiche sono comuni a più emittenti e meritano un'attenzione particolare.

### 19.1 — Durata: 10 unità di misura diverse

Tra i 22 emittenti, il campo "durata" è espresso in ben 10 modi diversi:

| Unità | Emittenti interessati |
|---|---|
| Secondi interi | RAI |
| Minuti interi | Amazon, TIMVision, CHILI AVOD |
| Minuti decimali | Netflix, Viacom |
| Ore decimali | LA7 |
| Frazione di giorno | CHILI TVOD |
| Formato OO:MM:SS | SKY, Discovery Nove, Discovery Warner TV |
| Oggetto "ora" tecnico | Discovery Giallo, TV2000 |
| Formato ISO (`PT0H22M0S`) | Apple SVOD |
| Millisecondi | Apple TVOD |
| Con apostrofo finale (`128'`) | RTI-Mediaset CSV |
| ❌ Assente o non unitaria | Disney Plus, Samsung, Italolive, Sony |

**Impatto:** senza una conversione specifica per ogni emittente, la durata dei contenuti risulterebbe errata o incomparabile tra fonti diverse. Il sistema è configurato per gestire ciascuna di queste varianti in modo automatico.

### 19.2 — Data di trasmissione: 7 formati diversi

| Formato | Emittenti |
|---|---|
| `anno-mese-giorno` (standard internazionale) | RAI Premium |
| `giorno/mese/anno` (italiano) | RAI1, SKY, RTI-Mediaset |
| `mese/giorno/anno` (americano) | Netflix |
| Numero seriale Excel | Viacom, Discovery Nove |
| Oggetto data/ora tecnico | LA7, Discovery Giallo, TV2000, Disney Plus |
| Numero intero (`20231231`) | Apple TVOD |
| Solo trimestre (`Q1`–`Q4`) | Amazon, Netflix |

**Impatto:** senza normalizzazione, un file che usa il formato americano potrebbe far confondere il giorno con il mese (es. `03/01/2024` letto come 3 gennaio invece di 1 marzo). Il sistema gestisce tutti i formati noti e segnala quelli non riconoscibili.

### 19.3 — Intestazioni delle colonne in riga non standard

Tre emittenti (Viacom, CHILI AVOD, CHILI TVOD) e due minori (Italolive) non posizionano le intestazioni delle colonne nella prima riga del file come da convenzione. Se il sistema non è configurato correttamente per ciascuno, le intestazioni vengono importate come dati.

### 19.4 — Formati file tecnici non standard

| Situazione | Emittenti | Impatto |
|---|---|---|
| Excel "vecchio" (formato `.xls`) | Viacom (3 file), Discovery Nove | Richiedono strumento di lettura specifico, diverso dal formato moderno `.xlsx` |
| File di testo a larghezza fissa | RTI-Mediaset Canale5 | Richiedono parser dedicato con posizioni fisse |
| File TSV (separatore tab) | SKY (4 file) | Standard ma diverso dal CSV — configurazione separata |
| CSV con punto e virgola | RAI, RTI-Mediaset, Amazon TVOD | Diverso dal CSV standard con virgola |

### 19.5 — Righe duplicate o struttura non tabellare

| Emittente | Problema | Effetto se non gestito |
|---|---|---|
| RTI-Mediaset CSV | Una riga per attore/regista nello stesso titolo | Ogni titolo viene importato N volte (una per persona coinvolta) |
| TV2000 | Una riga per segmento della stessa trasmissione | Difficoltà nel calcolare la durata totale |
| Samsung | Struttura pivot (non tabellare) | Non importabile come palinsesto |

### 19.6 — Valori nulli non standard

Quattro emittenti non lasciano semplicemente vuoto il campo quando un dato è assente, ma inseriscono una stringa convenzionale:

| Stringa usata | Emittente | Significato |
|---|---|---|
| `N.D.` o `N.D` | TIMVision | Dato non disponibile |
| `N/A` | Discovery | Non applicabile |
| `NULL` (testo) | Disney Plus | Valore nullo |
| `--` | Netflix (episodi) | Campo non applicabile per film |

Se non gestiti, questi valori testuali verrebbero importati come se fossero dati reali.

### 19.7 — Encoding dei caratteri

Due emittenti usano codifiche di caratteri non standard che possono causare problemi con lettere accentate italiane se non gestite correttamente: RAI Premium (con BOM) e RTI-Mediaset Canale5 (Latin-1). Il sistema è configurato per gestirli.

---

## 20. Matrice di conformità

La tabella seguente mostra per ogni emittente quali campi principali sono presenti e corretti (✅), presenti ma richiedono conversione (⚠️) o assenti (❌).

| Emittente | Titolo | Data trasm. | Ora inizio | Durata | N. Episodio | N. Stagione | Anno | Tipo | Visualiz. | Ricavi |
|---|---|---|---|---|---|---|---|---|---|---|
| RAI | ✅ | ✅ | ✅ | ⚠️ secondi | ⚠️ posizionale | ⚠️ | ✅ | ⚠️ codice | ❌ | ❌ |
| RTI CSV | ✅ | ✅ | ❌ | ⚠️ apostrofo | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| RTI TXT | ✅ | ✅ | ✅ | ⚠️ solo musica | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| SKY | ✅ | ✅ | ✅ | ⚠️ OO:MM:SS | ⚠️ nel titolo | ⚠️ | ✅ | ✅ | ❌ | ❌ |
| Netflix | ✅ | ⚠️ solo fine periodo | ❌ | ⚠️ decimale | ⚠️ `"--"` | ❌ | ✅ | ✅ | ❌ | ❌ |
| LA7 | ✅ | ✅ | ✅ | ⚠️ ore decimali | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Discovery Nove | ✅ | ⚠️ seriale XLS | ❌ | ⚠️ OO:MM:SS | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Discovery Giallo | ✅ | ✅ | ❌ | ⚠️ obj ora | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Discovery Warner | ✅ | ✅ | ❌ | ⚠️ OO:MM:SS | ✅ | ⚠️ assente per film | ✅ | ❌ | ❌ | ❌ |
| Viacom | ✅ | ⚠️ seriale XLS | ⚠️ fraz. giorno | ⚠️ min. decimali | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Disney Plus | ✅ | ⚠️ release date | ❌ | ❌ non unitaria | ⚠️ `NULL` testo | ✅ | ✅ | ✅ | ✅ | ❌ |
| Amazon CHANNELS | ✅ | ⚠️ solo trimestre | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Amazon TVOD | ✅ | ⚠️ solo trimestre | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Apple SVOD | ✅ | ⚠️ release date | ❌ | ⚠️ ISO 8601 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Apple TVOD | ✅ | ⚠️ intero YYYYMMDD | ❌ | ⚠️ millisecondi | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| TIMVision | ✅ | ❌ | ❌ | ✅ | ⚠️ `N.D.` | ⚠️ `N.D.` | ✅ | ✅ | ✅ | ❌ |
| CHILI AVOD | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| CHILI TVOD | ✅ | ❌ | ❌ | ⚠️ fraz. giorno | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Sony | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Samsung | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ audience | ❌ |
| Italolive | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| TV2000 | ✅ | ✅ | ✅ | ⚠️ obj ora | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |

**Legenda:** ✅ presente e conforme · ⚠️ presente ma richiede conversione · ❌ assente

---

## 21. Riepilogo interventi pianificati

Sulla base di questa analisi, gli interventi da eseguire si dividono in tre categorie.

### Interventi tecnici automatizzati (già in fase di implementazione)

Questi interventi vengono eseguiti dal sistema in modo trasparente, senza necessità di azione manuale per ogni import:

| Intervento | Beneficio |
|---|---|
| Conversione automatica della durata per ciascun emittente (10 varianti) | Tutti i contenuti avranno una durata espressa in minuti interi, confrontabile tra emittenti |
| Normalizzazione del formato data (7 varianti) | Nessuna confusione tra giorno e mese; date uniformi in tutti i report |
| Riconoscimento e normalizzazione dei valori nulli non standard (`N.D.`, `N/A`, `NULL`, `--`) | I campi vuoti vengono trattati correttamente, senza importare stringhe di testo come dati reali |
| Deduplicazione righe RTI-Mediaset | I titoli Mediaset non vengono contati più volte per via degli autori elencati |
| Gestione delle intestazioni in riga non standard (Viacom, CHILI) | I file vengono letti correttamente indipendentemente dalla posizione delle intestazioni |
| Normalizzazione titoli (da MAIUSCOLO a Formato Standard) | Titoli Discovery, RAI e altri presentati in modo uniforme |
| Configurazione separata per file `.xls` legacy e TSV | Viacom e Discovery Nove letti correttamente senza errori di formato |

### Raccomandazioni verso gli emittenti

Per alcune criticità, la soluzione più efficace sarebbe concordare con l'emittente un miglioramento nella consegna dei file:

| Emittente | Raccomandazione |
|---|---|
| **SKY** | Aggiungere colonna separata per il numero episodio, invece di incorporarlo nel titolo |
| **RAI** | Uniformare il formato data tra RAI1 (italiano) e RAI Premium (ISO) |
| **CHILI** | Uniformare l'unità di durata tra AVOD e TVOD; correggere i typo nel file TVOD (`Truck Duration`, `REDNICONTAZIONE`) |
| **TV2000** | Fornire una riga per trasmissione completa invece di una per segmento |
| **Italolive** | Chiarire se le visualizzazioni sono in unità reali o in migliaia |
| **Samsung / Sony / Italolive** | Valutare se i file attuali rispondono alle esigenze RASI o se è necessario richiedere un formato diverso |

### Dati strutturalmente non disponibili

Alcune informazioni non sono ricavabili dai file attuali, indipendentemente dalle trasformazioni applicate:

| Dato | Emittenti interessati | Nota |
|---|---|---|
| Data esatta di trasmissione | Netflix, Amazon, TIMVision, CHILI, Apple, Sony, Samsung, Italolive | Solo dato aggregato (trimestrale/annuale) disponibile |
| Durata unitaria del contenuto | Disney Plus | La durata presente è aggregata e non utilizzabile |
| Numero episodio | Amazon TVOD, Apple TVOD, CHILI, RTI TXT | Non presente nei file |
| Qualsiasi dato di palinsesto | Samsung | File di sola audience, non di programmazione |

---

*Fine documento — versione 1.0 — 2026-05-18*  
*Uso: condivisione cliente RASI · Documento tecnico di riferimento interno: `emittenti-format-recap.md`*
