-- partita_iva era BIGINT: uno zero iniziale non poteva essere conservato
-- (01234567897 diventava 1234567897).
--
-- Conversione a TEXT.
-- Solo i valori numerici più corti di 11 cifre ricevono lpad a 11 con zeri.
-- Restano invariati:
--   NULL
--   valori già di 11 cifre o più
--   valori non numerici (un BIGINT non ne ha, salvo un eventuale segno meno)
--
-- Esempi:
--   NULL            -> NULL
--   12345678903     -> '12345678903'
--   1234567897      -> '01234567897'
--   0               -> '00000000000'

ALTER TABLE public.artisti
  ALTER COLUMN partita_iva TYPE text
  USING (
    CASE
      WHEN partita_iva IS NULL THEN NULL
      WHEN partita_iva::text ~ '^[0-9]+$' AND char_length(partita_iva::text) < 11
        THEN lpad(partita_iva::text, 11, '0')
      ELSE partita_iva::text
    END
  );

COMMENT ON COLUMN public.artisti.partita_iva IS
  'Partita IVA, testo per conservare gli zeri iniziali. In migrazione da BIGINT, i valori numerici più corti di 11 cifre sono stati portati a 11 con lpad.';

-- La funzione di import non deve più fare il cast a bigint, altrimenti
-- lo zero iniziale si perde di nuovo in scrittura.
CREATE OR REPLACE FUNCTION public.apply_artisti_contatti_import(p_patches jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_patch jsonb;
  v_id uuid;
  v_count int := 0;
  v_updated int := 0;
BEGIN
  IF get_user_role() IS DISTINCT FROM 'admin' AND get_user_role() IS DISTINCT FROM 'operatore' THEN
    RAISE EXCEPTION 'Solo amministratori e operatori possono aggiornare i contatti';
  END IF;
  IF jsonb_typeof(p_patches) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Elenco aggiornamenti non valido';
  END IF;
  IF jsonb_array_length(p_patches) > 5000 THEN
    RAISE EXCEPTION 'Troppi aggiornamenti';
  END IF;

  FOR v_patch IN SELECT value FROM jsonb_array_elements(p_patches)
  LOOP
    v_id := (v_patch->>'artista_id')::uuid;
    UPDATE public.artisti AS a
    SET
      contatti = CASE WHEN jsonb_exists(v_patch, 'contatti') THEN v_patch->'contatti' ELSE a.contatti END,
      indirizzo = CASE WHEN jsonb_exists(v_patch, 'indirizzo') THEN v_patch->'indirizzo' ELSE a.indirizzo END,
      codice_fiscale = CASE WHEN jsonb_exists(v_patch, 'codice_fiscale') THEN v_patch->>'codice_fiscale' ELSE a.codice_fiscale END,
      partita_iva = CASE WHEN jsonb_exists(v_patch, 'partita_iva') THEN v_patch->>'partita_iva' ELSE a.partita_iva END
    WHERE a.id = v_id;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      RAISE EXCEPTION 'Artista non trovato o non aggiornabile';
    END IF;

    IF jsonb_exists(v_patch, 'riservati') THEN
      INSERT INTO public.artisti_dati_riservati (artista_id, regime, tassazione, dettagli_regime)
      VALUES (
        v_id,
        NULLIF(v_patch->'riservati'->>'regime', ''),
        NULLIF(v_patch->'riservati'->>'tassazione', ''),
        NULLIF(v_patch->'riservati'->>'dettagli_regime', '')
      )
      ON CONFLICT (artista_id) DO UPDATE SET
        regime = EXCLUDED.regime,
        tassazione = EXCLUDED.tassazione,
        dettagli_regime = EXCLUDED.dettagli_regime;
    END IF;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('aggiornati', v_count);
END;
$$;
