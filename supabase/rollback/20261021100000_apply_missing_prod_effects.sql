-- Rollback di 20261021100000_apply_missing_prod_effects.sql.
-- Ripristina le definizioni lette in produzione il 2026-10-21 (pg_get_functiondef)
-- e la policy campaign_jobs com'era (USING true). Non tocca supabase_migrations.

-- 4. get_dashboard_metrics: corpo prod precedente (versioni remote di luglio)
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_first_day date, p_last_day date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with counts as (
  select
    (select count(*) from artisti where stato = 'attivo')::int as artisti_attivi,
    (select count(*) from opere)::int as opere_totali,
    (select count(*) from episodi)::int as episodi_totali,
    (select count(*) from opere where tipo = 'film')::int as opere_film,
    (select count(*) from opere where tipo = 'serie_tv')::int as opere_serie_tv,
    (select count(*) from programmazioni where data_trasmissione >= p_first_day and data_trasmissione <= p_last_day)::int as programmazioni_mese,
    (select count(*) from campagne_individuazione where stato = 'in_corso')::int as campagne_attive,
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
        or regista is null or cardinality(regista) = 0
        or coalesce(codice_isan, '') = ''
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
    (select count(*) from opere where regista is null or cardinality(regista) = 0)::int as opere_missing_regista,
    (select count(*) from opere where coalesce(codice_isan, '') = '')::int as opere_missing_codice_isan
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
      when counts.individuazioni_totali > 0
        then round((counts.individuazioni_valide::numeric / counts.individuazioni_totali::numeric) * 100, 1)
      else 0
    end
  ),
  'totalArtisti', counts.artisti_attivi,
  'totalOpere', counts.opere_totali,
  'individuazioniTotal', counts.individuazioni_totali,
  'secondary', jsonb_build_object(
    'attivitaRecenti', coalesce((select items from recent), '[]'::jsonb),
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
      jsonb_build_object('label', 'Codice IPN', 'missing', health.artisti_missing_codice_ipn, 'total', counts.artisti_attivi),
      jsonb_build_object('label', 'Nome', 'missing', health.artisti_missing_nome, 'total', counts.artisti_attivi),
      jsonb_build_object('label', 'Cognome', 'missing', health.artisti_missing_cognome, 'total', counts.artisti_attivi),
      jsonb_build_object('label', 'Stato', 'missing', health.artisti_missing_stato, 'total', counts.artisti_attivi),
      jsonb_build_object('label', 'IMDB nconst', 'missing', health.artisti_missing_imdb_nconst, 'total', counts.artisti_attivi),
      jsonb_build_object('label', 'Data nascita', 'missing', health.artisti_missing_data_nascita, 'total', counts.artisti_attivi),
      jsonb_build_object('label', 'Codice fiscale', 'missing', health.artisti_missing_codice_fiscale, 'total', counts.artisti_attivi),
      jsonb_build_object('label', 'Data inizio mandato', 'missing', health.artisti_missing_data_inizio_mandato, 'total', counts.artisti_attivi),
      jsonb_build_object('label', 'Data fine mandato', 'missing', health.artisti_missing_data_fine_mandato, 'total', counts.artisti_attivi)
    ),
    'opereMetrics', jsonb_build_array(
      jsonb_build_object('label', 'Titolo', 'missing', health.opere_missing_titolo, 'total', counts.opere_totali),
      jsonb_build_object('label', 'Tipo', 'missing', health.opere_missing_tipo, 'total', counts.opere_totali),
      jsonb_build_object('label', 'Anno produzione', 'missing', health.opere_missing_anno_produzione, 'total', counts.opere_totali),
      jsonb_build_object('label', 'IMDB tconst', 'missing', health.opere_missing_imdb_tconst, 'total', counts.opere_totali),
      jsonb_build_object('label', 'Titolo originale', 'missing', health.opere_missing_titolo_originale, 'total', counts.opere_totali),
      jsonb_build_object('label', 'Regista', 'missing', health.opere_missing_regista, 'total', counts.opere_totali),
      jsonb_build_object('label', 'Codice ISAN', 'missing', health.opere_missing_codice_isan, 'total', counts.opere_totali)
    )
  )
)
from counts, health;
$function$;

-- 3. get_individuazione_detail_stats: non esisteva in prod
DROP FUNCTION IF EXISTS public.get_individuazione_detail_stats(uuid);

-- 2. campaign_jobs: policy precedente e indice rimosso
DROP INDEX IF EXISTS public.idx_campaign_jobs_owner_campaign_state_updated;
DROP POLICY IF EXISTS "campaign_jobs_select_authenticated" ON public.campaign_jobs;
CREATE POLICY "campaign_jobs_select_authenticated"
    ON public.campaign_jobs
    FOR SELECT
    TO authenticated
    USING (true);

-- 1. build_match_key_strict: corpo prod precedente (senza suffisso serie)
CREATE OR REPLACE FUNCTION public.build_match_key_strict(t text, y integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  SELECT CASE
    WHEN t IS NULL OR length(trim(replace(t, E' ', ' '))) = 0 THEN ''
    ELSE
      regexp_replace(
        lower(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(
                        regexp_replace(
                          regexp_replace(
                            regexp_replace(
                              regexp_replace(
                                regexp_replace(
                                  regexp_replace(
                                    regexp_replace(
                                      translate(
                                        regexp_replace(
                                          trim(replace(t, E' ', ' ')),
                                          E'[‘’]', '''', 'g'),
                                        E'“”', '""'),
                                      '\s*\[\s*ED\.?\s*\d+\s*\]', '', 'gi'),
                                    '\s*\(\s*ED\.?\s*\d+\s*\)', '', 'gi'),
                                  '\s*\(\s*R(\s+\d+'')?\s*\)', '', 'gi'),
                                '\s*\(\s*SEASON\s+\d+R?\s*\)', '', 'gi'),
                              '\s+(?:S|ST)\.?\s*\d+\s*$', '', 'i'),
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
$function$;

-- Ricalcolo chiavi con la funzione ripristinata, stesse righe del forward.
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

-- La funzione appena ripristinata non ha SERIES_PART_TRAIL, quindi
-- "Gabriel's Inferno: Part Two/Three" tornano a chiavi distinte
-- (gabriel's inferno: part two|three). Stesso esito delle chiavi scritte
-- a mano nel forward. Non si tocca schema_migrations.
UPDATE public.opera_aliases
SET alias_titolo_norm        = public.build_match_key(alias_titolo, alias_anno),
    alias_titolo_norm_strict = public.build_match_key_strict(alias_titolo, alias_anno)
WHERE alias_titolo ~* '\s*:\s*(SEASON|PARTE|PART|VOLUME|VOL|CHAPTER|LIMITED\s+SERIES|COLLECTION|STAGIONE)\y'
  AND (alias_titolo_norm IS DISTINCT FROM public.build_match_key(alias_titolo, alias_anno)
       OR alias_titolo_norm_strict IS DISTINCT FROM public.build_match_key_strict(alias_titolo, alias_anno));
