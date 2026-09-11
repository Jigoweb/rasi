# Integrità catalogo e affidabilità delle individuazioni

**Data analisi:** 11 settembre 2026  
**Fonti:** Banca dati Rasi su NocoDB (source usata: *Banca dati Rasi*; esclusa l’anagrafica Fern) e catalogo operativo attuale.  
**Destinatari:** incontro in sede.

Due problemi distinti. Confonderli porta a correzioni sbagliate.

---

## 1. In sintesi

| # | Problema | Cosa succede | Esempi dell’email |
|---|---|---|---|
| A | Matcher troppo permissivo sulle serie | Se stagione+episodio del palinsesto non esistono in catalogo, il programma usa lo stesso numero episodio di **un’altra stagione** e/o il cast di tutta la serie. In elenco restano i numeri del palinsesto. | FRINGE, HAWAII FIVE-0, YELLOWSTONE |
| B | Catalogo incompleto / associazioni errate rispetto a Noco | 2.676 collegamenti artista–opera presenti in Noco non sono nel sistema attuale. Alcuni artisti hanno repertorio azzerato. In almeno un caso un artista è sul film sbagliato. | LASARDO, CURRIE/GRAHAM, BROWNING, PARÈ, SEAGAL, Danilo Mattei / Manuale d’Amore |

Sui tre titoli Sky, il repertorio Noco e quello attuale **coincidono** con quanto indicato dal cliente. Quei falsi positivi **non** si risolvono «ripristinando Noco»: si risolvono cambiando la regola di matching.

Il buco di repertorio **sì** si risolve con un ripristino selettivo da Noco, **senza cancellare** i 3.258 collegamenti e i 22 artisti aggiunti dopo la migrazione (lavoro AGCOM).

---

## 2. Cosa abbiamo confrontato

Nella base Noco convivono più sorgenti. Per questa analisi:

- **Usata:** *Banca dati Rasi* — 750 artisti, 27.844 righe «Opere».
- **Ignorata:** anagrafica Fern (audiovisivo / musica).
- **Non usate come verità catalogo:** altre sorgenti di appoggio (IMDB, programmazioni, tabelle di lavoro).

In Noco ogni riga «Opere» è una **partecipazione** (artista + titolo + eventuale stagione/episodio + ruolo), non un’opera unica. Per questo 27.844 righe Noco corrispondono, nel sistema attuale, ai collegamenti artista–opera, non al numero di titoli.

Sistema attuale al 11/09/2026: **769 artisti**, **7.427 opere**, **26.736 episodi**, **28.428 partecipazioni**.

---

## 3. Problema A — matching serie (FRINGE, HAWAII FIVE-0, YELLOWSTONE)

### 3.1 Il catalogo dice la stessa cosa del cliente

**FRINGE** — una sola riga in Noco e nel sistema attuale: St. 2 Ep. 2, John Smeallie Youngs.

**HAWAII FIVE-0** stagione 2 in catalogo: episodi 3, 4, 5, 23 (William Baldwin). Non ci sono St. 2 Ep. 1 né St. 2 Ep. 10. St. 5 Ep. 10 esiste (Eric Roberts).

**YELLOWSTONE** stagione 3 in catalogo: episodi 1, 2, 4 con Michael Nouri. Vittorio Thermes è censito sulle stagioni **4 e 5**, non sulla 3.

I palinsesti Sky 2022 hanno episodi che **il repertorio RASI non copre**. Il programma oggi li individua lo stesso.

### 3.2 Perché li individua

Dopo aver riconosciuto il titolo della serie (correttamente):

1. cerca stagione+episodio esatti;
2. se fallisce, accetta **qualsiasi episodio con lo stesso numero**, anche di un’altra stagione;
3. se non c’è proprio quell’episodio, attribuisce il **cast distinto di tutta la serie**;
4. in elenco mostra stagione/episodio **del palinsesto**, non quelli del catalogo usato.

Dettaglio e punteggi: documento allegato *Algoritmo di individuazione*.

### 3.3 Proposta (da approvare in incontro)

