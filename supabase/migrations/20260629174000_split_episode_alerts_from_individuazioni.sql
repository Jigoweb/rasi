-- Keep episode/catalog diagnostics out of automatic individuazioni.
-- If a series episode is not censito, or provider episode data is broken,
-- the row becomes an alert for review/backlog rather than an individuazione.

CREATE TABLE IF NOT EXISTS public.campagne_individuazione_episode_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campagne_individuazione_id uuid NOT NULL REFERENCES public.campagne_individuazione(id) ON DELETE CASCADE,
  programmazione_id uuid NOT NULL REFERENCES public.programmazioni(id) ON DELETE CASCADE,
  opera_id uuid REFERENCES public.opere(id) ON DELETE SET NULL,
  tipo_alert text NOT NULL CHECK (
    tipo_alert IN ('catalog_episode_not_censito', 'programmazione_episode_data_invalid')
  ),
  numero_stagione integer,
  numero_episodio integer,
  titolo text,
  titolo_originale text,
  titolo_episodio text,
  dettagli jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campagne_individuazione_episode_alerts_unique
    UNIQUE NULLS NOT DISTINCT (
      campagne_individuazione_id,
      programmazione_id,
      opera_id,
      tipo_alert
    )
);

ALTER TABLE public.campagne_individuazione_episode_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campagne_individuazione_episode_alerts_service_only"
  ON public.campagne_individuazione_episode_alerts;
CREATE POLICY "campagne_individuazione_episode_alerts_service_only"
  ON public.campagne_individuazione_episode_alerts
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_individuazione_episode_alerts_campagna
  ON public.campagne_individuazione_episode_alerts (campagne_individuazione_id, tipo_alert);

