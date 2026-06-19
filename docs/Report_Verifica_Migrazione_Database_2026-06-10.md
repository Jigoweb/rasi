# Report di Verifica Migrazione Database
**RASI – Repertorio Artisti**  
Data: 10 giugno 2026  
Oggetto: Confronto dati MySQL (precedente database) → PostgreSQL (database attuale)

---

## Premessa

A seguito della segnalazione del cliente relativa a possibili lacune nel repertorio degli artisti, è stato effettuato un confronto sistematico tra il database MySQL originale (accessibile tramite NocoDB) e il database PostgreSQL attuale (Supabase). L'analisi ha coperto le tabelle **artisti** e **opere/partecipazioni**.

---

## Metodologia

Il confronto è stato eseguito su due livelli:

1. **Artisti con codice IPN provvisorio (`IPN_XXX`)** — artisti importati direttamente dal vecchio database con identificativo numerico progressivo interno.
2. **Artisti con codice IPN definitivo (es. `11654827`)** — artisti per cui il codice IPN SIAE è già stato attribuito.

Per ogni artista è stato confrontato il numero di **partecipazioni** (collegamenti artista→opera) presenti nel vecchio database con quelle presenti nell'attuale Supabase.

---

## Risultati: Artisti con codice IPN provvisorio

Degli **667 artisti** con codice IPN provvisorio presenti nel database attuale:

| Situazione | N. artisti |
|---|---|
| Artisti con partecipazioni regolarmente migrate | 325 |
| Artisti **senza** partecipazioni in Supabase | 342 |

Di questi 342 artisti senza opere:

| Causa | N. artisti | Note |
|---|---|---|
| **Assenza di opere anche nel vecchio DB** | 337 | Mandanti registrati ma senza repertorio — migrazione corretta |
| **Opere presenti nel vecchio DB ma non migrate** | **5** | **Dati persi** |

### Dettaglio dei 5 artisti con dati persi

| Artista | Opere nel vecchio DB | Opere in Supabase | Mancanti |
|---|---|---|---|
| **LASARDO ROBERT ALFRED** | **193** | 0 | **193** |
| CIRRILLO LUCIANA | 2 | 0 | 2 |
| CARTA MANRICO | 1 | 0 | 1 |
| CIRILLI VINCENZO | 1 | 0 | 1 |
| POLI CAPPELLI CRISTIANO | 1 | 0 | 1 |

**Totale opere perse (IPN provvisorio): 198**

> **Nota:** Il caso LASARDO è quello più critico con 193 opere completamente assenti. Si raccomanda verifica e reimportazione prioritaria.

---

## Risultati: Artisti con codice IPN definitivo

Degli **80 artisti** con codice IPN definitivo:

| Situazione | N. artisti |
|---|---|
| Numero di opere identico tra vecchio DB e Supabase | **46** |
| Supabase ha **meno** opere del vecchio DB | **30** |
| Supabase ha **più** opere del vecchio DB | 4 *(opere aggiunte successivamente alla migrazione)* |

### Dettaglio artisti con opere mancanti in Supabase (delta > 0)

| Artista | IPN | Vecchio DB | Supabase | **Mancanti** |
|---|---|---|---|---|
| DE STEPHANIS BRUNO | 11654859 | 151 | 104 | **47** |
| CASTELNUOVO FRANCESCO | 11654844 | 87 | 57 | **30** |
| THERMES VITTORIO | 11654902 | 551 | 536 | **15** |
| DI CARMINE MAURIZIO | 11654860 | 60 | 46 | **14** |
| DAVITIAN KENNETH | 11654856 | 116 | 103 | **13** |
| CECCACCI ROBERTO | 11654846 | 61 | 50 | **11** |
| THERMES MARCELLO | 11654901 | 28 | 17 | **11** |
| OLMI CORRADO | 11654886 | 71 | 62 | **9** |
| DI QUILIO GIULIA | 11654863 | 34 | 25 | **9** |
| GIOIELLI LORENZO | 11654876 | 105 | 97 | **8** |
| BARBERO FRANCO | 11654827 | 171 | 165 | **6** |
| DI NICOLA MARIA CRISTINA | 11654862 | 26 | 20 | **6** |
| SPEDALIERE CLAUDIA | 11654898 | 8 | 4 | **4** |
| MANTELLI FRANCA | 11654881 | 31 | 28 | **3** |
| TANO ROCCO | 11654900 | 555 | 553 | **2** |
| CASTELLUCCIO FEDERICO | 11654843 | 82 | 80 | **2** |
| DUJANI CARLA | 11654865 | 40 | 38 | **2** |
| CAMPESE RENATO | 11654840 | 22 | 20 | **2** |
| COCI FRANCESCO | 11654851 | 15 | 13 | **2** |
| GIGLI SILVIA | 11654875 | 9 | 7 | **2** |
| BELOCCHI MARCO | 11654829 | 19 | 18 | 1 |
| PACE PAOLA | 11654888 | 9 | 8 | 1 |
| DI LUZIO GABRIELLA | 11654861 | 7 | 6 | 1 |
| BUTI MARCO | 11654837 | 6 | 5 | 1 |
| GENTILE GAETANO | 11654873 | 5 | 4 | 1 |
| CERACCHI SARA | 11654847 | 4 | 3 | 1 |
| PISELLI MARIA LUISA | 11654891 | 3 | 2 | 1 |
| PAGANINI ALFONSO | 11654889 | 3 | 2 | 1 |
| FERRARO VALENTINO | 11654869 | 2 | 1 | 1 |
| CROCCOLO CARLO | 11654854 | 2 | 1 | 1 |

