-- Regime, tassazione e dettagli di regime dell'artista.
-- Tabella separata: la riga artisti resta leggibile dall'artista e dal ruolo readonly,
-- questi tre campi no. RLS consente solo admin e operatore.

CREATE TABLE IF NOT EXISTS public.artisti_dati_riservati (
  artista_id       UUID PRIMARY KEY REFERENCES public.artisti(id) ON DELETE CASCADE,
  regime           TEXT,
  tassazione       TEXT,
  dettagli_regime  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.artisti_dati_riservati IS
  'Regime fiscale, tassazione e dettagli. Lettura e scrittura solo per admin e operatore.';

COMMENT ON COLUMN public.artisti_dati_riservati.regime IS
  'Regime indicato nel recupero contatti. Non esposto al ruolo artista.';

-- Stessa funzione usata dalle note artista. Ricreata qui così la migrazione
-- non dipende dall'ordine se quella funzione non è ancora presente.
CREATE OR REPLACE FUNCTION public.set_updated_by_auth_uid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER update_artisti_dati_riservati_updated_at
  BEFORE UPDATE ON public.artisti_dati_riservati
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_artisti_dati_riservati_updated_by
  BEFORE INSERT OR UPDATE ON public.artisti_dati_riservati
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by_auth_uid();

ALTER TABLE public.artisti_dati_riservati ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artisti_dati_riservati_staff_policy"
  ON public.artisti_dati_riservati
  FOR ALL
  USING (get_user_role() IN ('admin', 'operatore'))
  WITH CHECK (get_user_role() IN ('admin', 'operatore'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.artisti_dati_riservati TO authenticated, service_role;
REVOKE ALL ON public.artisti_dati_riservati FROM anon;

-- Applica in una transazione le patch già decise dal server (campi vuoti o conflitti
-- che l'operatore ha scelto di sostituire). SECURITY INVOKER: vale la RLS del chiamante.
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
      partita_iva = CASE WHEN jsonb_exists(v_patch, 'partita_iva') THEN (v_patch->>'partita_iva')::bigint ELSE a.partita_iva END
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

REVOKE ALL ON FUNCTION public.apply_artisti_contatti_import(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_artisti_contatti_import(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_artisti_contatti_import(jsonb) TO authenticated, service_role;
