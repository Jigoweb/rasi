# Incontro: integrità catalogo e affidabilità individuazioni

**Data analisi:** 11 settembre 2026  
**Fonti:** NocoDB base `RASI dB` → source **Banca dati Rasi** (escluso RASI Fern); catalogo operativo Supabase progetto `rasi`.  
**Destinatari:** incontro in sede con il cliente.

Questo documento separa due problemi distinti che nell’email del cliente risultano accorpati. Confonderli porta a correzioni sbagliate.

---

## 1. In sintesi

Ci sono **due cause indipendenti**.

| # | Problema | Cosa succede | Esempi dell’email |
|---|---|---|---|
| A | **Matcher troppo permissivo sulle serie** | Se stagione+episodio del palinsesto non esiste in catalogo, il programma usa lo stesso numero episodio di **un’altra stagione** e/o il cast di tutta la serie. Lo snapshot mostra i numeri del palinsesto, non quelli del catalogo matchato. | FRINGE, HAWAII FIVE-0, YELLOWSTONE |
| B | **Catalogo incompleto / associazioni errate rispetto a Noco** | 2.676 partecipazioni Noco non sono in Supabase. Alcuni artisti hanno repertorio azzerato. In almeno un caso un artista è stato agganciato al film sbagliato. | LASARDO, CURRIE/GRAHAM, BROWNING, PARÈ, SEAGAL, Danilo Mattei / Manuale d’Amore |

Il catalogo Noco sui tre esempi Sky **è allineato a quanto scrive il cliente**. Quei falsi positivi non si risolvono “ripristinando Noco”: si risolvono cambiando la regola di matching.

Il buco di repertorio **sì** si risolve con un ripristino selettivo da Noco, **senza cancellare** le 3.258 partecipazioni e i 22 artisti aggiunti dopo la migrazione (lavoro AGCOM).

---

## 2. Cosa abbiamo confrontato (e cosa abbiamo ignorato)

Nella base NocoDB `RASI dB` convivono più sorgenti MySQL. Per questa analisi:

- **Usata:** source `Banca dati Rasi` — tabelle `Artisti` (750) e `Opere` (27.844).
- **Ignorata:** source `RASI Fern` (anagrafica Fern / audiovisivo / musica).
- **Non usate come verità catalogo:** source `rasi` (`newOpere`, `newArtisti`, …), IMDB, programmazioni.

In Noco la tabella `Opere` **non è un’opera unica**: ogni riga è una **partecipazione** (artista + titolo + eventuale S/E + ruolo). Per questo 27.844 righe Noco corrispondono, lato Supabase, a `partecipazioni` (non a `opere`).

Supabase oggi: **769 artisti**, **7.427 opere**, **26.736 episodi**, **28.428 partecipazioni**.

---

## 3. Problema A — matching serie (FRINGE, HAWAII FIVE-0, YELLOWSTONE)

### 3.1 Il catalogo, da Noco e da Supabase, dice la stessa cosa del cliente

**FRINGE** — 1 sola riga in Noco e in Supabase: St. 2 Ep. 2, John Smeallie Youngs.

**HAWAII FIVE-0** stagione 2 in catalogo: episodi 3, 4, 5, 23 (William Baldwin). Non ci sono S2E1 né S2E10. S5E10 esiste (Eric Roberts).

**YELLOWSTONE** stagione 3 in catalogo: episodi 1, 2, 4 con Michael Nouri. Vittorio Thermes è censito sulle stagioni **4 e 5**, non sulla 3.

Quindi: i palinsesti Sky 2022 hanno episodi che **il repertorio RASI non copre**. Il programma oggi li individua lo stesso.

### 3.2 Perché il programma li individua

Nella funzione SQL `match_programmazione_to_partecipazioni` (migration SKY gap A2):

1. Cerca S+E esatto.
2. Se fallisce, **accetta qualsiasi episodio con lo stesso numero**, anche di un’altra stagione (punteggio 0,75).
3. Se non c’è proprio quell’episodio, attribuisce il **cast distinto di tutta la serie**.
4. Lo snapshot dell’individuazione copia stagione/episodio **dal palinsesto**, non dal catalogo matchato.

Traduzione dei tre casi:

| Palinsesto | Catalogo | Cosa fa il matcher oggi |
|---|---|---|
| FRINGE S1E2, S3E2, … | solo S2E2 | ep-only → tutti gli E2 agganciati a S2E2; in lista sembra “E2 di tutte le stagioni” |
| HAWAII S2E1 / S2E10 | S2 ha 3/4/5/23; esiste S5E10 | S2E10 → S5E10 (Roberts); S2E1 → altra stagione o cast serie |
| YELLOWSTONE S3E3/5–10 | S3 ha 1/2/4 Nouri; Thermes è in S4E3/5–10 | ep-only → S3E3 matcha S4E3 (Thermes), e così via |