Regola di default: **precisione prima del richiamo**.

- Stagione e episodio noti: solo abbinamento **esatto**. Altrimenti nessuna individuazione automatica, solo avviso «episodio non censito».
- Stesso numero episodio su un’altra stagione: solo se la stagione del palinsesto manca **e** quel numero è unico in catalogo.
- Mai attribuire a un passaggio il cast di un altro episodio o di tutta la serie.
- In revisione, mostrare stagione/episodio di catalogo accanto a quelli del palinsesto quando differiscono.

Effetto atteso: FRINGE / HAWAII FIVE-0 / YELLOWSTONE smettono di generare i falsi positivi segnalati. Calano le individuazioni automatiche su episodi non in repertorio (è voluto: oggi quelle righe sono diritti inesistenti).

Il cambio **non parte** finché la regola non è approvata: alza la precisione e riduce il richiamo. Le campagne già chiuse non si riscrivono da sole; va rilanciata l’individuazione.

Questa proposta riguarda i palinsesti **con stagione ed episodio noti**. Il caso diverso (sola numerazione continua, senza stagione) è un problema a parte e non è oggetto di questa nota.

---

## 4. Problema B — differenze Noco vs catalogo attuale

Confronto del 11/09/2026, sulle chiavi anagrafiche comuni (codice mandante artista e codice opera Noco).

### 4.1 Artisti

| | Noco | Sistema attuale |
|---|---:|---:|
| Record | 750 | 769 |
| Con codice mandante Noco | 750 | 747 |

- **3 in Noco assenti dal sistema attuale:** ARTEVIVA ASSOCIAZIONE CULTURALE, PRO MUSIC INTERNATIONAL SRL, ASSOCIAZIONE PRELUDIO — produttori, 0 opere. Irrilevanti per le individuazioni.
- **22 nel sistema attuale senza codice mandante Noco:** inseriti dopo la migrazione. **Da conservare.**
- **0 extra con codice mandante** che Noco non abbia più.
- Un solo scambio nome/cognome: Noco `ANGELA NOBILE` vs sistema attuale `NOBILE ANGELA`.

**L’anagrafica artisti è sostanzialmente allineata.** Il problema segnalato sta nel **repertorio** (collegamenti artista–opera), non nei nominativi.

### 4.2 Repertorio

| | Conteggio |
|---|---:|
| Righe Noco (partecipazioni) | 27.844 |
| Collegamenti attuali con codice opera Noco | 25.170 |
| **Noco assenti dal sistema attuale** | **2.676** (9,6%) |
| Codici Noco nel sistema attuale che Noco non ha più | 2 |
| Collegamenti attuali **senza** codice Noco (lavoro post-migrazione) | **3.258** — **non toccare** |
| Titoli+anno+stagione/episodio unici tra i mancanti | 1.233 |
| Titoli+anno unici tra i mancanti | 756 |
| Artisti con perdita **totale** del repertorio Noco | 9 |
| Artisti con perdita **parziale** | 140 |

Elenco per artista: file CSV allegato.

#### Perdita totale (repertorio Noco = 0 nel sistema attuale)

| Artista | Righe Noco |
|---|---:|
| LASARDO ROBERT ALFRED | 193 |
| GRAHAM CURRIE JT | 30 |
| (riga Noco senza artista) | 24 |
| CENCIOTTI DANIELA | 2 |
| CASTRONUOVO, CELLINI, GRILLO, MANCIAGLI, PERRELLA | 1 ciascuno |

Il «CURRIE GRAHAM» segnalato a giugno è **GRAHAM CURRIE JT** in Noco (cognome `GRAHAM`). Per questo non era stato trovato in anagrafica.

#### Perdita parziale (prime voci)

