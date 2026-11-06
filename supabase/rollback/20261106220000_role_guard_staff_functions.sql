-- Rollback di 20261106220000_role_guard_staff_functions.sql.
-- NON è una migration: non sta in supabase/migrations e non parte da solo.
--
-- Eseguirlo a mano, in un'unica transazione (il BEGIN/COMMIT qui sotto).
-- Ripristina i corpi misurati in produzione il 6/11/2026, prima del guard.
-- I GRANT non cambiano: CREATE OR REPLACE li conserva, e la migration non
-- li aveva modificati.
--
-- Non tocca delete_campagna_individuazione_safe(uuid), get_user_role(),
-- get_user_artista_id() né get_user_email_by_id(uuid).

BEGIN;

DO $rollback_preflight$
DECLARE
  fn text;
  missing text[] := ARRAY[]::text[];
  fns text[] := ARRAY[
    'public.delete_campagna_individuazione_safe(uuid, uuid, integer)',
    'public.delete_campagna_programmazione_safe(uuid, uuid, integer)',
    'public.get_campagne_programmazione_with_counts()',
    'public.get_dashboard_metrics(date, date)',
    'public.get_individuazione_detail_stats(uuid)',
    'public.get_individuazione_episode_alert_summary(uuid)',
    'public.get_individuazione_episode_alerts(uuid)',
    'public.get_processing_progress(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    IF to_regprocedure(fn) IS NULL THEN
      missing := array_append(missing, fn);
    END IF;
  END LOOP;
  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'firme assenti, rollback annullato: %', missing;
  END IF;
END
$rollback_preflight$;

CREATE OR REPLACE FUNCTION public.delete_campagna_individuazione_safe(p_campagna_individuazione_id uuid, p_user_id uuid, p_stale_after_minutes integer DEFAULT 120)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_campagna record;
  v_deleted_individuazioni integer := 0;
  v_deleted_processed integer := 0;
  v_deleted_episode_alerts integer := 0;
  v_cancelled_jobs integer := 0;
  v_remaining integer := 0;
  v_lock_is_stale boolean := false;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Utente non autenticato',
      'error_code', 'AUTH_REQUIRED'
    );
  END IF;

  SELECT
    ci.id,
    ci.campagne_programmazione_id,
    ci.stato AS stato_individuazione,
    cp.processing_by,
    cp.processing_started_at
  INTO v_campagna
  FROM public.campagne_individuazione ci
  JOIN public.campagne_programmazione cp ON cp.id = ci.campagne_programmazione_id
  WHERE ci.id = p_campagna_individuazione_id
  FOR UPDATE OF ci, cp;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Campagna individuazione non trovata',
      'error_code', 'NOT_FOUND'
    );
  END IF;

  v_lock_is_stale := v_campagna.processing_started_at IS NOT NULL
    AND v_campagna.processing_started_at < now() - make_interval(mins => GREATEST(p_stale_after_minutes, 0));

  IF v_campagna.processing_by IS NOT NULL
     AND v_campagna.processing_by <> p_user_id
     AND NOT v_lock_is_stale THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Non puoi eliminare una campagna bloccata da un altro utente',
      'error_code', 'LOCKED_BY_OTHER'
    );
  END IF;

  DELETE FROM public.individuazioni
  WHERE campagna_individuazioni_id = p_campagna_individuazione_id;
  GET DIAGNOSTICS v_deleted_individuazioni = ROW_COUNT;

  DELETE FROM public.campagne_individuazione_processed_programmazioni
  WHERE campagne_individuazione_id = p_campagna_individuazione_id;
  GET DIAGNOSTICS v_deleted_processed = ROW_COUNT;

  DELETE FROM public.campagne_individuazione_episode_alerts
  WHERE campagne_individuazione_id = p_campagna_individuazione_id;
  GET DIAGNOSTICS v_deleted_episode_alerts = ROW_COUNT;

  UPDATE public.campaign_jobs
  SET stato = 'cancelled',
      fase = 'cancelled',
      error = 'Campagna individuazione eliminata',
      updated_at = now()
  WHERE stato IN ('queued', 'running', 'error')
    AND (
      campagne_individuazione_id = p_campagna_individuazione_id
      OR (
        campagne_individuazione_id IS NULL
        AND campagne_programmazione_id = v_campagna.campagne_programmazione_id
      )
    );
  GET DIAGNOSTICS v_cancelled_jobs = ROW_COUNT;

  DELETE FROM public.campagne_individuazione
  WHERE id = p_campagna_individuazione_id;

  SELECT COUNT(*) INTO v_remaining
  FROM public.campagne_individuazione
  WHERE campagne_programmazione_id = v_campagna.campagne_programmazione_id;

  IF v_remaining = 0 THEN
    UPDATE public.campagne_programmazione
    SET stato = 'in_review'::public.stato_campagna,
        is_individuated = false,
        processing_by = NULL,
        processing_started_at = NULL,
        updated_at = now()
    WHERE id = v_campagna.campagne_programmazione_id;
  ELSE
    UPDATE public.campagne_programmazione
    SET updated_at = now()
    WHERE id = v_campagna.campagne_programmazione_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_individuazioni', v_deleted_individuazioni,
    'deleted_processed_programmazioni', v_deleted_processed,
    'deleted_episode_alerts', v_deleted_episode_alerts,
    'cancelled_jobs', v_cancelled_jobs,
    'campagne_programmazione_id', v_campagna.campagne_programmazione_id,
    'remaining_campagne_individuazione', v_remaining
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_campagna_programmazione_safe(p_campagna_programmazione_id uuid, p_user_id uuid, p_stale_after_minutes integer DEFAULT 120)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_campagna record;
  v_lock_is_stale boolean := false;
  v_individuazione_runs integer := 0;
  v_individuazioni integer := 0;
  v_first_individuazione_nome text;
  v_deleted_programmazioni integer := 0;
  v_deleted_campaign_jobs integer := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Utente non autenticato',
      'error_code', 'AUTH_REQUIRED'
    );
  END IF;

  SELECT
    id,
    nome,
    processing_by,
    processing_started_at
  INTO v_campagna
  FROM public.campagne_programmazione
  WHERE id = p_campagna_programmazione_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Campagna programmazione non trovata',
      'error_code', 'NOT_FOUND'
    );
  END IF;

  v_lock_is_stale := v_campagna.processing_started_at IS NOT NULL
    AND v_campagna.processing_started_at < now() - make_interval(mins => GREATEST(p_stale_after_minutes, 0));

  IF v_campagna.processing_by IS NOT NULL
     AND v_campagna.processing_by <> p_user_id
     AND NOT v_lock_is_stale THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Non puoi eliminare una campagna bloccata da un altro utente',
      'error_code', 'LOCKED_BY_OTHER'
    );
  END IF;

  SELECT
    COUNT(*)::integer,
    MIN(nome)
  INTO v_individuazione_runs, v_first_individuazione_nome
  FROM public.campagne_individuazione
  WHERE campagne_programmazione_id = p_campagna_programmazione_id;

  IF v_individuazione_runs > 0 THEN
    SELECT COUNT(*)::integer
    INTO v_individuazioni
    FROM public.individuazioni i
    JOIN public.campagne_individuazione ci
      ON ci.id = i.campagna_individuazioni_id
    WHERE ci.campagne_programmazione_id = p_campagna_programmazione_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esiste una campagna di individuazione collegata. Devi prima eliminarla dalla pagina Individuazioni.',
      'error_code', 'HAS_INDIVIDUAZIONE',
      'campagna_individuazione_nome', v_first_individuazione_nome,
      'individuazione_runs', v_individuazione_runs,
      'individuazioni_count', v_individuazioni
    );
  END IF;

  DELETE FROM public.campaign_jobs
  WHERE campagne_programmazione_id = p_campagna_programmazione_id;
  GET DIAGNOSTICS v_deleted_campaign_jobs = ROW_COUNT;

  PERFORM set_config('rasi.skip_programmazioni_count_trigger', 'on', true);

  DELETE FROM public.programmazioni
  WHERE campagna_programmazione_id = p_campagna_programmazione_id;
  GET DIAGNOSTICS v_deleted_programmazioni = ROW_COUNT;

  PERFORM set_config('rasi.skip_programmazioni_count_trigger', 'off', true);

  DELETE FROM public.campagne_programmazione
  WHERE id = p_campagna_programmazione_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_programmazioni', v_deleted_programmazioni,
    'deleted_campaign_jobs', v_deleted_campaign_jobs
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_campagne_programmazione_with_counts()
 RETURNS TABLE(id uuid, nome text, descrizione text, stato text, emittente_id uuid, emittente_nome text, anno integer, created_at timestamp with time zone, updated_at timestamp with time zone, created_by uuid, processing_by uuid, processing_started_at timestamp with time zone, programmazioni_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    cp.id,
    cp.nome,
    cp.descrizione,
    cp.stato::text,
    cp.emittente_id,
    e.nome AS emittente_nome,
    cp.anno,
    cp.created_at,
    cp.updated_at,
    cp.created_by,
    cp.processing_by,
    cp.processing_started_at,
    cp.programmazioni_count
  FROM campagne_programmazione cp
  LEFT JOIN emittenti e ON e.id = cp.emittente_id
  ORDER BY cp.created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_first_day date, p_last_day date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_individuazione_detail_stats(p_campagna_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_individuazione_episode_alert_summary(p_campagna_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH base AS (
  SELECT *
  FROM public.campagne_individuazione_episode_alerts
  WHERE campagne_individuazione_id = p_campagna_id
),
counts AS (
  SELECT
    count(*)::int AS totale,
    count(*) FILTER (WHERE tipo_alert = 'catalog_episode_not_censito')::int AS catalog_episode_not_censito,
    count(*) FILTER (WHERE tipo_alert = 'programmazione_episode_data_invalid')::int AS programmazione_episode_data_invalid,
    count(DISTINCT programmazione_id)::int AS programmazioni_coinvolte,
    count(DISTINCT opera_id)::int AS opere_coinvolte
  FROM base
),
top_opere AS (
  SELECT
    o.titolo,
    b.tipo_alert,
    count(*)::int AS count
  FROM base b
  LEFT JOIN public.opere o ON o.id = b.opera_id
  GROUP BY o.titolo, b.tipo_alert
  ORDER BY count(*) DESC, o.titolo ASC NULLS LAST
  LIMIT 5
)
SELECT jsonb_build_object(
  'totale', counts.totale,
  'catalogEpisodeNotCensito', counts.catalog_episode_not_censito,
  'programmazioneEpisodeDataInvalid', counts.programmazione_episode_data_invalid,
  'programmazioniCoinvolte', counts.programmazioni_coinvolte,
  'opereCoinvolte', counts.opere_coinvolte,
  'topOpere', COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'titolo', COALESCE(top_opere.titolo, '-'),
          'tipoAlert', top_opere.tipo_alert,
          'count', top_opere.count
        )
        ORDER BY top_opere.count DESC, top_opere.titolo ASC
      )
      FROM top_opere
    ),
    '[]'::jsonb
  )
)
FROM counts;
$function$;

