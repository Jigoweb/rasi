# Filtri segnali di matching (export Excel + app)

**Data:** 2026-09-10  
**Stato:** Implementato (MVP)  
**Branch di riferimento:** `cursor/matching-signals-filter-design-7051`

## Problema

Nella revisione delle individuazioni l’operatore vede già evidenze di matching nel
drawer (titolo, anno, regia, episodio), derivate da `dettagli_matching`. Però:

1. L’**export Excel/CSV** non espone questi segnali in forma filtrabile.
2. La **lista in app** non permette di filtrare per evidenza (es. solo “regia
   incoerente” o “anno fuori tolleranza”).
3. I badge “motivo revisione” in tabella sono grezzi rispetto al catalogo già
   mappato in `matching-details.ts`.

L’operatore vuole lavorare i risultati (in Excel e in app) filtrando ed eliminando
i record incoerenti in base alle casistiche già tracciate dal motore.

## Obiettivo

MVP unico che:

- aggiunge all’export colonne `SI`/`NO` per ogni segnale **problematico**;
- aggiunge in app un multi-select segnali con toggle **OR / AND** (default OR);
- riusa **una sola tassonomia** per export, filtri server-side e badge in tabella;
- **non** modifica il matcher SQL né lo schema DB in questa fase.

## Decisioni prese (brainstorming)

1. **Semantica multi-segnale:** toggle OR (“almeno uno”) e AND (“tutti”); default **OR**.
2. **Excel:** una colonna `SI`/`NO` per segnale (niente sola colonna testo, niente
   riassunto obbligatorio in MVP).
3. **Catalogo:** solo segnali problematici (`risk` / `warning`), non i positivi.
4. **Rilascio:** export + filtri app nello stesso MVP.
5. **Architettura:** presentation layer con catalogo codici stabile + query JSONB;
   colonna materializzata / indici solo come follow-up se le performance non bastano.

## Contesto tecnico

- Payload: `individuazioni.dettagli_matching` (JSONB), scritto dal matcher
  (`db/init/03_matching_functions.sql` e migration successive).
- Traduzione UI esistente: `src/features/individuazioni/utils/matching-details.ts`
  (`buildMatchingSignals`, `buildMatchingReviewContext`).
- Export: `src/features/individuazioni/services/individuazioni-export.service.ts`
  (`getIndividuazioniForExport`, `formatIndividuazioniForExport`).
- Lista dettaglio: `useIndividuazioneDetail` + `getIndividuazioniByCampagna`
  (filtri attuali: search, stato, sort, groupBy).
- Tabella: badge motivo via `getReviewReasons` in `IndividuazioniDetailTable.tsx`
  (oggi limitati a episodio / stato).

`dettagli_matching` **non** è oggi selezionato nell’export: va incluso nella select
paginata e passato al formatter.

## Design

### 1. Catalogo segnali (fonte unica)

Nuovo modulo tipizzato, es.:

`src/features/individuazioni/utils/matching-signal-codes.ts`

Responsabilità:

- definire i codici stabili MVP;
- esporre label Excel/filtro in italiano;
- esporre `extractMatchingSignalFlags(dettagli_matching): Record<Code, boolean>`
  (e helper lista codici attivi);
- essere l’unica fonte di verità per export, query filter e badge.

| Codice | Label (Excel / filtro) | Regola `true` (da `dettagli_matching`) |
|--------|------------------------|----------------------------------------|
| `titolo_debole` | Titolo debole | blocco `titolo` presente e score similarità in fascia risk/warning (`< 70`, stessa soglia di `getSimilarityTone`) |
| `titolo_originale_debole` | Titolo originale debole | blocco `titolo_originale` presente e score `< 60` |
| `anno_scostamento` | Anno con scostamento | `anno.differenza > 0` e `anno.hard_scarto !== true` |
| `anno_fuori_tolleranza` | Anno fuori tolleranza | `anno.hard_scarto === true` |
| `regia_incoerente` | Regia incoerente | `regia.penalita === true` **oppure** score regia `< 0` |
| `episodio_mancante` | Episodio mancante | `episodio_mancante === true` (top-level o `totale.episodio_mancante`) |
| `episodio_da_verificare` | Episodio da verificare | `episode_normalization_fallback.confidence === 'review_required'` **oppure**, quando i campi riga sono disponibili, codice episodio emittente da review (stessa regola di `getEpisodeNormalizationLabel`: stagione assente e `numero_episodio > 200`) **salvo** normalizzazione già confermata (`confidence === 'high'`), e **non** già coperto da `episodio_mancante` |

