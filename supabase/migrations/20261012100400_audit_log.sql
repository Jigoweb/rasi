-- Registro attività: traccia permanente di ogni modifica fatta dagli account.
-- Trigger AFTER su tutte le tabelle anagrafiche/operative. Nessuna scadenza:
-- le righe non si aggiornano né si cancellano dall'API (solo SELECT per admin).
--
-- Escluse per volume: programmazioni (import massivi) e ripartizioni (calcolo).
-- individuazioni: solo UPDATE fatti da un utente (validazioni/rifiuti), non le
-- righe create dal worker. Gli UPDATE di sistema (auth.uid() NULL, es. avanzamento
-- job del worker) non vengono registrati; INSERT/DELETE di sistema sì.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id                BIGSERIAL PRIMARY KEY,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id           UUID,
  user_email        TEXT,
  user_ruolo        TEXT,
  azione            TEXT NOT NULL CHECK (azione IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN')),
  tabella           TEXT NOT NULL,
  record_id         TEXT,
  record_label      TEXT,
  artista_id        UUID,
  opera_id          UUID,
  campi_modificati  TEXT[],
  old_data          JSONB,
  new_data          JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_occurred_at ON public.audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_tabella ON public.audit_log(tabella, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON public.audit_log(tabella, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_artista ON public.audit_log(artista_id, occurred_at DESC) WHERE artista_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_opera ON public.audit_log(opera_id, occurred_at DESC) WHERE opera_id IS NOT NULL;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select_policy" ON public.audit_log;
CREATE POLICY "audit_log_select_policy" ON public.audit_log
  FOR SELECT
  USING (get_user_role() = 'admin');

-- Solo lettura dall'API: le righe le scrive il trigger (SECURITY DEFINER).
REVOKE ALL ON public.audit_log FROM anon, authenticated;
GRANT SELECT ON public.audit_log TO authenticated;
GRANT SELECT ON public.audit_log TO service_role;

COMMENT ON TABLE public.audit_log IS
  'Registro attività permanente (chi, cosa, quando). Scritto solo dai trigger audit_log_row_change.';

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
  v_ruolo := v_claims -> 'user_metadata' ->> 'ruolo';

  IF v_uid IS NOT NULL AND (v_email IS NULL OR v_ruolo IS NULL) THEN
    SELECT COALESCE(v_email, u.email), COALESCE(v_ruolo, u.raw_user_meta_data ->> 'ruolo')
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

DO $$
DECLARE
  v_table text;
  v_full  text[] := ARRAY[
    'artisti', 'artisti_note', 'artisti_referenti',
    'opere', 'episodi', 'opera_aliases', 'partecipazioni', 'cast_esterno',
    'ruoli_tipologie', 'emittenti',
    'campagne_programmazione', 'campagne_individuazione',
    'campagne_ripartizione', 'parametri_ripartizione',
    'alert_prese_visione',
    'pages', 'bandi_news', 'documents'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_full LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_log_trigger ON public.%I', v_table);
      EXECUTE format(
        'CREATE TRIGGER audit_log_trigger AFTER INSERT OR UPDATE OR DELETE ON public.%I '
        'FOR EACH ROW EXECUTE FUNCTION public.audit_log_row_change()',
        v_table
      );
    END IF;
  END LOOP;

  IF to_regclass('public.individuazioni') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS audit_log_trigger ON public.individuazioni;
    CREATE TRIGGER audit_log_trigger
      AFTER UPDATE ON public.individuazioni
      FOR EACH ROW EXECUTE FUNCTION public.audit_log_row_change('solo_update_utente');
  END IF;
END $$;

-- Accessi e cambi di ruolo degli account. Mai i dati di autenticazione:
-- solo email e ruolo. Un errore qui non deve mai bloccare il login.
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
      VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'ruolo', 'LOGIN', 'utenti', NEW.id::text, NEW.email);
    END IF;

    IF TG_OP = 'UPDATE'
       AND (NEW.raw_user_meta_data ->> 'ruolo') IS DISTINCT FROM (OLD.raw_user_meta_data ->> 'ruolo') THEN
      INSERT INTO public.audit_log (
        user_id, user_email, user_ruolo, azione, tabella, record_id, record_label,
        campi_modificati, old_data, new_data
      )
      SELECT
        auth.uid(), actor.email, actor.raw_user_meta_data ->> 'ruolo', 'UPDATE', 'utenti', NEW.id::text, NEW.email,
        ARRAY['ruolo'],
        jsonb_build_object('ruolo', OLD.raw_user_meta_data ->> 'ruolo'),
        jsonb_build_object('ruolo', NEW.raw_user_meta_data ->> 'ruolo')
      FROM (SELECT 1) AS one
      LEFT JOIN auth.users actor ON actor.id = auth.uid();
    END IF;

    IF TG_OP IN ('INSERT', 'DELETE') THEN
      INSERT INTO public.audit_log (
        user_id, user_email, user_ruolo, azione, tabella, record_id, record_label, new_data, old_data
      )
      SELECT
        auth.uid(), actor.email, actor.raw_user_meta_data ->> 'ruolo', TG_OP, 'utenti',
        CASE WHEN TG_OP = 'INSERT' THEN NEW.id ELSE OLD.id END::text,
        CASE WHEN TG_OP = 'INSERT' THEN NEW.email ELSE OLD.email END,
        CASE WHEN TG_OP = 'INSERT' THEN jsonb_build_object('email', NEW.email, 'ruolo', NEW.raw_user_meta_data ->> 'ruolo') END,
        CASE WHEN TG_OP = 'DELETE' THEN jsonb_build_object('email', OLD.email, 'ruolo', OLD.raw_user_meta_data ->> 'ruolo') END
      FROM (SELECT 1) AS one
      LEFT JOIN auth.users actor ON actor.id = auth.uid();
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'audit_log_auth_user_change: %', SQLERRM;
  END;

  RETURN NULL;
END;
$$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS audit_log_auth_users_trigger ON auth.users;
  CREATE TRIGGER audit_log_auth_users_trigger
    AFTER INSERT OR UPDATE OF last_sign_in_at, raw_user_meta_data OR DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_auth_user_change();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'audit_log: trigger su auth.users non creato (permessi insufficienti)';
END $$;