**Totale opere mancanti (IPN definitivo): 208**

### Artisti con più opere in Supabase che nel vecchio DB

Questi artisti hanno ricevuto integrazioni manuali o da altre fonti successivamente alla migrazione:

| Artista | Vecchio DB | Supabase | Opere aggiunte |
|---|---|---|---|
| ORLANDO ILARIA | 39 | 72 | +33 |
| BIONDI LYDIA | 111 | 129 | +18 |
| CAMPAGNOLA CLAUDIA | 14 | 15 | +1 |
| BADESCU RAMONA | 72 | 73 | +1 |

---

## Riepilogo Generale

| Categoria | Opere mancanti |
|---|---|
| Artisti IPN provvisorio — repertorio non migrato | **198** |
| Artisti IPN definitivo — repertorio parzialmente migrato | **208** |
| **TOTALE COMPLESSIVO** | **406** |

---

## Osservazioni

- La maggior parte degli artisti "orfani" (337 su 342) erano già privi di opere nel vecchio database: si tratta di mandanti registrati in anagrafica ma senza titoli. La migrazione per questi soggetti è **corretta**.
- I **406 collegamenti mancanti** sono distribuiti su **35 artisti** (5 IPN provvisori + 30 IPN definitivi).
- Il caso più rilevante in termini quantitativi è **LASARDO ROBERT ALFRED** (193 opere) per la categoria IPN provvisorio, e **DE STEPHANIS BRUNO** (47 opere) e **CASTELNUOVO FRANCESCO** (30 opere) per gli artisti con IPN definitivo.
- Per 4 artisti il database attuale è **più completo** del vecchio: le opere in eccesso sono state verosimilmente inserite manualmente dopo la migrazione e non vanno toccate.

---

## Verifica Casi Segnalati dal Cliente (11 giugno 2026)

A seguito della risposta del cliente del 11/06/2026, è stato effettuato un controllo specifico sui 5 casi segnalati come "eclatanti".

### Confronto puntuale

| Artista | Vecchio DB (NocoDB) | Attuale (Supabase) | **Mancanti** | Segnalato dal cliente |
|---|---|---|---|---|
| BROWNING CHRISTOPHER JAY | 134 | 29 | **105** | 106 ✓ |
| LASARDO ROBERT ALFRED | 193 | 0 | **193** | 184 ✓ (~) |
| PARÈ MICHAEL | 269 | 167 | **102** | 102 ✓ |
| SEAGAL STEVEN | 79 | 56 | **23** | 24 ✓ |
| CURRIE GRAHAM | *non trovato* | *non trovato* | **?** | 13 |

> **Nota CURRIE GRAHAM:** L'artista non risulta presente né nel database attuale né nel vecchio database MySQL (ricerca per cognome e nome). È possibile che il nominativo sia registrato con una grafia differente. Si richiede verifica manuale sul vecchio archivio.

> **Nota LASARDO:** Piccola discrepanza (193 in NocoDB vs 184 segnalati): i 9 record di differenza potrebbero essere opere eliminate dal cliente tra la migrazione e oggi, oppure un diverso criterio di conteggio sul vecchio sistema.

### Conferma dell'analisi

I numeri del vecchio database **confermano le lacune segnalate dal cliente** per 4 artisti su 5, con corrispondenza quasi esatta. Questo dimostra che le opere erano presenti nel vecchio database MySQL ma non sono state trasferite correttamente in Supabase durante la migrazione.

### Chiarimento sulla prima analisi (report precedente)

Il cliente ha correttamente fatto notare che alcune discrepanze nel report precedente (es. DE STEPHANIS, CASTELNUOVO) sono il risultato di **pulizie repertoriali effettuate dopo la migrazione** e non di errori migratori. I 5 casi sopra indicati sono invece anomalie genuine della migrazione.

---

## Azioni Raccomandate

**Casi confermati dalla segnalazione cliente (priorità massima):**

1. **LASARDO ROBERT ALFRED** — 193 opere in vecchio DB, 0 in Supabase. Recupero completo del repertorio.
2. **BROWNING CHRISTOPHER JAY** — 105 opere mancanti (134 → 29).
3. **PARÈ MICHAEL** — 102 opere mancanti (269 → 167).
4. **SEAGAL STEVEN** — 23 opere mancanti (79 → 56).
5. **CURRIE GRAHAM** — artista non trovato in nessun database. Verificare grafia alternativa sul vecchio archivio cartaceo o nel sistema SIAE.

**Per ciascun artista:** estrarre dal vecchio DB la lista completa dei titoli mancanti, confrontarla con Supabase, e procedere all'inserimento nelle tabelle `opere`, `episodi` e `partecipazioni`.

**Nota sugli altri artisti del report precedente:** le discrepanze per artisti come DE STEPHANIS, CASTELNUOVO e altri (totale ~208 opere) sono da considerarsi in parte riconducibili a pulizie repertoriali post-migrazione. Richiedono una verifica caso per caso da parte del cliente prima di qualsiasi reimportazione.

---

*Report generato da analisi automatica — confronto effettuato su tutti i 27.844 record del vecchio database MySQL e i 26.950 record del database PostgreSQL attuale.*