Note:

- Codici **immutabili** una volta rilasciati (label UI possono cambiare).
- Assenza del blocco / score → `false` (non errore).
- Score titolo/titolo originale in JSONB sono già in scala 0–100
  (`ROUND(similarity * 100)` nel matcher); le soglie 70/60 coincidono con
  `getSimilarityTone` in `matching-details.ts`.
- `extractMatchingSignalFlags` accetta `dettagli_matching` e, opzionalmente,
  campi riga episodio per allineare export/badge/filtri alla tabella attuale.
- I segnali `ok` / `neutral` restano nel drawer di revisione, **fuori** da export e
  filtri MVP.
- Mutua esclusione soft: se `episodio_mancante` è `true`, non impostare anche
  `episodio_da_verificare` (evita doppio filtro sullo stesso caso).

### 2. Export Excel / CSV

In `getIndividuazioniForExport`:

- aggiungere `dettagli_matching` alla select (già serve per i flag).

In `formatIndividuazioniForExport`:

- per ogni codice del catalogo, aggiungere una colonna con header = label italiana
  e valore `SI` | `NO`;
- posizionare le colonne dopo i campi già allineati a UI (artista, opera matchata,
  match %, …), in ordine fisso del catalogo.

Niente dump JSON grezzo. Nessuna colonna riassuntiva in MVP.

### 3. Filtri in app

UI (dettaglio campagna individuazione):

- multi-select “Segnali di matching” con le label del catalogo;
- toggle **Almeno uno (OR)** / **Tutti (AND)**; default OR;
- reset insieme agli altri filtri;
- empty state dedicato se il filtro non produce righe.

Comportamento:

- i filtri segnale si **combinano** con search / stato / sort esistenti;
- applicazione **server-side** in `getIndividuazioniByCampagna` (e count correlato),
  non solo sulle righe già caricate dallo scroll infinito;
- URL/query-string: utile ma **non obbligatorio** in MVP (stato React come gli
  altri filtri va bene).

Query:

- mappare ogni codice a predicati PostgREST/JSONB coerenti con
  `extractMatchingSignalFlags`;
- OR = unione dei predicati dei codici selezionati;
- AND = intersezione;
- selezione vuota = nessun vincolo segnale.

Se le performance su campagne molto grandi risultano insufficienti, follow-up
documentato: colonna generata / `text[]` di codici + indice GIN (fuori da questo MVP).

### 4. Badge tabella (slice leggero, stesso MVP)

Allineare `getReviewReasons` (o helper condiviso) ai codici problematici attivi,
così lista / filtro / export usano le stesse etichette. Mantenere i badge esistenti
di stato quando non ci sono segnali.

### 5. Test

- Unit: `extractMatchingSignalFlags` (casi edge: payload vuoto, solo hard scarto,
  regia penalità, episodio mancante, fallback review).
- Unit: `formatIndividuazioniForExport` espone `SI`/`NO` corretti.
- Unit/integration leggera: builder predicati filtro OR vs AND (o test del service
  con mock query se già nel pattern del repo).
- Regressione: export esistente (match %, opera) resta invariato nei campi già
  coperti.

## Fuori scope

- Modifiche al motore di matching SQL.
- Migrazioni schema / indici dedicati / backfill.
- Filtri su segnali positivi.
- Bulk delete “elimina filtrati” dedicato (restano azioni bulk / workflow Excel).
- Colonna riassuntiva Excel.

## Criteri di successo

1. Stesso record → stessi flag `SI`/`NO` in Excel e stessa presenza nei filtri/badge app.
2. OR = unione; AND = intersezione; default OR.
3. Payload incompleto / assente → tutte `NO`, nessun crash.
4. Filtri segnale funzionano su tutta la campagna (server-side), non solo sulla pagina caricata.
5. Test automatici del catalogo e dell’export verdi.

## Rischi e mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Divergenza drawer vs filtri | Catalogo unico; soglie copiate da `matching-details` |
| JSONB lento su campagne enormi | Misurare; follow-up materializzazione se necessario |
| Campagne storiche con shape diversa | Default `false`; test su payload minimi |
| Header Excel lunghi | Label corte italiane fisse |

## Piano di implementazione

Da scrivere in `docs/superpowers/plans/` **dopo** review/approvazione di questa
spec, con task TDD piccoli (catalogo → export → filtri service → UI → badge).
