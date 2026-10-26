-- Porta in produzione gli effetti dei file pending del piano #45 che la verifica
-- in sola lettura del 2026-10-21 ha trovato MISSING o PARTIAL.
--
-- Copre:
--   20260608120000_match_key_series_part_suffix          (MISSING)
--   20260623140000_campaign_jobs_owner_select_policy     (MISSING)
--   20260626170400_individuazione_detail_stats           (MISSING)
--   20260623220000 / 20260811183000 / 20260911160000 dashboard (PARTIAL)
-- NON copre (gia' in prod, solo repair applied):
--   20260623173000, 20260623180500, 20260630125200
--
-- Idempotente: CREATE OR REPLACE, DROP POLICY IF EXISTS, CREATE INDEX IF NOT EXISTS,
-- UPDATE limitati alle righe la cui chiave cambia davvero.
-- Eccezione 2026-10-26 (Matteo): gli alias "Gabriel's Inferno: Part Two" e
-- "Part Three" non prendono la chiave collassata dal suffisso. Vedi sotto.
-- Rollback: supabase/rollback/20261021100000_apply_missing_prod_effects.sql
-- NON applicare senza OK esplicito di Matteo.

-- ---------------------------------------------------------------------------
-- 1. build_match_key_strict: suffisso Netflix ": Season/Part/..." (20260608120000)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.build_match_key_strict(t text, y integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN t IS NULL OR length(trim(replace(t, E' ', ' '))) = 0 THEN ''
    ELSE
      regexp_replace(
        lower(
          -- 17. ARTICLE_TRAIL_PAREN reorder "MADAMA (LA)" → "LA MADAMA"
          regexp_replace(
            -- 16. collapse whitespace
            regexp_replace(
              -- 14. CHANNEL_PREFIX
              regexp_replace(
                -- 13. CATEGORY_PREFIX (case-sensitive: no 'i' flag)
                regexp_replace(
                  -- 12. SPECIAL_PAREN
                  regexp_replace(
                    -- 11. SUFFIX_TAG_TRAIL
                    regexp_replace(
                      -- 10. PUNTATA_TRAIL
                      regexp_replace(
                        -- 9. EPISODIO_IT
                        regexp_replace(
                          -- 8. EPISODE_TRAIL
                          regexp_replace(
                            -- 7b. SERIES_PART_TRAIL — Netflix ": Season/Part/..." suffix
                            regexp_replace(
                              -- 7. SEASON_TRAIL (S or ST)
                              regexp_replace(
                                -- 6. SEASON_PAREN (with optional R suffix)
                                regexp_replace(
                                  -- 5. REPLICA_PAREN
                                  regexp_replace(
                                    -- 4. EDITION_PAREN
                                    regexp_replace(
                                      -- 3. EDITION_SQUARE
                                      regexp_replace(
                                        -- 15. typographic double quotes → "
                                        translate(
                                          -- 15. typographic single quotes → '
                                          regexp_replace(
                                            -- 1+2. NBSP → space, then trim
                                            trim(replace(t, E' ', ' ')),
                                            E'[‘’]', '''', 'g'),
                                          E'“”', '""'),
                                        '\s*\[\s*ED\.?\s*\d+\s*\]', '', 'gi'),
                                      '\s*\(\s*ED\.?\s*\d+\s*\)', '', 'gi'),
                                    '\s*\(\s*R(\s+\d+''?)?\s*\)', '', 'gi'),
                                  '\s*\(\s*SEASON\s+\d+R?\s*\)', '', 'gi'),
                                '\s+(?:S|ST)\.?\s*\d+\s*$', '', 'i'),
                              '\s*:\s*(SEASON|PARTE|PART|VOLUME|VOL|CHAPTER|LIMITED\s+SERIES|COLLECTION|STAGIONE)\y.*$', '', 'i'),
                            '\s+EP\.?\s*\d+.*$', '', 'i'),
                          '\s+EPISODIO\s+\d+.*$', '', 'i'),
                        '\s+-\s*p\.\s*\d+\s*$', '', 'i'),
                      '\s+-\s+(LA\s+SERIE|STAGIONE\s+FINALE|PILOTA|PILLOLE|SPECIALE)\s*$', '', 'i'),
                    '\s*\(\s*(MOVIE|REPEAT\s+VERSION|ONE\s+HOUR\s+REPACK|CHRISTMAS\s+SPECIAL)\s*\)', '', 'gi'),
                  '^(FILM|DOCUMENTARIO)\s+', '', 'g'),
                '^\(\s*[A-Za-z0-9]+\s*\)\s+', '', 'g'),
              '\s+', ' ', 'g'),
            '^(.+?)\s+\((LA|IL|LE|LO|GLI|UN|UNO|UNA|I|THE)\)\s*$', '\2 \1', 'i')
          ),
          '^(the|il|la|le|lo|gli|un|uno|una|i)\s+', '', 'i')
        || COALESCE('::' || y::text, '')
  END
$$;

COMMENT ON FUNCTION public.build_match_key_strict IS
  'Strict match key: preserves trailing Roman/digit/PARTE tokens; strips Netflix ": Season/Part/..." suffixes. Mirrors TS buildMatchKeyStrict() in src/features/programmazioni/utils/title-normalize.ts.';

-- Ricalcolo chiavi solo dove la nuova funzione produce un valore diverso.
-- Prod 2026-10-21: opere 8 righe, programmazioni 59.594 righe col suffisso, alias 8.
UPDATE public.opere
SET match_key_strict = public.build_match_key_strict(titolo, anno_produzione),
    match_key_loose  = public.build_match_key(titolo, anno_produzione)
WHERE titolo ~* '\s*:\s*(SEASON|PARTE|PART|VOLUME|VOL|CHAPTER|LIMITED\s+SERIES|COLLECTION|STAGIONE)\y'
  AND (match_key_strict IS DISTINCT FROM public.build_match_key_strict(titolo, anno_produzione)
       OR match_key_loose IS DISTINCT FROM public.build_match_key(titolo, anno_produzione));

UPDATE public.programmazioni
SET match_key_strict = public.build_match_key_strict(titolo, anno),
    match_key_loose  = public.build_match_key(titolo, anno)
WHERE titolo ~* '\s*:\s*(SEASON|PARTE|PART|VOLUME|VOL|CHAPTER|LIMITED\s+SERIES|COLLECTION|STAGIONE)\y'
  AND (match_key_strict IS DISTINCT FROM public.build_match_key_strict(titolo, anno)
       OR match_key_loose IS DISTINCT FROM public.build_match_key(titolo, anno));

-- UNIQUE (opera_id, emittente_id, alias_titolo_norm, alias_anno).
-- "Gabriel's Inferno: Part Two" e "Part Three" condividono opera, emittente
-- e anno: SERIES_PART_TRAIL le riduce entrambe a "gabriel's inferno" (+ anno)
-- e l'UPDATE fallisce per collisione. Decisione Matteo 2026-10-26: restano
-- chiavi distinte, scritte a mano. Nel file non c'è un altro titolo analogo.
UPDATE public.opera_aliases
SET alias_titolo_norm        = public.build_match_key(alias_titolo, alias_anno),
    alias_titolo_norm_strict = public.build_match_key_strict(alias_titolo, alias_anno)
WHERE alias_titolo ~* '\s*:\s*(SEASON|PARTE|PART|VOLUME|VOL|CHAPTER|LIMITED\s+SERIES|COLLECTION|STAGIONE)\y'
  AND alias_titolo !~* 'gabriel[''’]s inferno:\s*part\s+(two|three)\y'
  AND (alias_titolo_norm IS DISTINCT FROM public.build_match_key(alias_titolo, alias_anno)
       OR alias_titolo_norm_strict IS DISTINCT FROM public.build_match_key_strict(alias_titolo, alias_anno));

UPDATE public.opera_aliases
SET alias_titolo_norm = CASE
      WHEN alias_titolo ~* ':\s*part\s+three\y' THEN 'gabriel''s inferno: part three'
      ELSE 'gabriel''s inferno: part two'
    END || COALESCE('::' || alias_anno::text, ''),
    alias_titolo_norm_strict = CASE
      WHEN alias_titolo ~* ':\s*part\s+three\y' THEN 'gabriel''s inferno: part three'
      ELSE 'gabriel''s inferno: part two'
    END || COALESCE('::' || alias_anno::text, '')
WHERE alias_titolo ~* 'gabriel[''’]s inferno:\s*part\s+(two|three)\y'
  AND (
    alias_titolo_norm IS DISTINCT FROM (
      CASE
        WHEN alias_titolo ~* ':\s*part\s+three\y' THEN 'gabriel''s inferno: part three'
        ELSE 'gabriel''s inferno: part two'
      END || COALESCE('::' || alias_anno::text, '')
    )
    OR alias_titolo_norm_strict IS DISTINCT FROM (
      CASE
        WHEN alias_titolo ~* ':\s*part\s+three\y' THEN 'gabriel''s inferno: part three'
        ELSE 'gabriel''s inferno: part two'
      END || COALESCE('::' || alias_anno::text, '')
    )
  );

-- ---------------------------------------------------------------------------
-- 2. campaign_jobs: lettura solo dei propri job (20260623140000)
-- Il frontend filtra gia' per created_by; il worker usa service_role (bypassa RLS).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "campaign_jobs_select_authenticated" ON public.campaign_jobs;

CREATE POLICY "campaign_jobs_select_authenticated"
    ON public.campaign_jobs
    FOR SELECT
    TO authenticated
    USING (created_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_campaign_jobs_owner_campaign_state_updated
    ON public.campaign_jobs (
        created_by,
        campagne_programmazione_id,
        stato,
        updated_at DESC
    );

-- ---------------------------------------------------------------------------
-- 3. get_individuazione_detail_stats (20260626170400)
-- ---------------------------------------------------------------------------
create or replace function public.get_individuazione_detail_stats(
  p_campagna_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with campagna as (
  select statistiche
  from campagne_individuazione
  where id = p_campagna_id
),
base as (
  select
    i.*,
    case
      when i.punteggio_matching is null then 0
      when i.punteggio_matching > 1 then i.punteggio_matching
      else i.punteggio_matching * 100
    end as score_percent
  from individuazioni i
  where i.campagna_individuazioni_id = p_campagna_id
),
counts as (
  select
    coalesce(count(*), 0)::int as totale,
    coalesce(count(*) filter (where stato = 'individuato'), 0)::int as individuati,
    coalesce(count(*) filter (where stato = 'validato'), 0)::int as validati,
    coalesce(count(*) filter (where stato = 'dubbioso'), 0)::int as dubbiosi,
    coalesce(count(*) filter (where stato = 'respinto'), 0)::int as respinti,
    coalesce(count(*) filter (where score_percent >= 90), 0)::int as match_alti,
    coalesce(count(*) filter (where score_percent >= 70 and score_percent < 90), 0)::int as match_medi,
    coalesce(count(*) filter (where score_percent > 0 and score_percent < 70), 0)::int as match_bassi,
    coalesce(count(*) filter (where dettagli_matching->>'episodio_mancante' = 'true'), 0)::int as episodio_da_controllare,
    coalesce(count(distinct artista_id), 0)::int as artisti_distinti,
    coalesce(count(distinct opera_id), 0)::int as opere_distinte,
    coalesce(round(avg(score_percent)::numeric, 1), 0)::numeric as score_medio,
    coalesce(round(min(score_percent)::numeric, 1), 0)::numeric as score_min,
    coalesce(round(max(score_percent)::numeric, 1), 0)::numeric as score_max
  from base
),
review as (
  select
    coalesce(count(*), 0)::int as da_controllare
  from base
  where
    stato = 'dubbioso'
    or score_percent < 70
    or dettagli_matching->>'episodio_mancante' = 'true'
),
top_ruolo as (
  select
    rt.nome,
    count(*)::int as count
  from base b
  left join ruoli_tipologie rt on rt.id = b.ruolo_id
  where b.ruolo_id is not null
  group by rt.nome
  order by count(*) desc, rt.nome asc
  limit 1
),
stats as (
  select
    coalesce((c.statistiche->>'programmazioni_totali')::int, 0) as programmazioni_totali,
    coalesce((c.statistiche->>'programmazioni_processate')::int, 0) as programmazioni_processate,
    coalesce((c.statistiche->>'programmazioni_con_match')::int, 0) as programmazioni_con_match,
    coalesce(
      (c.statistiche->>'programmazioni_senza_match')::int,
      greatest(
        coalesce((c.statistiche->>'programmazioni_totali')::int, 0)
        - coalesce((c.statistiche->>'programmazioni_con_match')::int, 0),
        0
      )
    ) as programmazioni_senza_match
  from campagna c
)
select jsonb_build_object(
  'coverage', jsonb_build_object(
    'programmazioniTotali', stats.programmazioni_totali,
    'programmazioniProcessate', stats.programmazioni_processate,
    'programmazioniConMatch', stats.programmazioni_con_match,
    'programmazioniSenzaMatch', stats.programmazioni_senza_match,
    'coperturaPercentuale', case
      when stats.programmazioni_totali > 0
        then round((stats.programmazioni_con_match::numeric / stats.programmazioni_totali::numeric) * 100, 1)
      else 0
    end
  ),
  'outcomes', jsonb_build_object(
    'totale', counts.totale,
    'individuati', counts.individuati,
    'validati', counts.validati,
    'dubbiosi', counts.dubbiosi,
    'respinti', counts.respinti,
    'sicuri', counts.individuati + counts.validati
  ),
  'quality', jsonb_build_object(
    'scoreMedio', counts.score_medio,
    'scoreMin', counts.score_min,
    'scoreMax', counts.score_max,
    'matchAlti', counts.match_alti,
    'matchMedi', counts.match_medi,
    'matchBassi', counts.match_bassi
  ),
  'review', jsonb_build_object(
    'daControllare', review.da_controllare,
    'dubbiosi', counts.dubbiosi,
    'scoreBasso', counts.match_bassi,
    'episodioDaControllare', counts.episodio_da_controllare
  ),
  'catalog', jsonb_build_object(
    'artistiDistinti', counts.artisti_distinti,
    'opereDistinte', counts.opere_distinte,
    'ruoloPrincipale', (
      select case
        when top_ruolo.nome is null then null
        else jsonb_build_object('nome', top_ruolo.nome, 'count', top_ruolo.count)
      end
      from top_ruolo
    )
  )
)
from stats, counts, review;
$$;

REVOKE ALL ON FUNCTION public.get_individuazione_detail_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_individuazione_detail_stats(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. get_dashboard_metrics = corpo di 20260911160000 (join campagne attive,
--    regia/alias/ISAN/anno fine/episodi, chiavi stabili) + le due righe mandato
--    gia' presenti in prod dalle versioni remote di luglio
--    (20260709164556 / 20260709165041), per non perderle.
-- ---------------------------------------------------------------------------
create or replace function public.get_dashboard_metrics(
  p_first_day date,
  p_last_day date
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with counts as (
  select
    (select count(*) from artisti where stato = 'attivo')::int as artisti_attivi,
    (select count(*) from opere)::int as opere_totali,
    (select count(*) from episodi)::int as episodi_totali,
    (select count(*) from opere where tipo = 'film')::int as opere_film,
    (select count(*) from opere where tipo = 'serie_tv')::int as opere_serie_tv,
    (select count(*) from programmazioni where data_trasmissione >= p_first_day and data_trasmissione <= p_last_day)::int as programmazioni_mese,
    (
      select count(*)
      from campagne_individuazione ci
      join campagne_programmazione cp on cp.id = ci.campagne_programmazione_id
      where ci.stato = 'in_corso'
        and cp.stato = 'in_corso'
    )::int as campagne_attive,
    coalesce((select sum(importo_totale_disponibile::numeric) from campagne_ripartizione where stato = 'distribuita'), 0)::numeric as importo_distribuito,
    (select count(*) from individuazioni)::int as individuazioni_totali,
    (select count(*) from individuazioni where stato <> 'respinto')::int as individuazioni_valide,
    (select count(*) from partecipazioni)::int as partecipazioni,
    (select count(*) from campagne_ripartizione)::int as campagne_ripartizione,
    (select created_at from programmazioni order by created_at desc limit 1) as ultimo_dato
),
health as (
  select
    (
      select count(*) from artisti
      where
        coalesce(codice_ipn, '') = ''
        or coalesce(nome, '') = ''
        or coalesce(cognome, '') = ''
        or stato is null
        or coalesce(imdb_nconst, '') = ''
        or data_nascita is null
        or coalesce(codice_fiscale, '') = ''
        or data_inizio_mandato is null
    )::int as artisti_incompleti,
    (
      select count(*) from opere
      where
        coalesce(titolo, '') = ''
        or tipo is null
        or anno_produzione is null
        or coalesce(imdb_tconst, '') = ''
        or coalesce(titolo_originale, '') = ''
        or coalesce(cardinality(regista), 0) = 0
        or (tipo = 'serie_tv' and has_episodes = false)
    )::int as opere_incomplete,
    (select count(*) from artisti where coalesce(codice_ipn, '') = '')::int as artisti_missing_codice_ipn,
    (select count(*) from artisti where coalesce(nome, '') = '')::int as artisti_missing_nome,
    (select count(*) from artisti where coalesce(cognome, '') = '')::int as artisti_missing_cognome,
    (select count(*) from artisti where stato is null)::int as artisti_missing_stato,
    (select count(*) from artisti where coalesce(imdb_nconst, '') = '')::int as artisti_missing_imdb_nconst,
    (select count(*) from artisti where data_nascita is null)::int as artisti_missing_data_nascita,
    (select count(*) from artisti where coalesce(codice_fiscale, '') = '')::int as artisti_missing_codice_fiscale,
    (select count(*) from artisti where data_inizio_mandato is null)::int as artisti_missing_data_inizio_mandato,
    (select count(*) from artisti where data_fine_mandato is null)::int as artisti_missing_data_fine_mandato,
    (select count(*) from opere where coalesce(titolo, '') = '')::int as opere_missing_titolo,
    (select count(*) from opere where tipo is null)::int as opere_missing_tipo,
    (select count(*) from opere where anno_produzione is null)::int as opere_missing_anno_produzione,
    (select count(*) from opere where coalesce(imdb_tconst, '') = '')::int as opere_missing_imdb_tconst,
    (select count(*) from opere where coalesce(titolo_originale, '') = '')::int as opere_missing_titolo_originale,
    (select count(*) from opere where coalesce(cardinality(regista), 0) = 0)::int as opere_missing_regista,
    (select count(*) from opere where coalesce(cardinality(alias_titoli), 0) = 0)::int as opere_missing_alias_titoli,
    (select count(*) from opere where coalesce(codice_isan, '') = '')::int as opere_missing_codice_isan,
    (select count(*) from opere where tipo = 'serie_tv' and anno_produzione_fine is null)::int as opere_missing_anno_produzione_fine,
    (select count(*) from opere where tipo = 'serie_tv' and has_episodes = false)::int as opere_missing_episodi
),
recent as (
  select coalesce(jsonb_agg(item order by (item->>'timestamp')::timestamptz desc), '[]'::jsonb) as items
  from (
    select jsonb_build_object(
      'tipo', 'artista',
      'label', 'Nuovo artista registrato',
      'dettaglio', concat_ws(' ', nome, cognome),
      'timestamp', created_at
    ) as item
    from (select nome, cognome, created_at from artisti order by created_at desc limit 3) a
    union all
    select jsonb_build_object(
      'tipo', 'opera',
      'label', 'Nuova opera catalogata',
      'dettaglio', titolo,
      'timestamp', created_at
    )
    from (select titolo, created_at from opere order by created_at desc limit 3) o
    union all
    select jsonb_build_object(
      'tipo', 'campagna_individuazione',
      'label', 'Campagna completata',
      'dettaglio', nome,
      'timestamp', updated_at
    )
    from (select nome, updated_at from campagne_individuazione where stato = 'completata' order by updated_at desc limit 3) ci
    union all
    select jsonb_build_object(
      'tipo', 'campagna_programmazione',
      'label', 'Nuova campagna programmazione',
      'dettaglio', nome,
      'timestamp', created_at
    )
    from (select nome, created_at from campagne_programmazione order by created_at desc limit 3) cp
  ) recent_items
)
select jsonb_build_object(
  'stats', jsonb_build_object(
    'artisti_attivi', counts.artisti_attivi,
    'opere_totali', counts.opere_totali,
    'episodi_totali', counts.episodi_totali,
    'opere_film', counts.opere_film,
    'opere_serie_tv', counts.opere_serie_tv,
    'programmazioni_mese', counts.programmazioni_mese,
    'campagne_attive', counts.campagne_attive,
    'importo_distribuito', counts.importo_distribuito,
    'tasso_matching', case
      when counts.individuazioni_totali = 0 then 0
      else round((counts.individuazioni_valide::numeric / counts.individuazioni_totali::numeric) * 1000) / 10
    end
  ),
  'totalArtisti', counts.artisti_attivi,
  'totalOpere', counts.opere_totali,
  'individuazioniTotal', counts.individuazioni_totali,
  'secondary', jsonb_build_object(
    'attivitaRecenti', recent.items,
    'statsAggiuntive', jsonb_build_object(
      'individuazioni', counts.individuazioni_totali,
      'partecipazioni', counts.partecipazioni,
      'campagneRipartizione', counts.campagne_ripartizione,
      'ultimoDato', counts.ultimo_dato
    )
  ),
  'health', jsonb_build_object(
    'artistiIncompleti', health.artisti_incompleti,
    'opereIncomplete', health.opere_incomplete,
    'artistiMetrics', jsonb_build_array(
      jsonb_build_object('key', 'codice_ipn', 'label', 'Codice IPN', 'missing', health.artisti_missing_codice_ipn, 'total', counts.artisti_attivi),
      jsonb_build_object('key', 'nome', 'label', 'Nome', 'missing', health.artisti_missing_nome, 'total', counts.artisti_attivi),
      jsonb_build_object('key', 'cognome', 'label', 'Cognome', 'missing', health.artisti_missing_cognome, 'total', counts.artisti_attivi),
      jsonb_build_object('key', 'stato', 'label', 'Stato', 'missing', health.artisti_missing_stato, 'total', counts.artisti_attivi),
      jsonb_build_object('key', 'imdb_nconst', 'label', 'IMDB nconst', 'missing', health.artisti_missing_imdb_nconst, 'total', counts.artisti_attivi),
      jsonb_build_object('key', 'data_nascita', 'label', 'Data nascita', 'missing', health.artisti_missing_data_nascita, 'total', counts.artisti_attivi),
      jsonb_build_object('key', 'codice_fiscale', 'label', 'Codice fiscale', 'missing', health.artisti_missing_codice_fiscale, 'total', counts.artisti_attivi),
      jsonb_build_object('key', 'data_inizio_mandato', 'label', 'Data inizio mandato', 'missing', health.artisti_missing_data_inizio_mandato, 'total', counts.artisti_attivi),
      jsonb_build_object('key', 'data_fine_mandato', 'label', 'Data fine mandato', 'missing', health.artisti_missing_data_fine_mandato, 'total', counts.artisti_attivi)
    ),
    'opereMetrics', jsonb_build_array(
      jsonb_build_object('key', 'titolo', 'label', 'Titolo', 'missing', health.opere_missing_titolo, 'total', counts.opere_totali),
      jsonb_build_object('key', 'tipo', 'label', 'Tipo', 'missing', health.opere_missing_tipo, 'total', counts.opere_totali),
      jsonb_build_object('key', 'anno_produzione', 'label', 'Anno produzione', 'missing', health.opere_missing_anno_produzione, 'total', counts.opere_totali),
      jsonb_build_object('key', 'imdb_tconst', 'label', 'IMDB tconst', 'missing', health.opere_missing_imdb_tconst, 'total', counts.opere_totali),
      jsonb_build_object('key', 'titolo_originale', 'label', 'Titolo originale', 'missing', health.opere_missing_titolo_originale, 'total', counts.opere_totali),
      jsonb_build_object('key', 'regista', 'label', 'Regia', 'missing', health.opere_missing_regista, 'total', counts.opere_totali),
      jsonb_build_object('key', 'alias_titoli', 'label', 'Alias titoli', 'missing', health.opere_missing_alias_titoli, 'total', counts.opere_totali),
      jsonb_build_object('key', 'codice_isan', 'label', 'Codice ISAN', 'missing', health.opere_missing_codice_isan, 'total', counts.opere_totali),
      jsonb_build_object('key', 'anno_produzione_fine', 'label', 'Anno produzione fine', 'missing', health.opere_missing_anno_produzione_fine, 'total', counts.opere_serie_tv),
      jsonb_build_object('key', 'episodi', 'label', 'Episodi (serie TV)', 'missing', health.opere_missing_episodi, 'total', counts.opere_serie_tv)
    )
  )
)
from counts, health, recent;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(date, date) TO authenticated;
