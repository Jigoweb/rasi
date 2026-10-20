-- Ruolo autoritativo in raw_app_meta_data.ruolo (server-only).
--
-- user_metadata.ruolo (raw_user_meta_data) è scrivibile dal client con
-- auth.updateUser({ data }) e non è più letto per autorizzare.
-- Nessun fallback: se app_metadata.ruolo manca o non è nell'enum
-- ruolo_utente, get_user_role() restituisce NULL (le policy RLS negano).
-- Il vecchio COALESCE a 'readonly' concedeva lettura a chi non aveva ruolo.
--
-- Le policy RLS non cambiano: continuano a chiamare get_user_role().
-- get_user_artista_id() resta su raw_user_meta_data.artista_id (fuori scope).
--
-- Idempotente: copia il ruolo solo se app_metadata.ruolo è assente e
-- user_metadata.ruolo è un valore noto. Non sovrascrive un ruolo già
-- presente in app_metadata. Non copia valori inattesi.
--
-- Dry-run (solo SELECT, senza email): supabase/scripts/role_app_metadata_report.sql
-- Rollback: supabase/rollback/20261020075909_role_app_metadata.sql
--
-- Ordine: backfill prima del cambio funzione, nella stessa transazione.
-- Il trigger di audit passa a raw_app_meta_data DOPO il backfill, così
-- la copia non genera una riga di audit per ogni utente.

DO $role_report_before$
DECLARE
  r record;
  v_bad integer;
  v_mismatch integer;
BEGIN
  RAISE NOTICE 'role_app_metadata BEFORE (conteggi, nessuna email)';
  FOR r IN
    SELECT COALESCE(raw_user_meta_data->>'ruolo', '(assente)') AS user_role,
           COALESCE(raw_app_meta_data->>'ruolo', '(assente)') AS app_role,
           COUNT(*) AS n
    FROM auth.users
    GROUP BY 1, 2
    ORDER BY 1, 2
  LOOP
    RAISE NOTICE 'before user_metadata=% app_metadata=% utenti=%', r.user_role, r.app_role, r.n;
  END LOOP;

  SELECT COUNT(*) INTO v_bad
  FROM auth.users
  WHERE COALESCE(raw_user_meta_data->>'ruolo', '') NOT IN
        ('admin', 'operatore', 'artista', 'readonly', 'collecting');

  IF v_bad > 0 THEN
    RAISE EXCEPTION
      'role backfill aborted: % utenti con raw_user_meta_data.ruolo assente o inatteso. Eseguire supabase/scripts/role_app_metadata_report.sql e correggere prima di riprovare.',
      v_bad;
  END IF;

  SELECT COUNT(*) INTO v_mismatch
  FROM auth.users
  WHERE COALESCE(raw_app_meta_data->>'ruolo', '') <> ''
    AND (raw_app_meta_data->>'ruolo') IS DISTINCT FROM (raw_user_meta_data->>'ruolo');

  RAISE NOTICE 'utenti con app_metadata.ruolo già impostato e diverso da user_metadata (non sovrascritti)=%', v_mismatch;
END
$role_report_before$;

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{ruolo}',
      to_jsonb(raw_user_meta_data->>'ruolo'),
      true
    )
WHERE COALESCE(raw_app_meta_data->>'ruolo', '') = ''
  AND (raw_user_meta_data->>'ruolo') IN
      ('admin', 'operatore', 'artista', 'readonly', 'collecting');

DO $role_report_after$
DECLARE
  r record;
  v_missing integer;
BEGIN
  RAISE NOTICE 'role_app_metadata AFTER (conteggi, nessuna email)';
  FOR r IN
    SELECT COALESCE(raw_user_meta_data->>'ruolo', '(assente)') AS user_role,
           COALESCE(raw_app_meta_data->>'ruolo', '(assente)') AS app_role,
           COUNT(*) AS n
    FROM auth.users
    GROUP BY 1, 2
    ORDER BY 1, 2
  LOOP
    RAISE NOTICE 'after user_metadata=% app_metadata=% utenti=%', r.user_role, r.app_role, r.n;
  END LOOP;

  SELECT COUNT(*) INTO v_missing
  FROM auth.users
  WHERE COALESCE(raw_app_meta_data->>'ruolo', '') = '';

  IF v_missing > 0 THEN
    RAISE EXCEPTION
      'role backfill incomplete: % utenti senza raw_app_meta_data.ruolo',
      v_missing;
  END IF;
END
$role_report_after$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.ruolo_utente
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ruolo text;
BEGIN
  SELECT u.raw_app_meta_data ->> 'ruolo'
    INTO v_ruolo
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_ruolo IS NULL OR v_ruolo NOT IN ('admin', 'operatore', 'artista', 'readonly') THEN
    RETURN NULL;
  END IF;

  RETURN v_ruolo::public.ruolo_utente;