È un errore di **precisione**, non di similarità del titolo. Il titolo “YELLOWSTONE” è corretto; sbagliata è l’associazione episodio→artista.

### 3.3 Cosa proponiamo sul matcher (da approvare in incontro)

**Regola di default: precisione prima del richiamo.**

- Stagione e episodio noti: solo match **S+E esatto**. Altrimenti: **nessuna individuazione automatica**, solo alert “episodio non censito”.
- Ep-only solo se la stagione manca **e** quel numero episodio è unico in catalogo.
- Mai attribuire a un passaggio il cast di un altro episodio o di tutta la serie.
- In revisione, mostrare **S/E catalogo** accanto a **S/E palinsesto** quando differiscono.

Effetto atteso: FRINGE/HAWAII/YELLOWSTONE smettono di generare i falsi positivi segnalati. Calano le individuazioni automatiche su episodi non in repertorio (è voluto: oggi quelle righe sono diritti inesistenti).

Contratto eseguibile: `src/features/individuazioni/utils/episode-match-policy.ts` (policy `current` vs `proposed`, test sui tre casi).

Il porting SQL **non parte** finché questa regola non è approvata: alza la precisione e riduce il richiamo.

---

## 4. Problema B — differenze Noco vs catalogo attuale

Snapshot del 11/09/2026, chiave `id_mandante_rasi` / `id_opera` (staging).

### 4.1 Artisti

| | Noco | Supabase |
|---|---:|---:|
| Record | 750 | 769 |
| Con `id_mandante_rasi` | 750 | 747 |

- **3 in Noco assenti da Supabase:** ARTEVIVA ASSOCIAZIONE CULTURALE, PRO MUSIC INTERNATIONAL SRL, ASSOCIAZIONE PRELUDIO — produttori, 0 opere. Irrilevanti per le individuazioni.
- **22 in Supabase senza mandante Noco:** inseriti dopo la migrazione (Amelio, Di Gaspare, Marini, …). **Da conservare.**
- **0 extra con mandante** che Noco non abbia più.
- IPN allineati. Un solo scambio nome/cognome: Noco `ANGELA NOBILE` vs Supabase `NOBILE ANGELA` (mid 22).

**L’anagrafica artisti è sostanzialmente allineata.** Il problema segnalato sta nel **repertorio** (partecipazioni), non nei nominativi.

### 4.2 Partecipazioni / repertorio

| | Conteggio |
|---|---:|
| Righe Noco `Opere` (partecipazioni) | 27.844 |
| Partecipazioni Supabase con `metadati.id_opera_staging` | 25.170 |
| **Noco assenti da Supabase** | **2.676** (9,6%) |
| Staging Supabase non più in Noco | 2 |
| Partecipazioni Supabase **senza** staging (lavoro post-migrazione) | **3.258** — **non toccare** |
| Titoli+anno+S/E unici tra i mancanti | 1.233 |
| Titoli+anno unici tra i mancanti | 756 |
| Artisti con perdita **totale** del repertorio Noco | 9 |
| Artisti con perdita **parziale** | 140 |

Elenco per artista: `scripts/diagnostics/noco-vs-supabase-repertorio-mancante-2026-09-11.csv`.

#### Perdita totale (repertorio Noco = 0 in staging)

| Artista | Righe Noco |
|---|---:|
| LASARDO ROBERT ALFRED | 193 |
| GRAHAM CURRIE JT | 30 |
| (riga Noco senza artista) | 24 |
| CENCIOTTI DANIELA | 2 |
| CASTRONUOVO, CELLINI, GRILLO, MANCIAGLI, PERRELLA | 1 ciascuno |

Il “CURRIE GRAHAM” dell’email di giugno è **GRAHAM CURRIE JT** in Noco (cognome `GRAHAM`). Per questo non era stato trovato in anagrafica.

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

Questi numeri **confermano** le segnalazioni di giugno e le allargano: non sono “poche eccezioni”.

### 4.3 Manuale d’Amore / Danilo Mattei

Stato **attuale**, non ipotesi:

| Fonte | 2005 | 2011 |
|---|---|---|
| Noco | `MANUALE D'AMORE` — Andreucci, Snel. **Mattei non c’è.** | `MANUALE D'AMORE` — **solo Mattei** |
| Supabase | `MANUALE D'AMORE` — Andreucci, Snel **e Mattei** | `MANUALE D'AM3RE` — Mattei |

I due film **esistono entrambi** in Supabase (non sono più accorpati in un solo record). L’errore rimasto è l’**associazione artista**: Mattei è stato agganciato anche al 2005, dove Noco non lo ha. Rakuten 2025 può quindi individuarlo sul 2005 per similarità di titolo.

In Noco manca inoltre in Supabase **IL MIO WEST (1998)** di Mattei (opera assente).

Azione puntuale, indipendente dal ripristino di massa: togliere Mattei dal 2005; reimportare IL MIO WEST.

---

## 5. Come ovviare: tre approcci sul catalogo