| Artista | Noco | Mancanti | % |
|---|---:|---:|---:|
| THOVEZ MARINA | 3.641 | 549 | 15% |
| THERMES STEFANO | 1.734 | 153 | 9% |
| FARGAS JUAN ANTONIO | 233 | 120 | 52% |
| PARÈ MICHAEL | 269 | 107 | 40% |
| BROWNING CHRISTOPHER JAY | 134 | 105 | 78% |
| PARDEILHAN FRANCIS MICHAEL | 156 | 105 | 67% |
| MARCIANO DAVID | 247 | 104 | 42% |
| THERMES VITTORIO | 551 | 58 | 11% |
| DE STEPHANIS BRUNO | 151 | 49 | 33% |
| CASTELNUOVO FRANCESCO | 87 | 31 | 36% |
| SEAGAL STEVEN | 79 | 23 | 29% |

Questi numeri confermano le segnalazioni di giugno e le allargano: non sono poche eccezioni.

### 4.3 Manuale d’Amore / Danilo Mattei

Stato **attuale**, non ipotesi:

| Fonte | 2005 | 2011 |
|---|---|---|
| Noco | *Manuale d’Amore* — Andreucci, Snel. **Mattei non c’è.** | *Manuale d’Amore* — **solo Mattei** |
| Sistema attuale | *Manuale d’Amore* — Andreucci, Snel **e Mattei** | *Manuale D’Am3re* — Mattei |

I due film **esistono entrambi** (non sono accorpati in un solo record). L’errore rimasto è l’**associazione artista**: Mattei è anche sul 2005, dove Noco non lo ha. Rakuten 2025 può individuarlo sul 2005 per similarità di titolo.

Manca inoltre, nel sistema attuale, **Il mio West (1998)** di Mattei.

Azione puntuale, indipendente dal ripristino di massa: togliere Mattei dal 2005; reimportare *Il mio West*.

---

## 5. Come ovviare sul catalogo

Obiettivo: **correttezza Noco + integrazioni AGCOM**. Non si può «ripristinare Noco e basta» (si perdono 3.258 collegamenti e 22 artisti). Non si può «lasciare solo il catalogo attuale» (restano 2.676 buchi).

### Approccio A — Noco come base, poi reinserire AGCOM

Si reimporta Noco, poi si riapplicano i collegamenti e gli artisti nati dopo la migrazione.

- Pro: massimo allineamento a Noco.
- Contro: possono riaffiorare duplicati o correzioni già fatte sul catalogo nuovo. Serve un elenco di eccezioni.

### Approccio B — riconciliazione a tre vie (raccomandato)

Per ogni riga:

1. **Solo in Noco** → ripristino automatico (opera / episodio / collegamento artista).
2. **Solo nel sistema attuale, senza codice Noco** → **si tiene** (AGCOM).
3. **In entrambi ma diverso** (titolo, anno, artista) → coda di revisione, niente sovrascrittura cieca.
4. **Due film con titolo simile e anni diversi** (Manuale 2005 vs 2011) → si tengono distinti; si stacca l’artista dal film sbagliato.

Nessuno deve rivedere 20.000 record: i 2.676 ripristini sono automatici; la coda è solo il residuo ambiguo.

### Approccio C — solo confronto a video, ripristino a mano

Sicuro ma incompatibile con «non vogliamo rivedere 20.000 record». Utile **sopra** B, non al posto di B.

**Raccomandazione:** B, con A come piano B se il ripristino selettivo non copre i casi a perdita totale (LASARDO, GRAHAM CURRIE).

Vincoli:

- non cancellare i collegamenti nati dopo la migrazione;
- non cancellare i 22 artisti nuovi;
- ripristino ripetibile sulla chiave opera Noco;
- report prima/dopo per artista (stesso CSV allegato);
- i tre titoli Sky non aspettano il ripristino: il matcher si corregge a parte.

---

## 6. Ordine di lavoro proposto (da confermare in incontro)

1. **Nuova regola di matching per le serie** (problema A) — sblocca Sky/Rakuten senza toccare il catalogo.
2. **Correzioni puntuali** — Mattei fuori dal 2005; *Il mio West*; LASARDO e GRAHAM CURRIE (perdita totale).
3. **Ripristino selettivo** delle 2.676 (approccio B), report per artista.
4. **Rilancio campagne** solo dopo il punto 1 (e, per i repertori ripristinati, dopo 2–3).
