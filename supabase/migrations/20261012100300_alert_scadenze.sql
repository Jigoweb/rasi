-- Alert in app per la dashboard:
--   documento_scadenza   documento d'identità scaduto o in scadenza (60 giorni)
--   maggiore_eta         l'artista compie 18 anni entro un mese
--   minorenne_da_aggiornare  stato ancora "minorenne" dopo i 18 anni
--   over_80              l'artista ha compiuto 80 anni
--   opera_av_50          opera audiovisiva con 50+ anni dall'anno di produzione
--   opera_musica_70      opera musicale con 70+ anni dall'anno di produzione
-- Ogni alert si può segnare come "presa visione"; la chiave include la data
-- di riferimento quando serve (es. un documento rinnovato genera un nuovo alert).

CREATE TABLE IF NOT EXISTS public.alert_prese_visione (
  alert_key   TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  presa_da    UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  presa_il    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (alert_key, entity_id)
);

ALTER TABLE public.alert_prese_visione ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alert_prese_visione_select_policy" ON public.alert_prese_visione;
CREATE POLICY "alert_prese_visione_select_policy" ON public.alert_prese_visione
  FOR SELECT
  USING (get_user_role() IN ('admin', 'operatore', 'readonly'));

DROP POLICY IF EXISTS "alert_prese_visione_write_policy" ON public.alert_prese_visione;
CREATE POLICY "alert_prese_visione_write_policy" ON public.alert_prese_visione
  FOR ALL
  USING (get_user_role() IN ('admin', 'operatore'))
  WITH CHECK (get_user_role() IN ('admin', 'operatore'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_prese_visione TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_alert_scadenze(
  p_oggi date DEFAULT CURRENT_DATE,
  p_giorni_documento integer DEFAULT 60
)
RETURNS TABLE (
  alert_key         text,
  tipo              text,
  severita          text,
  entity_type       text,
  entity_id         uuid,
  titolo            text,
  dettaglio         text,
  data_riferimento  date
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH art AS (
    SELECT
      a.id,
      trim(a.nome::text || ' ' || a.cognome::text) AS nome_completo,
      a.stato::text AS stato,
      a.data_nascita,
      a.documento_data_scadenza,
      a.documento_tipo,
      (a.data_nascita + interval '18 years')::date AS compie_18,
      (a.data_nascita + interval '80 years')::date AS compie_80
    FROM public.artisti a
    WHERE COALESCE(a.stato::text, 'attivo') NOT IN ('deceduto', 'cessato')
  ),
  candidati AS (
    SELECT
      'documento_scadenza:' || art.documento_data_scadenza::text AS alert_key,
      'documento_scadenza' AS tipo,
      CASE WHEN art.documento_data_scadenza < p_oggi THEN 'high' ELSE 'medium' END AS severita,
      'artista' AS entity_type,
      art.id AS entity_id,
      art.nome_completo AS titolo,
      CASE
        WHEN art.documento_data_scadenza < p_oggi THEN 'Documento scaduto'
        ELSE 'Documento in scadenza'
      END || COALESCE(' (' || NULLIF(art.documento_tipo, '') || ')', '') AS dettaglio,
      art.documento_data_scadenza AS data_riferimento
    FROM art
    WHERE art.documento_data_scadenza IS NOT NULL
      AND art.documento_data_scadenza <= p_oggi + p_giorni_documento

    UNION ALL

    SELECT
      'maggiore_eta:' || art.compie_18::text,
      'maggiore_eta',
      'medium',
      'artista',
      art.id,
      art.nome_completo,
      'Compie 18 anni: preparare la nuova documentazione',
      art.compie_18
    FROM art
    WHERE art.compie_18 >= p_oggi
      AND art.compie_18 <= (p_oggi + interval '1 month')::date

    UNION ALL

    SELECT
      'minorenne_da_aggiornare:' || art.compie_18::text,
      'minorenne_da_aggiornare',
      'high',
      'artista',
      art.id,
      art.nome_completo,
      'Maggiorenne ma ancora in stato "Minorenne"',
      art.compie_18
    FROM art
    WHERE art.stato = 'minorenne'
      AND art.compie_18 < p_oggi

    UNION ALL

    SELECT
      'over_80',
      'over_80',
      'low',
      'artista',
      art.id,
      art.nome_completo,
      'Ha compiuto 80 anni',
      art.compie_80
    FROM art
    WHERE art.compie_80 <= p_oggi

    UNION ALL

    SELECT
      CASE WHEN o.tipo::text = 'musicale' THEN 'opera_musica_70' ELSE 'opera_av_50' END,
      CASE WHEN o.tipo::text = 'musicale' THEN 'opera_musica_70' ELSE 'opera_av_50' END,
      'low',
      'opera',
      o.id,
      o.titolo::text,
      CASE
        WHEN o.tipo::text = 'musicale' THEN 'Opera musicale: 70 anni dalla produzione (' || o.anno_produzione || ')'
        ELSE 'Opera audiovisiva: 50 anni dalla produzione (' || o.anno_produzione || ')'
      END,
      make_date(
        o.anno_produzione + CASE WHEN o.tipo::text = 'musicale' THEN 70 ELSE 50 END,
        1,
        1
      )
    FROM public.opere o
    WHERE o.anno_produzione IS NOT NULL
      AND o.anno_produzione + CASE WHEN o.tipo::text = 'musicale' THEN 70 ELSE 50 END
          <= EXTRACT(YEAR FROM p_oggi)::int
  )
  SELECT c.*
  FROM candidati c
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.alert_prese_visione pv
    WHERE pv.alert_key = c.alert_key
      AND pv.entity_id = c.entity_id
  )
  ORDER BY
    CASE c.severita WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
    c.data_riferimento,
    c.titolo
$$;

GRANT EXECUTE ON FUNCTION public.get_alert_scadenze(date, integer) TO authenticated, service_role;
