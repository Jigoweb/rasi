# Matcher precisione serie TV — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Far sì che una programmazione serie con stagione+episodio noti generi individuazioni automatiche solo se quel S+E esiste in catalogo, con gli artisti di quell’episodio.

**Architecture:** La policy è già espressa in TypeScript (`matchEpisodeProposed`). Una nuova migration SQL sostituisce il corpo di `match_programmazione_to_partecipazioni` (overload in uso) allineandolo a quella policy. `db/init/03_matching_functions.sql` va tenuto allineato. Nessun cambio UI obbligatorio oltre a esporre S/E catalogo già presenti in `dettagli_matching`.

**Tech Stack:** PostgreSQL (Supabase migrations), Jest per la policy, SQL replay read-only sui tre titoli Sky.

## Global Constraints

- Non riscrivere campagne `completata`.
- Non attribuire cast di serie (`episodio_id IS NULL`) a un passaggio con dati episodio.
- Non usare ep-only se `numero_stagione` è valorizzato e > 0.
- Test della policy `proposed` già verdi prima di toccare SQL.

---

## File Structure

- `src/features/individuazioni/utils/episode-match-policy.ts` — già presente; non cambiare la semantica `proposed` senza aggiornare i test dei casi cliente.
- `src/features/individuazioni/utils/episode-match-policy.test.ts` — già presente.
- `supabase/migrations/<ts>_matcher_series_precision.sql` — REPLACE della funzione matcher.
- `db/init/03_matching_functions.sql` — stesso corpo.

## Task 1: Porting SQL della policy proposed

- [ ] **Step 1:** Copiare l’ultima definizione deployata di `match_programmazione_to_partecipazioni` (5-arg o 6-arg in uso dal worker) in una nuova migration.

- [ ] **Step 2:** Nel loop episodi: se `v_prog.numero_stagione` IS NOT NULL AND > 0, **non** eseguire il blocco A2 ep-only.

- [ ] **Step 3:** Se `NOT v_episodio_trovato` e `v_has_episode_data`: impostare `v_episodio_mancante`, **non** entrare nel `FOR v_partecipazione` distinct-cast. `RETURN` senza artisti (o equivalente CONTINUE opera).

- [ ] **Step 4:** Nel ramo match episodio trovato, rimuovere `OR (v_is_serie AND p.episodio_id IS NULL)`.

- [ ] **Step 5:** In `dettagli_matching.episodio` aggiungere `catalog_stagione` e `catalog_episodio` dall’episodio scelto.

- [ ] **Step 6:** Allineare `db/init/03_matching_functions.sql`.

- [ ] **Step 7:** Replay read-only: programmazioni FRINGE/HAWAII/YELLOWSTONE S3 con S+E non in catalogo → 0 row; S+E in catalogo → solo artisti di quell’episodio.

- [ ] **Step 8:** Commit `fix(individuazioni): match serie solo su stagione+episodio esatti`.
