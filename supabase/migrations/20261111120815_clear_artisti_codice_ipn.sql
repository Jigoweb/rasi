-- C7: gli IPN in anagrafica artisti non sono affidabili.
-- Si mette codice_ipn a NULL. La colonna resta, così admin e operatore
-- possono riscriverlo a mano.
--
-- Scelta di Matteo: nessuna copia dei valori precedenti.
-- Niente tabella di backup, niente script di rollback con i valori,
-- niente valori nel registro attività.
--
-- Dove si azzera, se la relazione esiste:
--   public.artisti.codice_ipn
--   staging.artisti.codice_ipn          (import, non nello schema del repo)
--   public_backup.artisti.codice_ipn    (copia storica, non nello schema del repo)
--   public.audit_log                    (solo la chiave codice_ipn sulle righe
--                                        tabella = 'artisti', non la riga intera)
--
-- Non si tocca public.cast_esterno.codice_ipn: è l'IPN di una persona
-- che non è un artista RASI, non una copia di artisti.codice_ipn.
--
-- Vincoli:
--   public.artisti ha UNIQUE (codice_ipn) con NULL distinti: più NULL
--   sono ammessi, il vincolo resta così i codici reinseriti restano univoci.
--   Se un indice unico trattasse i NULL come uguali, lo si ricrea nel
--   modo predefinito (più NULL, valori non nulli ancora univoci).
--   public_backup.artisti.codice_ipn è NOT NULL: si toglie solo il NOT NULL.
--   Nessun trigger impedisce il NULL. Quello di audit si disabilita per
--   la durata dell'UPDATE, così il valore vecchio non finisce nel registro
--   nemmeno se la migration gira con un JWT (auth.uid() valorizzato).
--   updated_at e search_vector non cambiano: search_vector non contiene l'IPN.
--
-- Le migration sono incrementali e presuppongono db/init. Su un database
-- di preview vuoto public.artisti non esiste e questa migration fallisce,
-- come le altre.

DO $preflight$
BEGIN
  IF to_regclass('public.artisti') IS NULL THEN
    RAISE EXCEPTION
      'schema base assente (public.artisti). Le migration sono incrementali e presuppongono db/init.';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION pg_temp.recreate_ipn_unique_if_nulls_not_distinct(p_regclass regclass)
RETURNS void
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_index name;
  v_constraint name;
  v_schema name;
BEGIN
  SELECT c.relname, n.nspname, con.conname
    INTO v_index, v_schema, v_constraint
  FROM pg_index i
  JOIN pg_class c ON c.oid = i.indexrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_constraint con ON con.conindid = i.indexrelid
  WHERE i.indrelid = p_regclass
    AND i.indisunique
    AND i.indnkeyatts = 1
    AND i.indnullsnotdistinct
    AND EXISTS (
      SELECT 1
      FROM pg_attribute a
      WHERE a.attrelid = i.indrelid
        AND a.attnum = ANY (i.indkey)
        AND a.attname = 'codice_ipn'
        AND NOT a.attisdropped
    )
  LIMIT 1;

  IF v_index IS NULL THEN
    RETURN;
  END IF;

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', p_regclass, v_constraint);
  ELSE
    EXECUTE format('DROP INDEX %I.%I', v_schema, v_index);
  END IF;

  EXECUTE format(
    'ALTER TABLE %s ADD CONSTRAINT artisti_codice_artista_key UNIQUE (codice_ipn)',
    p_regclass
  );
END
$fn$;

DO $clear$
DECLARE
  v_trigger text;
  v_triggers text[] := ARRAY[
    'audit_log_trigger',
    'update_artisti_updated_at',
    'update_artisti_search_vector'
  ];
BEGIN
  PERFORM pg_temp.recreate_ipn_unique_if_nulls_not_distinct('public.artisti'::regclass);

  FOREACH v_trigger IN ARRAY v_triggers
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = v_trigger
        AND tgrelid = 'public.artisti'::regclass
        AND NOT tgisinternal
    ) THEN
      EXECUTE format('ALTER TABLE public.artisti DISABLE TRIGGER %I', v_trigger);
    END IF;
  END LOOP;

  UPDATE public.artisti
  SET codice_ipn = NULL
  WHERE codice_ipn IS NOT NULL;

  FOREACH v_trigger IN ARRAY v_triggers
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = v_trigger
        AND tgrelid = 'public.artisti'::regclass
        AND NOT tgisinternal
    ) THEN
      EXECUTE format('ALTER TABLE public.artisti ENABLE TRIGGER %I', v_trigger);
    END IF;
  END LOOP;

  IF to_regclass('public.audit_log') IS NOT NULL THEN
    UPDATE public.audit_log
    SET
      old_data = old_data - 'codice_ipn',
      new_data = new_data - 'codice_ipn',
      campi_modificati = array_remove(campi_modificati, 'codice_ipn')
    WHERE tabella = 'artisti'
      AND (
        COALESCE(old_data, '{}'::jsonb) ? 'codice_ipn'
        OR COALESCE(new_data, '{}'::jsonb) ? 'codice_ipn'
        OR 'codice_ipn' = ANY (COALESCE(campi_modificati, ARRAY[]::text[]))
      );
  END IF;

  IF to_regclass('staging.artisti') IS NOT NULL THEN
    UPDATE staging.artisti
    SET codice_ipn = NULL
    WHERE codice_ipn IS NOT NULL;
  END IF;

  IF to_regclass('public_backup.artisti') IS NOT NULL THEN
    PERFORM pg_temp.recreate_ipn_unique_if_nulls_not_distinct('public_backup.artisti'::regclass);
    ALTER TABLE public_backup.artisti ALTER COLUMN codice_ipn DROP NOT NULL;
    UPDATE public_backup.artisti
    SET codice_ipn = NULL
    WHERE codice_ipn IS NOT NULL;
  END IF;
END
$clear$;