CREATE OR REPLACE FUNCTION public.match_programmazione_to_partecipazioni(
    p_programmazione_id uuid,
    p_soglia_titolo numeric,
    p_artista_ids uuid[],
    p_tolleranza_anno_soft integer,
    p_tolleranza_anno_hard integer,
    p_mandato_override_artist_ids uuid[]
)
RETURNS TABLE (
    partecipazione_id uuid,
    opera_id uuid,
    episodio_id uuid,
    artista_id uuid,
    ruolo_id uuid,
    punteggio numeric,
    dettagli_matching jsonb
)
LANGUAGE sql
STABLE
AS $function$
  WITH prog AS (
    SELECT
      p.id,
      p.campagna_programmazione_id,
      p.titolo,
      p.titolo_originale,
      p.numero_stagione,
      p.numero_episodio,
      p.titolo_episodio,
      p.titolo_episodio_originale
    FROM public.programmazioni p
    WHERE p.id = p_programmazione_id
  ),
  anno_competenza AS (
    SELECT cp.anno AS anno
    FROM prog p
    JOIN public.campagne_programmazione cp
      ON cp.id = p.campagna_programmazione_id
  ),
  raw_matches AS (
    SELECT
      m.*,
      o.tipo AS opera_tipo,
      o.titolo AS opera_titolo,
      p.titolo AS prog_titolo,
      p.titolo_originale AS prog_titolo_originale,
      p.numero_stagione AS prog_numero_stagione,
      p.numero_episodio AS prog_numero_episodio,
      p.titolo_episodio AS prog_titolo_episodio,
      p.titolo_episodio_originale AS prog_titolo_episodio_originale,
      (
        p.numero_stagione IS NOT NULL
        OR p.numero_episodio IS NOT NULL
        OR NULLIF(BTRIM(COALESCE(p.titolo_episodio, '')), '') IS NOT NULL
        OR NULLIF(BTRIM(COALESCE(p.titolo_episodio_originale, '')), '') IS NOT NULL
      ) AS has_episode_columns,
      (
        COALESCE(p.titolo, '') ~* '\s*:\s*(SEASON|PARTE|PART|VOLUME|VOL|CHAPTER|LIMITED\s+SERIES|COLLECTION|STAGIONE)\y'
        OR COALESCE(p.titolo_originale, '') ~* '\s*:\s*(SEASON|PARTE|PART|VOLUME|VOL|CHAPTER|LIMITED\s+SERIES|COLLECTION|STAGIONE)\y'
      ) AS has_series_title_signal,
      COALESCE((m.dettagli_matching->>'episodio_mancante')::boolean, false) AS is_missing_episode,
      COALESCE((m.dettagli_matching #>> '{totale,episodio_applicato}')::boolean, false) AS is_episode_applied
    FROM prog p
    CROSS JOIN LATERAL public.match_programmazione_to_partecipazioni(
      p.id,
      p_soglia_titolo,
      p_artista_ids,
      p_tolleranza_anno_soft,
      p_tolleranza_anno_hard
    ) m
    JOIN public.opere o
      ON o.id = m.opera_id
  ),
  classified AS (
    SELECT
      r.*,
      CASE
        WHEN r.opera_tipo = 'serie_tv'::public.tipo_opera
          AND r.is_missing_episode
          THEN 'catalog_episode_not_censito'
        WHEN r.opera_tipo = 'serie_tv'::public.tipo_opera
          AND NOT r.is_episode_applied
          AND NOT r.is_missing_episode
          AND (r.has_episode_columns OR r.has_series_title_signal)
          THEN 'programmazione_episode_data_invalid'
        WHEN r.opera_tipo = 'film'::public.tipo_opera
          AND (r.has_episode_columns OR r.has_series_title_signal)
          THEN 'programmazione_episode_data_invalid'
        ELSE NULL
      END AS episode_alert_type
    FROM raw_matches r
  ),
  actual_matches AS (
    SELECT
      c.partecipazione_id,
      c.opera_id,
      c.episodio_id,
      c.artista_id,
      c.ruolo_id,
      c.punteggio,
      CASE
        WHEN c.opera_tipo = 'film'::public.tipo_opera THEN
          jsonb_set(c.dettagli_matching, '{episodio_mancante}', 'false'::jsonb, true)
        ELSE c.dettagli_matching
      END AS dettagli_matching
    FROM classified c
    CROSS JOIN anno_competenza ac
    WHERE c.episode_alert_type IS NULL
      AND c.artista_id IS NOT NULL
      AND public.artist_mandate_covers_year(
        c.artista_id,
        ac.anno,
        p_mandato_override_artist_ids
      )
  ),
  alert_matches AS (
    SELECT DISTINCT ON (c.opera_id, c.episode_alert_type)
      NULL::uuid AS partecipazione_id,
      c.opera_id,
      NULL::uuid AS episodio_id,
      NULL::uuid AS artista_id,
      NULL::uuid AS ruolo_id,
      c.punteggio,
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(c.dettagli_matching, '{alert_only}', 'true'::jsonb, true),
            '{episode_alert_type}',
            to_jsonb(c.episode_alert_type),
            true
          ),
          '{episodio_mancante}',
          to_jsonb(c.episode_alert_type = 'catalog_episode_not_censito'),
          true
        ),
        '{motivo_esclusione}',
        to_jsonb(
          CASE c.episode_alert_type
            WHEN 'catalog_episode_not_censito'
              THEN 'Episodio non censito per una serie trovata'
            ELSE 'Dati episodio programmazione mancanti, incoerenti o incompatibili con il tipo opera'
          END
        ),
        true
      ) AS dettagli_matching
    FROM classified c
    WHERE c.episode_alert_type IS NOT NULL
    ORDER BY c.opera_id, c.episode_alert_type, c.punteggio DESC
  )
  SELECT
    a.partecipazione_id,
    a.opera_id,
    a.episodio_id,
    a.artista_id,
    a.ruolo_id,
    a.punteggio,
    jsonb_set(
      a.dettagli_matching,
      '{mandato}',
      jsonb_build_object(
        'anno_competenza', ac.anno,
        'criterio', 'anno_campagna_programmazione',
        'override', COALESCE(
          p_mandato_override_artist_ids IS NOT NULL
          AND a.artista_id = ANY(p_mandato_override_artist_ids),
          false
        )
      ),
      true
    ) AS dettagli_matching
  FROM actual_matches a
  CROSS JOIN anno_competenza ac

  UNION ALL

  SELECT
    al.partecipazione_id,
    al.opera_id,
    al.episodio_id,
    al.artista_id,
    al.ruolo_id,
    al.punteggio,
    al.dettagli_matching
  FROM alert_matches al;