Obiettivo del cliente: **correttezza Noco + integrazioni AGCOM**. Non si può “ripristinare Noco e basta” (si perdono 3.258 partecipazioni e 22 artisti). Non si può “lasciare solo Supabase” (restano 2.676 buchi).

### Approccio A — ripristino Noco come master, overlay AGCOM

Si reimporta Noco come base, poi si riapplicano le righe Supabase senza `id_opera_staging` / senza `id_mandante_rasi`.

- Pro: massimo allineamento a Noco.
- Contro: le pulizie volute sul catalogo nuovo (titoli duplicati, correzioni) possono riaffiorare. Serve un freeze e un elenco di eccezioni.

### Approccio B — riconciliazione a tre vie (raccomandato)

Per ogni riga Noco vs staging vs post-migrazione si classifica:

1. **Solo Noco** → restore automatico (`opere` / `episodi` / `partecipazioni`).
2. **Solo Supabase senza staging** → **keep** (AGCOM).
3. **In entrambi ma diverso** (titolo, anno, artista) → coda di revisione, non overwrite cieco.
4. **Omonimie titolo+anno** (Manuale 2005 vs 2011) → split / distacco artista, non merge.

Nessun operatore deve rivedere 20.000 record: i 2.676 restore sono automatici; la coda è solo il residuo ambiguo.

### Approccio C — solo UI di confronto, restore manuale

Sicuro ma incompatibile con “non vogliamo rivedere 20.000 record”. Utile **sopra** B, non al posto di B.

**Raccomandazione:** B, con A come piano B se il restore selettivo non copre i casi a perdita totale (LASARDO, GRAHAM CURRIE).

Vincoli:

- Non cancellare partecipazioni senza staging.
- Non cancellare i 22 artisti nuovi.
- Restore idempotente su `id_opera` Noco.
- Report prima/dopo per artista (stesso CSV di oggi).
- I tre titoli Sky non aspettano il restore: il matcher va corretto a parte.

---

## 6. Ordine di lavoro proposto (da votare in incontro)

1. **Matcher precisione serie** (problema A) — sblocca Sky/Rakuten senza toccare il catalogo.
2. **Correzioni puntuali** — Mattei fuori dal 2005; IL MIO WEST; LASARDO e GRAHAM CURRIE (perdita totale).
3. **Restore selettivo** delle 2.676 (approccio B), report per artista.
4. **Rilancio campagne** solo dopo 1 (e, per i repertori ripristinati, dopo 2–3).

---

## 7. Bozza di risposta al cliente

Oggetto: Individuazioni Sky / integrità banca dati — analisi e incontro

Buongiorno,

abbiamo analizzato gli esempi (FRINGE, HAWAII FIVE-0, YELLOWSTONE, Manuale d’Amore) confrontando la Banca dati Rasi su Noco con il catalogo attuale.

Sui tre titoli Sky il repertorio Noco e quello attuale coincidono con quanto indicate (FRINGE solo S2E2; HAWAII S2 solo 3/4/5/23; YELLOWSTONE S3 solo 1/2/4 con Nouri, Thermes dalle stagioni 4–5). Le individuazioni errate dipendono da una regola del programma che, se manca l’episodio esatto, usa lo stesso numero di un’altra stagione. Non è un problema di similarità del titolo. Proponiamo di spegnere questa regola: niente individuazione automatica se stagione+episodio non sono in catalogo.

Sul catalogo: l’anagrafica artisti è allineata (750 vs 769, i 22 in più sono inserimenti successivi). Il buco è nel repertorio: 2.676 collegamenti artista–opera presenti in Noco non sono nel sistema attuale (es. LASARDO 193/193, GRAHAM CURRIE 30/30, BROWNING 105, PARÈ 107, Thermes Vittorio 58). Le modifiche/inserimenti fatti dopo il trasferimento (oltre 3.200 collegamenti e 22 artisti) si possono conservare. Per Mattei: in Noco è solo su Manuale d’Amore 2011; nel sistema attuale risulta anche sul 2005 — associazione da rimuovere. Manca IL MIO WEST (1998).

In incontro vi proponiamo: (1) nuova regola di matching per le serie; (2) ripristino selettivo del repertorio Noco senza cancellare il lavoro AGCOM.

Restiamo a disposizione per la data in sede.

---

## 8. Materiali tecnici

- Policy eseguibile: `src/features/individuazioni/utils/episode-match-policy.ts`
- CSV gap per artista: `scripts/diagnostics/noco-vs-supabase-repertorio-mancante-2026-09-11.csv`
- Query di controllo: `scripts/diagnostics/catalog_integrity_reconciliation.sql`
- Spec: `docs/superpowers/specs/2026-09-11-integrita-catalogo-e-precisione-matching-design.md`
- Report migrazione giugno 2026: `docs/Report_Verifica_Migrazione_Database_2026-06-10.md` (parziale; questa analisi lo aggiorna)
