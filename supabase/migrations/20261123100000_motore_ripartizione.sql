-- Motore di ripartizione (regolamento 29/04/2024, rev. 22/10/2026).
--
-- * emittenti.modalita_ripartizione: lineare / on demand.
-- * ruoli_tipologie.categoria_ripartizione: categoria del ruolo nel calcolo.
-- * campagne_ripartizione: emittente, anno, modalità e parametri usati.
-- * campagne_ripartizione_sorgenti: campagne di individuazione incluse
--   (ognuna in una sola ripartizione, per non pagare due volte).
-- * ripartizioni_righe: una riga per utilizzazione, con tutti i passaggi.
-- * ripartizione_jobs: stato del calcolo nel worker.
-- * Parametri del regolamento in parametri_ripartizione.
-- * L'artista vede importi e righe solo di campagne approvate o distribuite.
-- * Approvare, distribuire o revocare l'approvazione: solo admin.
--
-- Le tabelle nuove si scrivono solo dal worker (service_role).

-- 1. Emittenti: modalità di ripartizione --------------------------------------
ALTER TABLE public.emittenti
  ADD COLUMN IF NOT EXISTS modalita_ripartizione text
  CHECK (modalita_ripartizione IN ('lineare', 'on_demand'));

UPDATE public.emittenti
SET modalita_ripartizione = CASE WHEN tipo::text = 'streaming' THEN 'on_demand' ELSE 'lineare' END
WHERE modalita_ripartizione IS NULL;

COMMENT ON COLUMN public.emittenti.modalita_ripartizione IS
  'lineare (palinsesto: 73/10/9/8) oppure on_demand (visualizzazioni, ricavi o utilizzazioni). '
  'I canali generalisti di un network lineare sono in configurazione->canali_generalisti (array di nomi canale).';

-- 2. Ruoli: categoria nel calcolo ----------------------------------------------
ALTER TABLE public.ruoli_tipologie
  ADD COLUMN IF NOT EXISTS categoria_ripartizione text
  CHECK (categoria_ripartizione IN (
    'primario', 'comprimario', 'doppiatore_primario', 'direzione_doppiaggio', 'doppiatore_comprimario', 'escluso'
  ));

UPDATE public.ruoli_tipologie SET categoria_ripartizione = CASE codice
    WHEN 'RUO_1' THEN 'primario'
    WHEN 'RUO_2' THEN 'comprimario'
    WHEN 'RUO_3' THEN 'doppiatore_primario'
    WHEN 'RUO_4' THEN 'doppiatore_comprimario'
    WHEN 'RUO_5' THEN 'direzione_doppiaggio'
  END
WHERE codice IN ('RUO_1', 'RUO_2', 'RUO_3', 'RUO_4', 'RUO_5') AND categoria_ripartizione IS NULL;

COMMENT ON COLUMN public.ruoli_tipologie.categoria_ripartizione IS
  'Categoria del ruolo nella ripartizione. NULL o escluso: il ruolo non riceve compensi. '
  'I pesi sono nei parametri del regolamento (parametri_ripartizione), non in parametri_ripartizione di questa tabella.';

-- 3. Campagne di ripartizione ---------------------------------------------------
ALTER TABLE public.campagne_ripartizione
  ADD COLUMN IF NOT EXISTS emittente_id uuid REFERENCES public.emittenti(id),
  ADD COLUMN IF NOT EXISTS anno integer,
  ADD COLUMN IF NOT EXISTS modalita text
    CHECK (modalita IN ('lineare', 'od_views', 'od_ricavi', 'od_utilizzazioni')),
  ADD COLUMN IF NOT EXISTS parametri_id uuid REFERENCES public.parametri_ripartizione(id);

CREATE INDEX IF NOT EXISTS idx_campagne_ripartizione_emittente_anno
  ON public.campagne_ripartizione (emittente_id, anno);

CREATE TABLE IF NOT EXISTS public.campagne_ripartizione_sorgenti (
  campagna_ripartizione_id uuid NOT NULL REFERENCES public.campagne_ripartizione(id) ON DELETE CASCADE,
  campagna_individuazione_id uuid NOT NULL REFERENCES public.campagne_individuazione(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campagna_ripartizione_id, campagna_individuazione_id),
  -- Una campagna di individuazione entra in una sola ripartizione.
  CONSTRAINT campagne_ripartizione_sorgenti_individuazione_unica UNIQUE (campagna_individuazione_id)
);

