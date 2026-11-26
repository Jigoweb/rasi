-- Eliminazione artista con scelta sulle partecipazioni.
--
-- Prima: l'elenco artisti bloccava l'eliminazione se l'artista aveva anche una
-- sola partecipazione; senza partecipazioni la DELETE diretta dal client poteva
-- fallire senza messaggio (individuazioni.artista_id ON DELETE RESTRICT,
-- ripartizioni.artista_id senza azione, RLS solo admin: 0 righe e nessun
-- errore per gli altri ruoli). L'errore finiva solo in console.
--
-- Ora l'app chiama delete_artista_safe:
--   p_partecipazioni = 'mantieni' -> ogni partecipazione diventa una voce di
--     cast esterno dell'opera (nome, ruolo, personaggio, episodio): l'opera non
--     perde il credito, ma non è più collegata a un artista RASI. Si può
--     ricollegare in seguito con «Converti in partecipazioni».
--   p_partecipazioni = 'elimina'  -> le partecipazioni vengono eliminate.
-- Individuazioni e ripartizioni restano un blocco esplicito (codici errore con
-- i conteggi): sono dati di ripartizione e non vengono toccati.

CREATE OR REPLACE FUNCTION public.delete_artista_safe(
  p_artista_id uuid,
  p_partecipazioni text DEFAULT 'elimina'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_artista public.artisti%ROWTYPE;
  v_nome text;
  v_individuazioni integer := 0;
  v_ripartizioni integer := 0;
  v_partecipazioni integer := 0;
  v_cast_creati integer := 0;
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'admin'::public.ruolo_utente THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solo un amministratore può eliminare un artista',
      'error_code', 'FORBIDDEN'
    );
  END IF;

  IF p_partecipazioni NOT IN ('mantieni', 'elimina') THEN
    RAISE EXCEPTION 'p_partecipazioni deve essere mantieni o elimina' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_artista FROM public.artisti WHERE id = p_artista_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Artista non trovato', 'error_code', 'NOT_FOUND');
  END IF;

  SELECT COUNT(*)::integer INTO v_individuazioni FROM public.individuazioni WHERE artista_id = p_artista_id;
  SELECT COUNT(*)::integer INTO v_ripartizioni FROM public.ripartizioni WHERE artista_id = p_artista_id;

  IF v_individuazioni > 0 OR v_ripartizioni > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'L''artista ha individuazioni o ripartizioni collegate',
      'error_code', 'HAS_INDIVIDUAZIONI',
      'individuazioni_count', v_individuazioni,
      'ripartizioni_count', v_ripartizioni
    );
  END IF;

  SELECT COUNT(*)::integer INTO v_partecipazioni FROM public.partecipazioni WHERE artista_id = p_artista_id;

  IF p_partecipazioni = 'mantieni' AND v_partecipazioni > 0 THEN
    v_nome := COALESCE(
      NULLIF(BTRIM(v_artista.nome_arte), ''),
      NULLIF(BTRIM(CONCAT_WS(' ', v_artista.nome, v_artista.cognome)), ''),
      'Artista eliminato'
    );

    INSERT INTO public.cast_esterno (
      opera_id, episodio_id, nome, personaggio, ruolo, ruolo_id, primarieta, fonte, ordine
    )
    SELECT
      p.opera_id,
      p.episodio_id,
      v_nome,
      p.personaggio,
      CASE WHEN rt.nome ILIKE '%doppia%' THEN 'doppiatore' ELSE 'attore' END,
      p.ruolo_id,
      CASE
        WHEN p.metadati->>'primarieta' IN ('primario', 'comprimario')
          THEN (p.metadati->>'primarieta')::public.primarieta_cast
        WHEN rt.nome ILIKE '%comprimario%' THEN 'comprimario'::public.primarieta_cast
        ELSE 'primario'::public.primarieta_cast
      END,
      'manuale',
      0
    FROM public.partecipazioni p
    LEFT JOIN public.ruoli_tipologie rt ON rt.id = p.ruolo_id
    WHERE p.artista_id = p_artista_id;
    GET DIAGNOSTICS v_cast_creati = ROW_COUNT;
  END IF;

  -- partecipazioni, note, referenti e dati riservati: ON DELETE CASCADE
  DELETE FROM public.artisti WHERE id = p_artista_id;

  RETURN jsonb_build_object(
    'success', true,
    'partecipazioni_eliminate', v_partecipazioni,
    'cast_esterno_creati', v_cast_creati
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.delete_artista_safe(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_artista_safe(uuid, text) TO authenticated, service_role;
