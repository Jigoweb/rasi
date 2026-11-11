-- Fase 0 del piano di allineamento alle richieste RASI (resoconto call 23/10/2026).
--
-- 1) A5 — L'artista vede sempre le proprie partecipazioni.
--    Prima il ramo artista di partecipazioni_select_policy chiedeva anche che
--    l'opera o l'artista fossero validati: l'artista di prova "Pinco Panco",
--    con opera "Test" e anagrafica da validare, non vedeva nulla nel Repertorio.
--    Ora basta che la partecipazione sia sua (artista_id = get_user_artista_id()).
--    In interfaccia le righe su opere non validate hanno l'etichetta "In verifica".
--    Gli altri rami della policy (staff, ruoli non artista) non cambiano.
--    individuazioni_select_policy non cambia: le individuazioni (e quindi i
--    compensi) restano legate alle opere validate.
--
-- 2) Blocco colonne per l'artista su public.artisti.
--    artisti_update_policy permette all'artista di aggiornare la propria riga
--    senza limiti di colonna: l'elenco dei campi modificabili esisteva solo nel
--    client (src/features/artisti/lib/artista-self-update.ts). Un artista poteva
--    cambiare via API stato, mandato, diritti, IPN o stato_validazione.
--    Il trigger artisti_artista_colonne_consentite rifiuta, per ruolo artista,
--    ogni modifica fuori da questo elenco:
--      nome, cognome, nome_arte, codice_fiscale, data_nascita, luogo_nascita,
--      tipologia, contatti, indirizzo
--    più le colonne che i trigger di sistema aggiornano da soli
--    (updated_at, updated_by, search_vector).
--    Admin, operatore e i processi senza JWT (service_role, migration) non
--    sono toccati. Nella fase 3 la modifica dell'artista passerà da una coda
--    di approvazione e il ramo artista della policy verrà tolto.
--
-- Idempotente. Nessun dato modificato.

DO $preflight$
BEGIN
  IF to_regclass('public.partecipazioni') IS NULL OR to_regclass('public.artisti') IS NULL THEN
    RAISE EXCEPTION
      'schema base assente (public.partecipazioni / public.artisti). Le migration sono incrementali e presuppongono db/init.';
  END IF;
  IF to_regprocedure('public.get_user_artista_id()') IS NULL THEN
    RAISE EXCEPTION 'public.get_user_artista_id() assente: applicare prima 20261020212235_artista_id_app_metadata.sql';
  END IF;
END
$preflight$;

-- ---------------------------------------------------------------------------
-- 1) partecipazioni_select_policy
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "partecipazioni_select_policy" ON public.partecipazioni;
CREATE POLICY "partecipazioni_select_policy" ON public.partecipazioni
  FOR SELECT
  USING (
    (SELECT public.get_user_role()) = ANY (ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente])
    OR (
      (SELECT public.get_user_role()) = 'artista'::public.ruolo_utente
      AND artista_id = (SELECT public.get_user_artista_id())
    )
    OR (
      (SELECT public.get_user_role()) IS DISTINCT FROM 'artista'::public.ruolo_utente
      AND (
        EXISTS (
          SELECT 1 FROM public.opere o
          WHERE o.id = partecipazioni.opera_id
            AND o.stato_validazione = 'validato'::public.stato_validazione
        )
        OR EXISTS (
          SELECT 1 FROM public.artisti a
          WHERE a.id = partecipazioni.artista_id
            AND a.stato_validazione = 'validato'::public.stato_validazione
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 2) Trigger: colonne che l'artista può modificare sulla propria riga
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.artisti_artista_colonne_consentite()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_consentite text[] := ARRAY[
    'nome', 'cognome', 'nome_arte', 'codice_fiscale', 'data_nascita',
    'luogo_nascita', 'tipologia', 'contatti', 'indirizzo',
    -- aggiornate dai trigger di sistema
    'updated_at', 'updated_by', 'search_vector'
  ];
  v_new jsonb;
  v_old jsonb;
  v_cambiate text;
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'artista'::public.ruolo_utente THEN
    RETURN NEW;
  END IF;

  v_new := to_jsonb(NEW) - v_consentite;
  v_old := to_jsonb(OLD) - v_consentite;

  IF v_new IS DISTINCT FROM v_old THEN
    SELECT string_agg(k, ', ' ORDER BY k)
      INTO v_cambiate
    FROM jsonb_object_keys(v_new) AS k
    WHERE v_new -> k IS DISTINCT FROM v_old -> k;

    RAISE EXCEPTION 'L''artista non può modificare questi campi: %', v_cambiate
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.artisti_artista_colonne_consentite() IS
  'Per ruolo artista consente di modificare solo i campi anagrafici e di contatto della propria scheda (stesso elenco di artista-self-update.ts). Altri ruoli: nessun effetto.';

REVOKE ALL ON FUNCTION public.artisti_artista_colonne_consentite() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS artisti_artista_colonne_consentite ON public.artisti;
CREATE TRIGGER artisti_artista_colonne_consentite
  BEFORE UPDATE ON public.artisti
  FOR EACH ROW
  EXECUTE FUNCTION public.artisti_artista_colonne_consentite();
