-- ============================================================================
-- DIAGNOSTICA: programmazioni duplicate → individuazioni "raddoppiate" (caso 2FF)
-- ============================================================================
-- Tutto READ-ONLY (solo SELECT, nessuna scrittura). Eseguire su Supabase/Postgres.
--
-- Contesto: il raddoppio delle views per uno stesso artista con UN SOLO ruolo
-- (es. "2 Fast 2 Furious") nasce da righe DUPLICATE in `programmazioni` (stesso
-- passaggio importato più volte: l'upload `uploadProgrammazioni` fa INSERT puro,
-- senza upsert/onConflict, e la tabella non ha vincoli di unicità). Il matcher
-- crea poi 1 individuazione per programmazione → l'artista compare 2 volte.
--
-- Obiettivo di questi controlli:
--   1) confermare/quantificare le programmazioni duplicate;
--   2) capire QUALE chiave naturale le identifica (broadcast con ora vs streaming
--      senza ora) → serve per scegliere il vincolo di unicità all'import;
--   3) misurare l'impatto sulle views;
--   4) escludere che il doppione venga dal matching (race nei re-run client-side).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- [0] Ispezione puntuale del caso 2 Fast 2 Furious (i due id dal dato Q1)
--     Se hanno data/ora/campagna uguali e created_at vicini → re-import dello
--     stesso batch. Se differiscono per periodo → passaggi reali distinti.
-- ----------------------------------------------------------------------------
SELECT id, emittente_id, campagna_programmazione_id, titolo, titolo_originale,
       data_trasmissione, ora_inizio, anno, views, created_at
FROM programmazioni
WHERE id IN ('66b3987e-5527-42c6-8765-e7b984b104d6',
             'ddf9766d-e4c1-4b84-a3f9-271337deadfa');


-- ----------------------------------------------------------------------------
-- [1] Programmazioni duplicate — chiave "broadcast" (con ora_inizio)
--     Adatta a emittenti lineari (RAI/RTI/SKY/LA7) dove data+ora identificano
--     il passaggio.
-- ----------------------------------------------------------------------------
SELECT emittente_id, titolo, data_trasmissione, ora_inizio,
       numero_stagione, numero_episodio, anno, views,
       count(*)            AS righe,
       count(*) - 1        AS copie_extra,
       array_agg(id)       AS programmazione_ids,
       array_agg(campagna_programmazione_id) AS campagne,
       min(created_at)     AS primo_import,
       max(created_at)     AS ultimo_import
FROM programmazioni
GROUP BY emittente_id, titolo, data_trasmissione, ora_inizio,
         numero_stagione, numero_episodio, anno, views
HAVING count(*) > 1
ORDER BY copie_extra DESC
LIMIT 200;


-- ----------------------------------------------------------------------------
-- [2] Programmazioni duplicate — chiave "streaming" (senza ora_inizio)
--     Adatta a Netflix/Disney+ ecc.: ora_inizio NULL, data = fine periodo,
--     `views` aggregato di periodo. Qui ricade il caso 2FF.
-- ----------------------------------------------------------------------------
SELECT emittente_id, titolo, titolo_originale, data_trasmissione, anno, views,
       campagna_programmazione_id,
       count(*)        AS righe,
       count(*) - 1    AS copie_extra,
       array_agg(id)   AS programmazione_ids,
       min(created_at) AS primo_import,
       max(created_at) AS ultimo_import
FROM programmazioni
WHERE ora_inizio IS NULL
GROUP BY emittente_id, titolo, titolo_originale, data_trasmissione, anno, views,
         campagna_programmazione_id
HAVING count(*) > 1
ORDER BY copie_extra DESC
LIMIT 200;


-- ----------------------------------------------------------------------------
-- [3] Impatto complessivo: quante righe sono "copie extra" e quante views
--     vengono conteggiate in più per colpa dei duplicati (chiave streaming).
--     NB: cambia il GROUP BY se la chiave confermata in [1]/[2] è diversa.
-- ----------------------------------------------------------------------------
WITH gruppi AS (
    SELECT emittente_id, titolo, data_trasmissione, anno, views,
           count(*) AS righe
    FROM programmazioni
    GROUP BY emittente_id, titolo, data_trasmissione, anno, views
)
SELECT
    count(*) FILTER (WHERE righe > 1)            AS gruppi_duplicati,
    COALESCE(sum(righe - 1) FILTER (WHERE righe > 1), 0)         AS righe_extra,
    COALESCE(sum((righe - 1) * views) FILTER (WHERE righe > 1), 0) AS views_doppie_stimate
FROM gruppi;


-- ----------------------------------------------------------------------------
-- [4] Controllo lato matching: doppioni ESATTI di individuazione sullo stesso
--     passaggio (stesso programmazione+artista+ruolo+episodio). Atteso ~0
--     (Q2: stesso_nome_ruolo_x2 = 0). Se >0 → c'è stata una race nei re-run.
-- ----------------------------------------------------------------------------
SELECT programmazione_id, artista_id, ruolo_id,
       COALESCE(episodio_id, '00000000-0000-0000-0000-000000000000'::uuid) AS episodio_k,
       count(*) AS righe
FROM individuazioni
GROUP BY programmazione_id, artista_id, ruolo_id, episodio_k
HAVING count(*) > 1
ORDER BY righe DESC
LIMIT 100;


-- ----------------------------------------------------------------------------
-- [5] Individuazioni "raddoppiate" via programmazioni duplicate:
--     stesso (artista, ruolo, opera, partecipazione) su programmazioni diverse
--     ma con stessa data/views → forte indizio di passaggio duplicato a monte.
-- ----------------------------------------------------------------------------
SELECT artista_id, ruolo_id, opera_id, partecipazione_id,
       data_trasmissione, views,
       count(DISTINCT programmazione_id) AS programmazioni_distinte,
       count(*)                          AS individuazioni,
       array_agg(DISTINCT programmazione_id) AS programmazione_ids
FROM individuazioni
GROUP BY artista_id, ruolo_id, opera_id, partecipazione_id, data_trasmissione, views
HAVING count(DISTINCT programmazione_id) > 1
ORDER BY individuazioni DESC
LIMIT 200;
