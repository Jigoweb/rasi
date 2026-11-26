-- Dettaglio individuazione: «Apri coda revisione» non caricava nulla.
--
-- get_individuazione_episode_alerts(uuid) restituisce in un solo jsonb TUTTI
-- gli alert della campagna, ciascuno con il join su programmazioni. Sulle
-- campagne grandi (6.000-7.300 alert) la lettura a cache fredda delle
-- programmazioni (una lettura casuale per alert) supera i 7 s e lo
-- statement_timeout di 8 s delle chiamate dall'app annulla la query: il
-- pannello mostra «Impossibile caricare il dettaglio degli alert episodi».
--
-- Nuova RPC paginata con lo stesso ordinamento e lo stesso controllo di ruolo.
-- La funzione esistente resta invariata per compatibilità.
--
-- In più: indice per l'ordinamento di default della tabella individuazioni
-- («priorità di revisione»: stato, punteggio, data trasmissione), che oggi
-- legge tutte le righe della campagna e le riordina (≈3 s a cache fredda su
-- 25.000 individuazioni).

CREATE OR REPLACE FUNCTION public.get_individuazione_episode_alerts_page(
  p_campagna_id uuid,
  p_limit integer,
  p_offset integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 500);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'admin'::public.ruolo_utente
     AND public.get_user_role() IS DISTINCT FROM 'operatore'::public.ruolo_utente
     AND public.get_user_role() IS DISTINCT FROM 'operatore_base'::public.ruolo_utente THEN
    RAISE EXCEPTION 'insufficient_privilege'
      USING ERRCODE = '42501';
  END IF;

  RETURN (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', page.id,
          'tipoAlert', page.tipo_alert,
          'programmazioneId', page.programmazione_id,
          'operaId', page.opera_id,
          'campagneProgrammazioneId', p.campagna_programmazione_id,
          'numeroStagione', page.numero_stagione,
          'numeroEpisodio', page.numero_episodio,
          'titolo', COALESCE(
            NULLIF(BTRIM(page.titolo), ''),
            NULLIF(BTRIM(p.titolo), ''),
            NULLIF(BTRIM(page.opera_titolo), ''),
            '-'
          ),
          'titoloOriginale', page.titolo_originale,
          'titoloEpisodio', COALESCE(
            NULLIF(BTRIM(page.titolo_episodio), ''),
            NULLIF(BTRIM(p.titolo_episodio), '')
          ),
          'operaTitolo', page.opera_titolo,
          'dataTrasmissione', p.data_trasmissione,
          'oraInizio', p.ora_inizio
        )
        ORDER BY page.rn
      ),
      '[]'::jsonb
    )
    FROM (
      -- Prima si sceglie la pagina (alert + opere, tabelle piccole), poi si
      -- leggono le sole programmazioni della pagina.
      SELECT
        a.*,
        o.titolo AS opera_titolo,
        row_number() OVER (
          ORDER BY
            a.tipo_alert,
            lower(COALESCE(o.titolo, a.titolo, '')),
            COALESCE(a.numero_stagione, 2147483647),
            COALESCE(a.numero_episodio, 2147483647),
            a.id
        ) AS rn
      FROM public.campagne_individuazione_episode_alerts a
      LEFT JOIN public.opere o ON o.id = a.opera_id
      WHERE a.campagne_individuazione_id = p_campagna_id
      ORDER BY rn
      LIMIT v_limit
      OFFSET v_offset
    ) page
    LEFT JOIN public.programmazioni p ON p.id = page.programmazione_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_individuazione_episode_alerts_page(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_individuazione_episode_alerts_page(uuid, integer, integer) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_individuazioni_campagna_review_priority
  ON public.individuazioni (
    campagna_individuazioni_id,
    stato,
    punteggio_matching,
    data_trasmissione DESC
  );
