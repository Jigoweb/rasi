# Design: integrità catalogo Noco + precisione matching serie

**Data:** 2026-09-11  
**Stato:** Proposta per incontro cliente (non implementare il matcher SQL prima dell’approvazione)  
**Analisi live:** `docs/incontro-2026-09-integrita-catalogo-matching.md`

## Problema

Due sottosistemi indipendenti:

1. **Matcher serie** (`match_programmazione_to_partecipazioni`): fallback A2 ep-only con stagione nota + cast distinto di serie. Genera individuazioni su episodi non in repertorio (FRINGE, HAWAII FIVE-0, YELLOWSTONE).
2. **Catalogo vs Noco Banca dati Rasi:** 2.676 partecipazioni Noco assenti da `partecipazioni.metadati.id_opera_staging`; 3.258 partecipazioni post-migrazione da conservare; Mattei agganciato al Manuale 2005 dove Noco non lo ha.

## Decisioni da prendere in incontro

1. Precisione vs richiamo sul matcher: default proposto = **solo S+E esatto** se stagione nota.
2. Restore catalogo: approccio **B** (tre vie), non wipe Noco, non solo UI.
3. Ordine: matcher prima; restore repertorio dopo (non blocca Sky).

## Design matcher (dopo approvazione)

Unità: policy pura già in `episode-match-policy.ts` (`proposed`). Porting SQL in nuova migration che sostituisce il blocco episodio + il blocco partecipazioni di `match_programmazione_to_partecipazioni`.

- Con `numero_stagione` e `numero_episodio` valorizzati: match solo se entrambi coincidono.
- Altrimenti `episodio_mancante=true` e **nessuna** riga artista (alert esistente `catalog_episode_not_censito`).
- Ep-only solo se stagione assente/0 e un solo episodio catalogo con quel numero.
- Rimuovere `OR (v_is_serie AND p.episodio_id IS NULL)` sull’attribuzione puntuale.
- In `dettagli_matching.episodio` scrivere anche `catalog_stagione` / `catalog_episodio`.
- Campaign già completate non si riscrivono; serve nuova campagna individuazione.

## Design restore catalogo (dopo approvazione)

Job one-shot (script, non UI):

1. Dump Noco `Opere` + `Artisti` (stesso mapping di questa analisi).
2. Insert/skip `opere` per (titolo, anno, tipo) se assente; insert `episodi` per (opera, S, E).
3. Insert `partecipazioni` se manca la coppia (artista via `id_mandante_rasi`, opera/episodio, ruolo).
4. Skip se esiste già staging id.
5. Non delete.
6. Report per artista: prima/dopo vs CSV `noco-vs-supabase-repertorio-mancante-2026-09-11.csv`.
7. Fix puntuale Mattei: delete partecipazione 2005 se non in Noco; insert IL MIO WEST 1998.

## Fuori scope

- RASI Fern.
- Rinumero palinsesto vs catalogo (Un posto al sole) — piano matching già esistente.
- Riscrivere campagne Sky già chiuse senza richiesta esplicita.

## Test

- Unit: `episode-match-policy.test.ts` (FRINGE, HAWAII, YELLOWSTONE, Manuale collapse).
- Restore: conteggi per artista prima/dopo sul CSV.
- Matcher SQL: replay read-only dei tre titoli Sky dopo la migration.