-- 4. Righe calcolate --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ripartizioni_righe (
  id bigserial PRIMARY KEY,
  campagna_ripartizione_id uuid NOT NULL REFERENCES public.campagne_ripartizione(id) ON DELETE CASCADE,
  individuazione_id uuid REFERENCES public.individuazioni(id) ON DELETE SET NULL,
  artista_id uuid NOT NULL REFERENCES public.artisti(id),
  opera_id uuid REFERENCES public.opere(id) ON DELETE SET NULL,
  episodio_id uuid REFERENCES public.episodi(id) ON DELETE SET NULL,
  ruolo_id uuid REFERENCES public.ruoli_tipologie(id),
  categoria text,
  esclusa text CHECK (esclusa IN ('senza_categoria', 'tetto_ruoli')),
  views_usate numeric,
  views_assegnate boolean NOT NULL DEFAULT false,
  ricavi numeric,
  quota_opera numeric NOT NULL DEFAULT 0,
  prima numeric NOT NULL DEFAULT 0,
  seconda numeric NOT NULL DEFAULT 0,
  resto numeric NOT NULL DEFAULT 0,
  bonus_direzione numeric NOT NULL DEFAULT 0,
  integrazione_minimo numeric NOT NULL DEFAULT 0,
  totale_prima_ricalcolo numeric NOT NULL DEFAULT 0,
  importo numeric NOT NULL DEFAULT 0,
  importo_finale numeric(14, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ripartizioni_righe_campagna
  ON public.ripartizioni_righe (campagna_ripartizione_id);
CREATE INDEX IF NOT EXISTS idx_ripartizioni_righe_campagna_artista
  ON public.ripartizioni_righe (campagna_ripartizione_id, artista_id);
CREATE INDEX IF NOT EXISTS idx_ripartizioni_righe_artista
  ON public.ripartizioni_righe (artista_id);

-- Lettura a blocchi delle individuazioni di una campagna (ordinate per id).
CREATE INDEX IF NOT EXISTS idx_individuazioni_campagna_id_keyset
  ON public.individuazioni (campagna_individuazioni_id, id);

-- 5. Job del worker ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ripartizione_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campagna_ripartizione_id uuid NOT NULL REFERENCES public.campagne_ripartizione(id) ON DELETE CASCADE,
  stato text NOT NULL DEFAULT 'queued' CHECK (stato IN ('queued', 'running', 'completed', 'error')),
  fase text,
  righe_lette integer NOT NULL DEFAULT 0,
  righe_scritte integer NOT NULL DEFAULT 0,
  error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ripartizione_jobs_campagna
  ON public.ripartizione_jobs (campagna_ripartizione_id, created_at DESC);
-- Un solo calcolo attivo per campagna.
CREATE UNIQUE INDEX IF NOT EXISTS ripartizione_jobs_un_attivo_per_campagna
  ON public.ripartizione_jobs (campagna_ripartizione_id)
  WHERE stato IN ('queued', 'running');

-- 6. Parametri del regolamento ------------------------------------------------------
INSERT INTO public.parametri_ripartizione (nome, categoria, configurazione, valido_dal, descrizione)
SELECT
  'Regolamento ripartizione video 29/04/2024 (rev. 22/10/2026)',
  'regolamento_video',
  $json${
    "versione": "regolamento-2024-04-29-rev-2026-10-22",
    "divisore": 11,
    "pesiPrima": {"primario": 5.51, "comprimario": 2.49, "doppiatore_primario": 1.8, "direzione_doppiaggio": 1.8, "doppiatore_comprimario": 1.2},
    "moltiplicatoriSeconda": {"primario": 3.5, "comprimario": 1.1, "doppiatore_primario": 0.4, "direzione_doppiaggio": 0.4, "doppiatore_comprimario": 0.2},
    "lineare": {
      "quote": {"tutte": 0.73, "generaliste": 0.1, "oltre60": 0.09, "primaSerata": 0.08},
      "durataMinimaMinuti": 60,
      "fasciaPrimaSerata": {"da": "19:00", "a": "23:30"},
      "senzaGeneraliste": "somma_a_tutte",
      "quotaSenzaRighe": "resto"
    },
    "bonusDirezione": {"percentuale": 0.1, "lineare": "totale", "onDemand": "prima_ripartizione"},
    "minimoOnDemand": {"importo": 1.5, "regola": "primo_importo_superiore", "mantieniDopoRiduzione": false},
    "tettoRuoliPerOpera": 3,
    "viewsMancantiQuotaMedia": 0.1
  }$json$::jsonb,
  DATE '2024-01-01',
  'Scheda tecnica applicativa del regolamento di ripartizione video. Punti da confermare con RASI: '
  'docs/codebase-audit/2026-11-23-ripartizione-2024-domande-paolo.md'
WHERE NOT EXISTS (
  SELECT 1 FROM public.parametri_ripartizione WHERE categoria = 'regolamento_video'
);

-- 7. Stati: approvare, distribuire o revocare solo admin ----------------------------
CREATE OR REPLACE FUNCTION public.campagne_ripartizione_stato_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.stato IS DISTINCT FROM OLD.stato
     AND (NEW.stato IN ('approvata', 'distribuita') OR OLD.stato IN ('approvata', 'distribuita'))
     AND current_user = 'authenticated'
     AND public.get_user_role() IS DISTINCT FROM 'admin'::public.ruolo_utente THEN
    RAISE EXCEPTION 'Solo un amministratore approva, distribuisce o revoca una ripartizione'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.stato = 'approvata' AND OLD.stato IS DISTINCT FROM 'approvata' THEN
    NEW.data_approvazione := now();
  END IF;
  IF NEW.stato = 'distribuita' AND OLD.stato IS DISTINCT FROM 'distribuita' THEN
    NEW.data_distribuzione := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campagne_ripartizione_stato_guard ON public.campagne_ripartizione;
CREATE TRIGGER campagne_ripartizione_stato_guard
  BEFORE UPDATE ON public.campagne_ripartizione
  FOR EACH ROW EXECUTE FUNCTION public.campagne_ripartizione_stato_guard();

-- 8. RLS ------------------------------------------------------------------------------
-- Campagne: l'artista vede quelle approvate o distribuite (prima: solo approvate,
-- quindi le perdeva alla distribuzione).
DROP POLICY IF EXISTS campagne_ripartizione_select_policy ON public.campagne_ripartizione;
CREATE POLICY campagne_ripartizione_select_policy ON public.campagne_ripartizione
  FOR SELECT USING (
    (SELECT public.is_staff_reader())
    OR ((SELECT public.get_user_role()) = 'artista'::public.ruolo_utente
        AND stato IN ('approvata'::public.stato_ripartizione, 'distribuita'::public.stato_ripartizione))
    OR ((SELECT public.get_user_role()) = 'readonly'::public.ruolo_utente
        AND stato = 'distribuita'::public.stato_ripartizione)
  );

-- Importi per artista: l'artista vede i propri solo a campagna approvata o distribuita.
DROP POLICY IF EXISTS ripartizioni_dettaglio_select_policy ON public.ripartizioni;
CREATE POLICY ripartizioni_dettaglio_select_policy ON public.ripartizioni
  FOR SELECT USING (
    (SELECT public.is_staff_reader())
    OR ((SELECT public.get_user_role()) = 'artista'::public.ruolo_utente
        AND artista_id = (SELECT public.get_user_artista_id())
        AND EXISTS (
          SELECT 1 FROM public.campagne_ripartizione c
          WHERE c.id = ripartizioni.campagna_ripartizione_id
            AND c.stato IN ('approvata'::public.stato_ripartizione, 'distribuita'::public.stato_ripartizione)
        ))
  );

ALTER TABLE public.campagne_ripartizione_sorgenti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campagne_ripartizione_sorgenti_select_policy ON public.campagne_ripartizione_sorgenti;
CREATE POLICY campagne_ripartizione_sorgenti_select_policy ON public.campagne_ripartizione_sorgenti
  FOR SELECT USING ((SELECT public.is_staff_reader()));

ALTER TABLE public.ripartizioni_righe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ripartizioni_righe_select_policy ON public.ripartizioni_righe;
CREATE POLICY ripartizioni_righe_select_policy ON public.ripartizioni_righe
  FOR SELECT USING (
    (SELECT public.is_staff_reader())
    OR ((SELECT public.get_user_role()) = 'artista'::public.ruolo_utente
        AND artista_id = (SELECT public.get_user_artista_id())
        AND EXISTS (
          SELECT 1 FROM public.campagne_ripartizione c
          WHERE c.id = ripartizioni_righe.campagna_ripartizione_id
            AND c.stato IN ('approvata'::public.stato_ripartizione, 'distribuita'::public.stato_ripartizione)
        ))
  );

ALTER TABLE public.ripartizione_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ripartizione_jobs_select_policy ON public.ripartizione_jobs;
CREATE POLICY ripartizione_jobs_select_policy ON public.ripartizione_jobs
  FOR SELECT USING ((SELECT public.is_staff_reader()));

-- Le tabelle nuove si scrivono solo dal worker.
REVOKE ALL ON public.campagne_ripartizione_sorgenti, public.ripartizioni_righe, public.ripartizione_jobs FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.campagne_ripartizione_sorgenti, public.ripartizioni_righe, public.ripartizione_jobs FROM authenticated;
GRANT SELECT ON public.campagne_ripartizione_sorgenti, public.ripartizioni_righe, public.ripartizione_jobs TO authenticated;
GRANT ALL ON public.campagne_ripartizione_sorgenti, public.ripartizioni_righe, public.ripartizione_jobs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ripartizioni_righe_id_seq TO service_role;

REVOKE ALL ON FUNCTION public.campagne_ripartizione_stato_guard() FROM PUBLIC, anon, authenticated;
