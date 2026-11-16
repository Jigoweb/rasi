-- Correzione dei campi di programmazioni già caricate, ricaricando lo stesso file
-- («Correggi dati dal file» nella scheda campagna).
--
-- Novembre 2026: date PLEX vuote, orari Sky persi e titoli con «Ã» finale per
-- difetti di lettura del file, corretti nel worker. I file originali non sono
-- più in Storage e cancellare le campagne vorrebbe dire rifare le
-- individuazioni. import_row_uid è l'hash della riga originale del file:
-- ricaricando lo stesso file ogni riga ritrova la sua programmazione, che viene
-- aggiornata solo nei campi qui sotto. Id e individuazioni restano gli stessi.
--
-- Entrambe le funzioni sono SECURITY DEFINER ed eseguibili solo da
-- service_role: le chiama il worker dopo aver verificato utente e campagna.

CREATE OR REPLACE FUNCTION public.riprocessa_campi_programmazioni(
  p_campagna_programmazione_id uuid,
  p_righe jsonb,
  p_applica boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_risultato jsonb;
  v_aggiornate integer := 0;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS pg_temp.riprocesso_diff (
    id uuid PRIMARY KEY,
    titolo_attuale text,
    data_attuale date,
    data_nuova date,
    ora_inizio_attuale time,
    ora_inizio_nuova time,
    ora_fine_nuova time,
    titolo_nuovo text,
    titolo_originale_nuovo text,
    titolo_episodio_nuovo text,
    titolo_episodio_originale_nuovo text,
    regia_nuova text,
    canale_nuovo text,
    cambia_data boolean,
    cambia_ora_inizio boolean,
    cambia_ora_fine boolean,
    cambia_titoli boolean
  ) ON COMMIT DROP;
  TRUNCATE pg_temp.riprocesso_diff;

  INSERT INTO pg_temp.riprocesso_diff
  SELECT
    p.id,
    p.titolo,
    p.data_trasmissione,
    r.data_trasmissione,
    p.ora_inizio,
    r.ora_inizio,
    r.ora_fine,
    r.titolo,
    r.titolo_originale,
    r.titolo_episodio,
    r.titolo_episodio_originale,
    r.regia,
    r.canale,
    r.data_trasmissione IS NOT NULL AND r.data_trasmissione IS DISTINCT FROM p.data_trasmissione,
    r.ora_inizio IS NOT NULL AND r.ora_inizio IS DISTINCT FROM p.ora_inizio,
    r.ora_fine IS NOT NULL AND r.ora_fine IS DISTINCT FROM p.ora_fine,
    (r.titolo IS NOT NULL AND r.titolo IS DISTINCT FROM p.titolo)
      OR (r.titolo_originale IS NOT NULL AND r.titolo_originale IS DISTINCT FROM p.titolo_originale)
      OR (r.titolo_episodio IS NOT NULL AND r.titolo_episodio IS DISTINCT FROM p.titolo_episodio)
      OR (r.titolo_episodio_originale IS NOT NULL AND r.titolo_episodio_originale IS DISTINCT FROM p.titolo_episodio_originale)
      OR (r.regia IS NOT NULL AND r.regia IS DISTINCT FROM p.regia)
      OR (r.canale IS NOT NULL AND r.canale IS DISTINCT FROM p.canale)
  FROM jsonb_to_recordset(COALESCE(p_righe, '[]'::jsonb)) AS r(
    import_row_uid text,
    data_trasmissione date,
    ora_inizio time,
    ora_fine time,
    titolo text,
    titolo_originale text,
    titolo_episodio text,
    titolo_episodio_originale text,
    regia text,
    canale text
  )
  JOIN public.programmazioni p
    ON p.import_row_uid = r.import_row_uid
   AND p.campagna_programmazione_id = p_campagna_programmazione_id
  ON CONFLICT (id) DO NOTHING;

  SELECT jsonb_build_object(
    'righe_inviate', jsonb_array_length(COALESCE(p_righe, '[]'::jsonb)),
    'ritrovate', count(*),
    'cambi', jsonb_build_object(
      'data_trasmissione', count(*) FILTER (WHERE cambia_data),
      'ora_inizio', count(*) FILTER (WHERE cambia_ora_inizio),
      'ora_fine', count(*) FILTER (WHERE cambia_ora_fine),
      'titoli', count(*) FILTER (WHERE cambia_titoli)
    ),
    'esempi', COALESCE((
      SELECT jsonb_agg(e)
      FROM (
        SELECT jsonb_build_object(
          'titolo_attuale', d.titolo_attuale,
          'titolo_nuovo', CASE WHEN d.cambia_titoli THEN d.titolo_nuovo END,
          'data_attuale', d.data_attuale,
          'data_nuova', CASE WHEN d.cambia_data THEN d.data_nuova END,
          'ora_attuale', d.ora_inizio_attuale,
          'ora_nuova', CASE WHEN d.cambia_ora_inizio THEN d.ora_inizio_nuova END
        ) AS e
        FROM pg_temp.riprocesso_diff d
        WHERE d.cambia_data OR d.cambia_ora_inizio OR d.cambia_ora_fine OR d.cambia_titoli
        ORDER BY d.id
        LIMIT 5
      ) esempi
    ), '[]'::jsonb)
  )
  INTO v_risultato
  FROM pg_temp.riprocesso_diff;

  IF p_applica THEN
    UPDATE public.programmazioni p
    SET
      data_trasmissione = CASE WHEN d.cambia_data THEN d.data_nuova ELSE p.data_trasmissione END,
      ora_inizio = CASE WHEN d.cambia_ora_inizio THEN d.ora_inizio_nuova ELSE p.ora_inizio END,
      ora_fine = CASE WHEN d.cambia_ora_fine THEN d.ora_fine_nuova ELSE p.ora_fine END,
      titolo = COALESCE(d.titolo_nuovo, p.titolo),
      titolo_originale = COALESCE(d.titolo_originale_nuovo, p.titolo_originale),
      titolo_episodio = COALESCE(d.titolo_episodio_nuovo, p.titolo_episodio),
      titolo_episodio_originale = COALESCE(d.titolo_episodio_originale_nuovo, p.titolo_episodio_originale),
      regia = COALESCE(d.regia_nuova, p.regia),
      canale = COALESCE(d.canale_nuovo, p.canale)
    FROM pg_temp.riprocesso_diff d
    WHERE p.id = d.id
      AND (d.cambia_data OR d.cambia_ora_inizio OR d.cambia_ora_fine OR d.cambia_titoli);
    GET DIAGNOSTICS v_aggiornate = ROW_COUNT;
  END IF;

  RETURN v_risultato || jsonb_build_object('aggiornate', v_aggiornate, 'applicato', p_applica);
END;
$function$;

-- Le individuazioni copiano data e orari della programmazione al momento del
-- match: dopo la correzione vanno riallineate.
CREATE OR REPLACE FUNCTION public.riallinea_individuazioni_da_programmazioni(
  p_campagna_programmazione_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_aggiornate integer;
BEGIN
  UPDATE public.individuazioni i
  SET
    data_trasmissione = p.data_trasmissione,
    ora_inizio = p.ora_inizio,
    ora_fine = p.ora_fine
  FROM public.programmazioni p
  WHERE i.campagna_individuazioni_id IN (
      SELECT ci.id FROM public.campagne_individuazione ci
      WHERE ci.campagne_programmazione_id = p_campagna_programmazione_id
    )
    AND p.id = i.programmazione_id
    AND (
      i.data_trasmissione IS DISTINCT FROM p.data_trasmissione
      OR i.ora_inizio IS DISTINCT FROM p.ora_inizio
      OR i.ora_fine IS DISTINCT FROM p.ora_fine
    );
  GET DIAGNOSTICS v_aggiornate = ROW_COUNT;
  RETURN v_aggiornate;
END;
$function$;

REVOKE ALL ON FUNCTION public.riprocessa_campi_programmazioni(uuid, jsonb, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.riallinea_individuazioni_da_programmazioni(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.riprocessa_campi_programmazioni(uuid, jsonb, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.riallinea_individuazioni_da_programmazioni(uuid) TO service_role;
