# Template episodi: tconst, alias titoli e round-trip update

**Data:** 2026-11-03  
**Stato:** Design approvato (approccio 1)

## Contesto

Il template “Scarica template episodi” non include `imdb_tconst`, quindi va reinserito a mano. Sui film il catalogo ha titolo italiano, titolo originale e titoli alternativi (`alias_titoli[]`); sugli episodi esistono già italiano/originale/`tconst`, ma manca un campo alias e l’import **ignora** le righe già presenti (solo insert).

## Decisioni

| Tema | Scelta |
|------|--------|
| Flusso | Round-trip completo: template arricchito + insert nuovi + **update** esistenti |
| Alias | Array `alias_titoli TEXT[]` su `episodi`, come `opere.alias_titoli` |
| Celle vuote in update | Non toccare il DB (patch solo campi valorizzati) |
| Matching | Nessuna modifica al matcher in questo intervento (campo predisposto per dopo) |
| Implementazione | Estendere l’import episodi esistente (preview/confirm), non un secondo flusso |

## Schema

- Migrazione: `ALTER TABLE public.episodi ADD COLUMN IF NOT EXISTS alias_titoli text[];`
- Commento: titoli alternativi / alias dell’episodio, analoghi a `opere.alias_titoli`; non usati dal matcher in questo intervento.
- Tipi Supabase / select query episodi: includere `alias_titoli`.
- Campi già esistenti invariati: `titolo_episodio`, `titolo_episodio_originale`, `imdb_tconst`, durata, data, ISAN.

## Template e parsing

Header (ordine):

`Stagione | Episodio | Titolo italiano | Titolo originale | Titoli alternativi | IMDb tconst | Durata (minuti) | Data prima messa in onda`

- Export: precompila anche `alias_titoli` (join `, `) e `imdb_tconst` dagli episodi caricati.
- Retrocompatibilità: file senza le colonne nuove restano validi; colonna legacy `Titolo` → titolo italiano (come oggi).
- `Titoli alternativi`: split su virgola, trim, drop pezzi vuoti → `string[]`.
- `IMDb tconst`: stringa trimmatata; nessun vincolo di formato obbligatorio.
- ISAN non entra nel template (resta solo in form).

## Classificazione e persistenza

Chiave riga: `(numero_stagione, numero_episodio)`.

| Caso | Esito |
|------|--------|
| Episodio assente in catalogo, stagione/episodio validi | `valid` → **insert** (altri campi opzionali, anche tutti vuoti) |
| Episodio già presente, stagione/episodio validi | `valid` → **update** (non più skip automatico) |
| Duplicato nel file / errori parsing | `skipped` (come oggi) |

Ogni riga `valid` espone un’azione esplicita `insert` | `update` usata da preview, confirm e summary.

### Update parziale

- Campo valorizzato → aggiorna quel campo.
- Campo vuoto → lascia invariato il valore in DB.
- Alias: cella valorizzata **sostituisce** l’intero array; cella vuota non tocca gli alias esistenti.
- Stagione/episodio sono solo chiave di matching, non campi aggiornabili via file.
- Riga `update` con patch vuota (tutti i campi opzionali vuoti): resta includibile; in confirm **nessun UPDATE** e non incrementa `updated`.
- Insert: come oggi, con in più `imdb_tconst` e `alias_titoli` se presenti nel draft.

### Store / API

- Estendere `EpisodiImportStore` con `updateEpisode(patch)` oltre a `insertEpisode`.
- Route `/api/opere/[id]/episodi/import`: implementare update via client autenticato.
- Summary confirm: conteggi separati `imported` e `updated`.
- Fallimento insert/update su una riga: quella riga → `skipped` con messaggio; le altre proseguono (stesso pattern insert attuale per errori non-auth).

## UI

- Dialog Aggiungi / Modifica episodio: campo **Titoli alternativi** (virgola), sotto titolo originale; `tconst` già presente.
- Lista episodi: mostrare alias se presenti, senza redesign della tabella.
- Preview import: colonne editabili + `Titoli alternativi` + `IMDb tconst`; copy che distingue nuovo vs aggiornamento; testo dialog: celle vuote non cancellano.

## Fuori scope

- Uso di `episodi.alias_titoli` nel matching programmazioni
- Rinumero stagione/episodio via file
- Cancellazione episodi via file
- Colonna ISAN nel template
- Cambio form/matching film

## Verifica

- Unit: template header/valori; classify esistente→update; vuoto→no patch; legacy senza colonne nuove; confirm chiama update con soli campi valorizzati.
- UI smoke: colonne preview + campo form add/edit.
- Nessun test matcher.
