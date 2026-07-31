-- Lista operativa degli episode alert per la scheda individuazione.
-- SECURITY DEFINER come il summary: la tabella è RLS-locked (service_only).

CREATE OR REPLACE FUNCTION public.get_individuazione_episode_alerts(
  p_campagna_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_individuazione_episode_alerts(uuid) TO authenticated;
