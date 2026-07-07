# Normalizzazione dati assenti per emittente (import programmazioni)

**Data:** 2026-07-07
**Stato:** Design approvato (in attesa review spec)

## Problema

Nel MappingWizard dell'import programmazioni, la gestione dei marcatori di "dato
assente" (`N.D.`, `N/A`, `null`, trattino `-`/`--`) è oggi esposta come quattro
**transform per singola colonna**:

- `null_if_NA` — Vuoto se "N/A"
- `null_if_ND` — Vuoto se "N.D."
- `null_if_NULL_str` — Vuoto se "null"
- `null_if_dashes` — Vuoto se trattini

Questo è ridondante e fragile: un emittente usa **sempre lo stesso standard** per
i dati assenti, quindi lo stesso marcatore andrebbe dichiarato una volta a livello
emittente anziché ripetuto colonna per colonna. Lo standard del nostro DB è la
**cella vuota**; qualunque altro token dell'emittente va normalizzato a vuoto.

## Obiettivo

Spostare la gestione dei dati assenti da transform per-colonna a una **policy unica
per emittente**, salvata nel mapping e applicata a **tutte** le colonne. Rimuovere
del tutto i quattro transform `null_if_*`.

## Decisioni prese (brainstorming)

1. **Modello marcatori:** preset + custom (checkbox per i comuni + campo libero per
   token extra dell'emittente).
2. **Transform legacy:** rimossi del tutto dal registry. **Nessuna migrazione /
   backfill**: attualmente esiste un solo `null_if_*` configurato (campo `regia`,
   emittente TIMVISION TVOD), che verrà rimappato a mano. I riferimenti residui in
   config esistenti diventano no-op (accettato).

## Contesto tecnico

Esistono **due** path di apply del mapping, entrambi da aggiornare:

- **Client** — `applyMapping` in
  `src/features/programmazioni/services/import-mapping.service.ts` (usato dal path
  non-worker in `useProgrammazioniUpload.ts`).
- **Server/worker** — `applyConfiguredMapping` in
  `server/src/jobs/programmazioni-import-core.ts` (usato in modalità worker
  Railway). Nota: il suo `applyTransform` è una versione string-based semplificata,
  già divergente dal registry client — va ripulito insieme.

Config del mapping: `emittenti.mapping_import` (`ImportMappingConfig`, version 1),
campi attuali `mapping` / `rules` / `transforms` / `year_fields`.

`src/features/programmazioni/utils/transforms.ts` non può essere importato da
`server/src` (build separata, import `.js`): il codice condiviso va **duplicato**,
come già avviene per `episode-normalization` e `year-import`.

## Design

### 1. Schema config

Aggiungere a `ImportMappingConfig` (copia client **e** copia server):

```ts
export type AbsentPreset = 'na' | 'nd' | 'null' | 'dash'

export interface AbsentDataPolicy {
  /** Gruppi preset attivi. */
  presets: AbsentPreset[]
  /** Token letterali extra (match trimmed, case-insensitive). */
  custom: string[]
}

// ImportMappingConfig.absent_data?: AbsentDataPolicy
```

Regole di match (sempre trimmed + case-insensitive):

| Preset | Match |
|--------|-------|
| `na`   | `n/a`, `na` |
| `nd`   | `n.d.`, `n.d`, `nd` |
| `null` | `null` |
| `dash` | `-`, `--` |

Custom: match esatto del token (trimmed, case-insensitive).

La **cella vuota / whitespace** NON fa parte della policy: resta gestita da
`coerce` come oggi (stringa vuota → `undefined` → campo omesso).

### 2. Matcher condiviso

Nuovo modulo puro `absent-data.ts`, duplicato in:

- `src/features/programmazioni/utils/absent-data.ts`
- `server/src/lib/absent-data.ts`

API:

```ts
export function makeAbsentMatcher(
  policy: AbsentDataPolicy | null | undefined
): (value: unknown) => boolean
```

- Ritorna un predicato che, dato un valore raw, dice se è un marcatore di assenza.
- Policy assente/vuota → predicato che ritorna sempre `false`.
- Non considera la cella vuota (compito di `coerce`); opera solo sui token
  dichiarati.

Test unitari su entrambe le copie (preset singoli, combinazioni, custom,
case/spazi, valori non-stringa → `false`).

### 3. Integrazione apply

In **entrambi** i path, costruire il matcher una volta per config e applicarlo al
valore raw **prima** del transform per-colonna:

```
rawValue → (matcher(rawValue) ? null : rawValue) → applyTransform → coerce
```

Se il valore è un marcatore → diventa `null` → `coerce` produce `undefined` → il
campo viene omesso dal payload (comportamento identico agli attuali `null_if_*`).

- **Client** `applyMapping`: dopo aver risolto `rawValue`/`sourceCol`, prima di
  `applyTransform`.
- **Server** `applyConfiguredMapping`: stesso punto, prima del suo `applyTransform`.

### 4. Interazione con le regole coalesce

`resolveFieldValueWithSource` (client e server) usa `isBlankValue` per scegliere la
prima sorgente non-vuota. Il blank-check diventa **vuoto-oppure-marcatore-emittente**,
così un marcatore nella sorgente #1 fa correttamente cadere la scelta sulla #2.

Questo **sostituisce** l'attuale set hardcoded `['', 'n.d.', 'n.d', 'nd', 'na',
'n/a']` in `isBlankValue` con la policy per-emittente. È un cambio di comportamento
deliberato: la rilevazione "blank" nelle regole ora segue i marcatori dichiarati
dall'emittente (più la cella vuota, sempre blank).

### 5. UI del wizard

Nuova card in **step 2**, a livello emittente (non per riga): **"Normalizzazione
dati assenti"**.

- 4 checkbox preset: `N/A`, `N.D.`, `null`, `- / --`.
- Input token custom (lista, es. separati da virgola/riga).
- Helper text: "Valori che indicano un dato mancante; verranno trattati come cella
  vuota per tutte le colonne di questo emittente."

Stato gestito in `MappingWizard` accanto a `mapping`/`rules`/`transforms`;
serializzato in `config.absent_data` in `handleSave` (omesso se preset e custom
sono entrambi vuoti).

Rimuovere i 4 `null_if_*` da `GENERIC_TRANSFORMS` così spariscono dal dropdown
per-colonna. `mojibake_repair` e `nbsp_to_space` restano transform per-colonna.

### 6. Pulizia registry

- Rimuovere `null_if_NA`, `null_if_ND`, `null_if_NULL_str`, `null_if_dashes` da:
  - `TransformName` (union)
  - `TRANSFORMS`
  - `TRANSFORM_LABELS`
  - `GENERIC_TRANSFORMS`
- Server `programmazioni-import-core.ts`: semplificare `applyTransform` togliendo il
  ramo `name.startsWith('null_if')`.
- Nessuna migrazione DB. Config esistenti con `null_if_*` in `transforms`:
  `isKnownTransform` → `false` → transform ignorato (no-op). Accettato.

### 7. Test

- `absent-data.test.ts` (client + server): matcher.
- `import-mapping.service` / `transforms.test.ts`: aggiornare i test che referenziano
  i 4 transform rimossi; nuovi test `applyMapping` per marcatore→campo omesso e per
  coalesce fall-through con marcatore.
- Server core: test analogo per `applyConfiguredMapping`.

## Fuori scope

- Riallineare le altre divergenze tra `applyTransform` client e server (date/durate
  string-based sul worker) — pre-esistente, non toccato qui.
- Gestione cella vuota / whitespace — già coperta da `coerce`.
- `ParserConfigV2` / `applyMappingWithTransforms` (morti in produzione, usati solo
  nei test).