$function$;

COMMENT ON FUNCTION public.match_programmazione_to_partecipazioni(uuid, numeric, uuid[], integer, integer, uuid[])
IS 'Mandate-aware matcher. Real rows become individuazioni; episode/catalog diagnostics are emitted as alert-only rows for process_programmazioni_chunk.';

CREATE OR REPLACE FUNCTION public.process_programmazioni_chunk(
    p_campagne_individuazione_id uuid,
    p_programmazione_ids uuid[],
    p_soglia_titolo numeric DEFAULT 0.7,
    p_artista_ids uuid[] DEFAULT NULL::uuid[],
    p_tolleranza_anno_soft integer DEFAULT 3,
    p_tolleranza_anno_hard integer DEFAULT 5,
    p_mandato_override_artist_ids uuid[] DEFAULT NULL::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_programmazione RECORD;
    v_match RECORD;
    v_individuazioni_create INTEGER := 0;
    v_programmazioni_processate INTEGER := 0;
    v_programmazioni_con_match INTEGER := 0;
    v_match_trovati INTEGER := 0;
    v_alerts_create INTEGER := 0;
    v_count INTEGER;
    v_prog_id UUID;
    v_new_ind_id UUID;
    v_alert_type TEXT;
BEGIN
    FOREACH v_prog_id IN ARRAY p_programmazione_ids
    LOOP
        SELECT * INTO v_programmazione
        FROM public.programmazioni
        WHERE id = v_prog_id;

        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        v_programmazioni_processate := v_programmazioni_processate + 1;

        DELETE FROM public.campagne_individuazione_episode_alerts
        WHERE campagne_individuazione_id = p_campagne_individuazione_id
          AND programmazione_id = v_programmazione.id;

        DECLARE
            v_prog_ha_match BOOLEAN := FALSE;
        BEGIN
            FOR v_match IN
                SELECT * FROM public.match_programmazione_to_partecipazioni(
                    v_programmazione.id,
                    p_soglia_titolo,
                    p_artista_ids,
                    p_tolleranza_anno_soft,
                    p_tolleranza_anno_hard,
                    p_mandato_override_artist_ids
                )
            LOOP
                IF COALESCE((v_match.dettagli_matching->>'alert_only')::boolean, FALSE) THEN
                    v_alert_type := v_match.dettagli_matching->>'episode_alert_type';

                    IF v_alert_type IS NOT NULL THEN
                        INSERT INTO public.campagne_individuazione_episode_alerts (
                            campagne_individuazione_id,
                            programmazione_id,
                            opera_id,
                            tipo_alert,
                            numero_stagione,
                            numero_episodio,
                            titolo,
                            titolo_originale,
                            titolo_episodio,
                            dettagli
                        ) VALUES (
                            p_campagne_individuazione_id,
                            v_programmazione.id,
                            v_match.opera_id,
                            v_alert_type,
                            v_programmazione.numero_stagione,
                            v_programmazione.numero_episodio,
                            v_programmazione.titolo,
                            v_programmazione.titolo_originale,
                            v_programmazione.titolo_episodio,
                            v_match.dettagli_matching
                        )
                        ON CONFLICT (
                            campagne_individuazione_id,
                            programmazione_id,
                            opera_id,
                            tipo_alert
                        )
                        DO UPDATE SET
                            numero_stagione = EXCLUDED.numero_stagione,
                            numero_episodio = EXCLUDED.numero_episodio,
                            titolo = EXCLUDED.titolo,
                            titolo_originale = EXCLUDED.titolo_originale,
                            titolo_episodio = EXCLUDED.titolo_episodio,
                            dettagli = EXCLUDED.dettagli,
                            updated_at = now();

                        v_alerts_create := v_alerts_create + 1;
                    END IF;

                    CONTINUE;
                END IF;

                v_match_trovati := v_match_trovati + 1;
                v_prog_ha_match := TRUE;

                SELECT COUNT(*) INTO v_count
                FROM public.individuazioni
                WHERE campagna_individuazioni_id = p_campagne_individuazione_id
                  AND programmazione_id = v_programmazione.id
                  AND artista_id = v_match.artista_id
                  AND ruolo_id = v_match.ruolo_id
                  AND COALESCE(episodio_id, '00000000-0000-0000-0000-000000000000'::UUID) =
                      COALESCE(v_match.episodio_id, '00000000-0000-0000-0000-000000000000'::UUID);

                IF v_count = 0 THEN
                    INSERT INTO public.individuazioni (
                        campagna_individuazioni_id, programmazione_id, partecipazione_id,
                        artista_id, ruolo_id, opera_id, episodio_id, emittente_id,
                        data_trasmissione, ora_inizio, ora_fine, durata_minuti,
                        metadati_trasmissione, canale, emittente, tipo, titolo,
                        titolo_originale, numero_episodio, titolo_episodio,
                        titolo_episodio_originale, numero_stagione, anno, production,
                        regia, data_inizio, data_fine, retail_price, sales_month,
                        track_price_local_currency, views, total_net_ad_revenue,
                        total_revenue, punteggio_matching, dettagli_matching, metodo, stato
                    ) VALUES (
                        p_campagne_individuazione_id, v_programmazione.id, v_match.partecipazione_id,
                        v_match.artista_id, v_match.ruolo_id, v_match.opera_id, v_match.episodio_id,
                        v_programmazione.emittente_id, v_programmazione.data_trasmissione,
                        v_programmazione.ora_inizio, v_programmazione.ora_fine, v_programmazione.durata_minuti,
                        v_programmazione.metadati_trasmissione, v_programmazione.canale, v_programmazione.emittente,
                        v_programmazione.tipo, v_programmazione.titolo, v_programmazione.titolo_originale,
                        v_programmazione.numero_episodio, v_programmazione.titolo_episodio,
                        v_programmazione.titolo_episodio_originale, v_programmazione.numero_stagione,
                        v_programmazione.anno, v_programmazione.production, v_programmazione.regia,
                        v_programmazione.data_inizio, v_programmazione.data_fine, v_programmazione.retail_price,
                        v_programmazione.sales_month, v_programmazione.track_price_local_currency,
                        v_programmazione.views, v_programmazione.total_net_ad_revenue, v_programmazione.total_revenue,
                        v_match.punteggio, v_match.dettagli_matching, 'automatico', 'individuato'
                    )
                    RETURNING id INTO v_new_ind_id;

                    v_individuazioni_create := v_individuazioni_create + 1;
                END IF;
            END LOOP;

            IF v_prog_ha_match THEN
                v_programmazioni_con_match := v_programmazioni_con_match + 1;
            END IF;
        END;

        INSERT INTO public.campagne_individuazione_processed_programmazioni (
            campagne_individuazione_id, programmazione_id
        )
        VALUES (p_campagne_individuazione_id, v_prog_id)
        ON CONFLICT (campagne_individuazione_id, programmazione_id)
        DO UPDATE SET processed_at = EXCLUDED.processed_at;

        UPDATE public.programmazioni SET processato = true WHERE id = v_prog_id;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'programmazioni_processate', v_programmazioni_processate,
        'programmazioni_con_match', v_programmazioni_con_match,
        'individuazioni_create', v_individuazioni_create,
        'episode_alerts_create', v_alerts_create,
        'match_trovati', v_match_trovati
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'programmazioni_processate', v_programmazioni_processate,
            'individuazioni_create', v_individuazioni_create,
            'episode_alerts_create', v_alerts_create
        );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_individuazione_episode_alert_summary(
  p_campagna_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_individuazione_episode_alert_summary(uuid) TO authenticated;
