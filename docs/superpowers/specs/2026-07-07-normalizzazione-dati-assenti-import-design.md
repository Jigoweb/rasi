# Normalizzazione globale dati assenti (import programmazioni)

**Data:** 2026-07-07
**Stato:** Design approvato (in attesa review spec)

## Problema

Nel flusso di import programmazioni, la gestione dei marcatori di "dato assente"
(`N.D.`, `N/A`, `null`, trattino `-`/`--`) è oggi esposta come quattro **transform
per singola colonna** nel MappingWizard:

- `null_if_NA` — Vuoto se "N/A"
- `null_if_ND` — Vuoto se "N.D."
- `null_if_NULL_str` — Vuoto se "null"
- `null_if_dashes` — Vuoto se trattini

È ridondante e fragile: questi token sono convenzioni **universali** di dato
mancante, non specificità di un emittente. Vanno normalizzati sempre e ovunque a
cella vuota (lo standard del nostro DB), senza chiedere all'utente di attivarli
colonna per colonna né emittente per emittente.

## Obiettivo

Applicare la normalizzazione dei dati assenti **globalmente e a monte**, con un set
di marcatori fisso valido per tutti gli emittenti e tutte le colonne. Rimuovere del
tutto i quattro transform `null_if_*`. Nessuna UI, nessuna configurazione.

## Decisioni prese (brainstorming)

1. **Ambito:** globale, non per-emittente. Set di marcatori **fisso** in codice.
   Niente config `absent_data`, niente card nel wizard.
2. **Campi:** la regola si applica a **tutti** i campi, incluso `titolo`. Una riga
   con `titolo` uguale a un marcatore (es. `N/A`) è spazzatura e va scartata
   (titolo obbligatorio → riga saltata). Il rischio teorico opposto — un'opera
   realmente intitolata "Null"/"NA" — è considerato inesistente nel dominio.
3. **Punto di applicazione:** in fase di **apply** del mapping, non al parse del
   file. La riga raw resta intatta perché serve all'hash `import_row_uid` (dedup).
4. **Transform legacy:** rimossi del tutto dal registry. **Nessuna migrazione**:
   esiste un solo `null_if_*` configurato (campo `regia`, emittente TIMVISION TVOD),
   che verrà rimappato a mano. Riferimenti residui → no-op (accettato).

## Contesto tecnico

Esistono **due** path di apply del mapping, entrambi da aggiornare:

- **Client** — `applyMapping` in
  `src/features/programmazioni/services/import-mapping.service.ts` (path non-worker
  in `useProgrammazioniUpload.ts`).
- **Server/worker** — `applyConfiguredMapping` in
  `server/src/jobs/programmazioni-import-core.ts` (modalità worker Railway; il suo
  `applyTransform` è una versione string-based semplificata già divergente dal
  registry client — va ripulito insieme).

`src/features/programmazioni/utils/` non è importabile da `server/src` (build
separata, import `.js`): il codice condiviso va **duplicato**, come già per
`episode-normalization` e `year-import`.

## Design

### 1. Set marcatori (costante)

Match sempre su **cella intera, trimmed, case-insensitive**, mai sottostringa.

| Token | Note |
|-------|------|
| `n/a`, `na` | |
| `n.d.`, `n.d`, `nd` | |
| `null` | |
| `-`, `--` | trattino singolo/doppio a cella intera |

La **cella vuota / whitespace** NON è nel set: resta gestita da `coerce` (stringa
vuota → `undefined` → campo omesso).

### 2. Matcher condiviso

Nuovo modulo puro `absent-data.ts`, duplicato in:

- `src/features/programmazioni/utils/absent-data.ts`
- `server/src/lib/absent-data.ts`

API:

```ts
/** Token che indicano un dato assente, in forma normalizzata (trimmed, lowercase). */
export const ABSENT_MARKERS: ReadonlySet<string>

/** True se il valore raw è un marcatore di dato assente (match cella intera). */
export function isAbsentMarker(value: unknown): boolean
```

- Valori non-stringa → `false` (il match è su testo).
- Test unitari su entrambe le copie: ogni token, varianti case/spazi, sottostringhe
  (es. "The N/A Story" → `false`), non-stringa → `false`.

### 3. Integrazione apply

In **entrambi** i path, applicare al valore raw **prima** del transform per-colonna:

```
rawValue → (isAbsentMarker(rawValue) ? null : rawValue) → applyTransform → coerce
```

Marcatore → `null` → `coerce` produce `undefined` → campo omesso (per `titolo`
obbligatorio → riga scartata). Comportamento identico agli attuali `null_if_*`, ma
sempre attivo e su tutte le colonne.

- **Client** `applyMapping`: dopo aver risolto `rawValue`/`sourceCol`, prima di
  `applyTransform`.
- **Server** `applyConfiguredMapping`: stesso punto, prima del suo `applyTransform`.

### 4. Interazione con le regole coalesce

`resolveFieldValueWithSource` (client e server) usa `isBlankValue` per scegliere la
prima sorgente non-vuota. Il blank-check diventa **vuoto-oppure-marcatore**, usando
lo stesso `ABSENT_MARKERS`, così un marcatore nella sorgente #1 fa correttamente
cadere la scelta sulla #2.

Questo sostituisce l'attuale set hardcoded `['', 'n.d.', 'n.d', 'nd', 'na', 'n/a']`
in `isBlankValue`, allineandolo al set completo (aggiunge `null`, `-`, `--`).

### 5. Pulizia registry

- Rimuovere `null_if_NA`, `null_if_ND`, `null_if_NULL_str`, `null_if_dashes` da:
  - `TransformName` (union)
  - `TRANSFORMS`
  - `TRANSFORM_LABELS`
  - `GENERIC_TRANSFORMS`
- Server `programmazioni-import-core.ts`: rimuovere il ramo `name.startsWith('null_if')`
  da `applyTransform`.
- Nessuna modifica alla UI del wizard: nessun campo `null_if_*` da mostrare, nessuna
  card nuova da aggiungere.
- Nessuna migrazione DB. Config esistenti con `null_if_*` in `transforms`:
  `isKnownTransform` → `false` → transform ignorato (no-op). Accettato.

### 6. Test

- `absent-data.test.ts` (client + server): `isAbsentMarker`.
- `transforms.test.ts`: rimuovere/aggiornare i test che referenziano i 4 transform.
- `import-mapping.service`: nuovi test `applyMapping` per marcatore→campo omesso,
  marcatore su `titolo`→riga scartata, e coalesce fall-through con marcatore.
- Server core: test analogo per `applyConfiguredMapping`.

## Fuori scope

- Override per-emittente di marcatori extra (long tail): YAGNI, si aggiungerà solo
  se un emittente reale userà un marcatore non standard.
- Riallineare le altre divergenze `applyTransform` client vs server (date/durate
  string-based sul worker): pre-esistente, non toccato qui.
- Cella vuota / whitespace: già coperta da `coerce`.
- `ParserConfigV2` / `applyMappingWithTransforms`: morti in produzione, non toccati.