END;
$$;

-- CREATE OR REPLACE non aggiorna i parametri di configurazione già presenti.
ALTER FUNCTION public.get_user_role() SET search_path = public;

COMMENT ON FUNCTION public.get_user_role() IS
  'Ruolo autoritativo da auth.users.raw_app_meta_data.ruolo. Nessun fallback su raw_user_meta_data. Valore assente o fuori enum ruolo_utente: NULL (fail-closed).';

CREATE OR REPLACE FUNCTION public.audit_log_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ignore   text[] := ARRAY[
    'updated_at', 'updated_by', 'search_vector', 'statistiche',
    'programmazioni_count', 'processing_by', 'processing_started_at',
    'match_key', 'match_key_loose', 'match_key_strict', 'alias_titolo_norm_strict'
  ];
  v_uid      uuid := auth.uid();
  v_only_user_updates boolean := COALESCE(TG_ARGV[0], '') = 'solo_update_utente';
  v_row      jsonb;
  v_old      jsonb;
  v_new      jsonb;
  v_changed  text[];
  v_claims   jsonb;
  v_email    text;
  v_ruolo    text;
  v_label    text;
  v_artista  uuid;
  v_opera    uuid;
BEGIN
  IF v_only_user_updates AND (TG_OP <> 'UPDATE' OR v_uid IS NULL) THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'UPDATE' AND v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old := to_jsonb(OLD) - v_ignore;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new := to_jsonb(NEW) - v_ignore;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(n.key ORDER BY n.key)
    INTO v_changed
    FROM jsonb_each(v_new) AS n
    WHERE v_old -> n.key IS DISTINCT FROM n.value;

    IF v_changed IS NULL THEN
      RETURN NULL;
    END IF;

    SELECT jsonb_object_agg(key, value) INTO v_old FROM jsonb_each(v_old) WHERE key = ANY(v_changed);
    SELECT jsonb_object_agg(key, value) INTO v_new FROM jsonb_each(v_new) WHERE key = ANY(v_changed);
  END IF;

  v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;

  BEGIN
    v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  EXCEPTION WHEN others THEN
    v_claims := NULL;
  END;
  v_email := v_claims ->> 'email';
  -- Solo app_metadata. Il claim JWT è uno snapshot; il record Auth è la fonte.
  -- Nessun fallback su user_metadata (scrivibile dal client).
  v_ruolo := v_claims -> 'app_metadata' ->> 'ruolo';

  IF v_uid IS NOT NULL THEN
    SELECT COALESCE(v_email, u.email), COALESCE(u.raw_app_meta_data ->> 'ruolo', v_ruolo)
    INTO v_email, v_ruolo
    FROM auth.users u
    WHERE u.id = v_uid;
  END IF;

  IF v_uid IS NULL THEN
    v_ruolo := COALESCE(v_ruolo, 'sistema');
  END IF;

  v_artista := CASE
    WHEN TG_TABLE_NAME = 'artisti' THEN (v_row ->> 'id')::uuid
    WHEN v_row ? 'artista_id' THEN (v_row ->> 'artista_id')::uuid
  END;
  v_opera := CASE
    WHEN TG_TABLE_NAME = 'opere' THEN (v_row ->> 'id')::uuid
    WHEN v_row ? 'opera_id' THEN (v_row ->> 'opera_id')::uuid
  END;

  IF TG_TABLE_NAME = 'partecipazioni' THEN
    SELECT concat_ws(' — ', trim(a.nome::text || ' ' || a.cognome::text), o.titolo::text)
    INTO v_label
    FROM (SELECT 1) AS one
    LEFT JOIN public.artisti a ON a.id = v_artista
    LEFT JOIN public.opere o ON o.id = v_opera;
  ELSIF TG_TABLE_NAME = 'artisti' THEN
    v_label := NULLIF(trim(concat_ws(' ', v_row ->> 'nome', v_row ->> 'cognome')), '');
  ELSIF TG_TABLE_NAME = 'artisti_referenti' THEN
    SELECT concat_ws(' — ',
      NULLIF(trim(concat_ws(' ', v_row ->> 'nome', v_row ->> 'cognome')), '') || ' (' || (v_row ->> 'tipo') || ')',
      trim(a.nome::text || ' ' || a.cognome::text))
    INTO v_label
    FROM (SELECT 1) AS one
    LEFT JOIN public.artisti a ON a.id = v_artista;
  ELSIF TG_TABLE_NAME = 'episodi' THEN
    v_label := concat('S', v_row ->> 'numero_stagione', 'E', v_row ->> 'numero_episodio',
      CASE WHEN v_row ->> 'titolo_episodio' IS NOT NULL THEN ' – ' || (v_row ->> 'titolo_episodio') END);
  END IF;

  IF v_label IS NULL AND TG_TABLE_NAME IN ('artisti_note', 'alert_prese_visione', 'cast_esterno', 'episodi') THEN
    SELECT COALESCE(
      CASE WHEN TG_TABLE_NAME = 'cast_esterno' THEN v_row ->> 'nome' END,
      (SELECT trim(a.nome::text || ' ' || a.cognome::text) FROM public.artisti a WHERE a.id = COALESCE(v_artista, (v_row ->> 'entity_id')::uuid)),
      (SELECT o.titolo::text FROM public.opere o WHERE o.id = COALESCE(v_opera, (v_row ->> 'entity_id')::uuid))
    )
    INTO v_label;
  END IF;

  v_label := COALESCE(
    v_label,
    v_row ->> 'titolo',
    v_row ->> 'nome',
    v_row ->> 'ragione_sociale',
    v_row ->> 'codice',
    v_row ->> 'slug'
  );

  INSERT INTO public.audit_log (
    user_id, user_email, user_ruolo, azione, tabella, record_id, record_label,
    artista_id, opera_id, campi_modificati, old_data, new_data
  )
  VALUES (
    v_uid, v_email, v_ruolo, TG_OP, TG_TABLE_NAME,
    COALESCE(v_row ->> 'id', v_row ->> 'artista_id', v_row ->> 'entity_id'),
    left(v_label, 300),
    v_artista, v_opera, v_changed, v_old, v_new
  );

  RETURN NULL;