CREATE OR REPLACE FUNCTION public.get_individuazione_episode_alerts(p_campagna_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (
      SELECT jsonb_agg(row_data ORDER BY sort_tipo, sort_titolo, sort_stagione, sort_episodio)
      FROM (
        SELECT
          jsonb_build_object(
            'id', a.id,
            'tipoAlert', a.tipo_alert,
            'programmazioneId', a.programmazione_id,
            'operaId', a.opera_id,
            'campagneProgrammazioneId', p.campagna_programmazione_id,
            'numeroStagione', a.numero_stagione,
            'numeroEpisodio', a.numero_episodio,
            'titolo', COALESCE(
              NULLIF(BTRIM(a.titolo), ''),
              NULLIF(BTRIM(p.titolo), ''),
              NULLIF(BTRIM(o.titolo), ''),
              '-'
            ),
            'titoloOriginale', a.titolo_originale,
            'titoloEpisodio', COALESCE(
              NULLIF(BTRIM(a.titolo_episodio), ''),
              NULLIF(BTRIM(p.titolo_episodio), '')
            ),
            'operaTitolo', o.titolo,
            'dataTrasmissione', p.data_trasmissione,
            'oraInizio', p.ora_inizio
          ) AS row_data,
          a.tipo_alert AS sort_tipo,
          lower(COALESCE(o.titolo, a.titolo, p.titolo, '')) AS sort_titolo,
          COALESCE(a.numero_stagione, 2147483647) AS sort_stagione,
          COALESCE(a.numero_episodio, 2147483647) AS sort_episodio
        FROM public.campagne_individuazione_episode_alerts a
        LEFT JOIN public.programmazioni p ON p.id = a.programmazione_id
        LEFT JOIN public.opere o ON o.id = a.opera_id
        WHERE a.campagne_individuazione_id = p_campagna_id
      ) ranked
    ),
    '[]'::jsonb
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_processing_progress(p_campagna_id uuid)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT json_build_object(
    'processing_by',           cp.processing_by,
    'processing_started_at',   cp.processing_started_at,
    'programmazioni_totali',   (
      SELECT COUNT(*)
      FROM programmazioni p
      WHERE p.campagna_programmazione_id = p_campagna_id
    ),
    'programmazioni_processate', (
      SELECT COUNT(*)
      FROM programmazioni p
      WHERE p.campagna_programmazione_id = p_campagna_id
        AND p.processato = true
    ),
    'campagna_individuazione_id', ci.id,
    'individuazioni_create',   CASE
      WHEN ci.id IS NULL THEN 0
      ELSE (
        SELECT COUNT(*)
        FROM individuazioni ind
        WHERE ind.campagna_individuazioni_id = ci.id
      )
    END,
    'last_activity_at',        CASE
      WHEN ci.id IS NULL THEN NULL
      ELSE (
        SELECT MAX(ind.created_at)
        FROM individuazioni ind
        WHERE ind.campagna_individuazioni_id = ci.id
      )
    END
  )
  FROM campagne_programmazione cp
  LEFT JOIN campagne_individuazione ci
    ON ci.campagne_programmazione_id = p_campagna_id
  WHERE cp.id = p_campagna_id;
$function$;

COMMIT;