END;
$$;


CREATE OR REPLACE FUNCTION public.audit_log_auth_user_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF TG_OP = 'UPDATE' AND NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
      INSERT INTO public.audit_log (user_id, user_email, user_ruolo, azione, tabella, record_id, record_label)
      VALUES (NEW.id, NEW.email, NEW.raw_app_meta_data ->> 'ruolo', 'LOGIN', 'utenti', NEW.id::text, NEW.email);
    END IF;

    IF TG_OP = 'UPDATE'
       AND (NEW.raw_app_meta_data ->> 'ruolo') IS DISTINCT FROM (OLD.raw_app_meta_data ->> 'ruolo') THEN
      INSERT INTO public.audit_log (
        user_id, user_email, user_ruolo, azione, tabella, record_id, record_label,
        campi_modificati, old_data, new_data
      )
      SELECT
        auth.uid(), actor.email, actor.raw_app_meta_data ->> 'ruolo', 'UPDATE', 'utenti', NEW.id::text, NEW.email,
        ARRAY['ruolo'],
        jsonb_build_object('ruolo', OLD.raw_app_meta_data ->> 'ruolo'),
        jsonb_build_object('ruolo', NEW.raw_app_meta_data ->> 'ruolo')
      FROM (SELECT 1) AS one
      LEFT JOIN auth.users actor ON actor.id = auth.uid();
    END IF;

    IF TG_OP IN ('INSERT', 'DELETE') THEN
      INSERT INTO public.audit_log (
        user_id, user_email, user_ruolo, azione, tabella, record_id, record_label, new_data, old_data
      )
      SELECT
        auth.uid(), actor.email, actor.raw_app_meta_data ->> 'ruolo', TG_OP, 'utenti',
        CASE WHEN TG_OP = 'INSERT' THEN NEW.id ELSE OLD.id END::text,
        CASE WHEN TG_OP = 'INSERT' THEN NEW.email ELSE OLD.email END,
        CASE WHEN TG_OP = 'INSERT' THEN jsonb_build_object('email', NEW.email, 'ruolo', NEW.raw_app_meta_data ->> 'ruolo') END,
        CASE WHEN TG_OP = 'DELETE' THEN jsonb_build_object('email', OLD.email, 'ruolo', OLD.raw_app_meta_data ->> 'ruolo') END
      FROM (SELECT 1) AS one
      LEFT JOIN auth.users actor ON actor.id = auth.uid();
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'audit_log_auth_user_change: %', SQLERRM;
  END;

  RETURN NULL;
END;
$$;


DO $role_trigger$
BEGIN
  CREATE OR REPLACE TRIGGER audit_log_auth_users_trigger
    AFTER INSERT OR UPDATE OF last_sign_in_at, raw_app_meta_data OR DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_auth_user_change();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'audit_log: trigger su auth.users non aggiornato (permessi insufficienti)';
END
$role_trigger$;
