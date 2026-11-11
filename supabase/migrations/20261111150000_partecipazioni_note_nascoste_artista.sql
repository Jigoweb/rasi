-- Note delle partecipazioni: non più leggibili dal ruolo artista.
--
-- partecipazioni resta la tabella del repertorio (l'artista vede le proprie
-- righe con la policy già in vigore). La colonna note stava su quella tabella,
-- quindi qualunque SELECT consentito dalla RLS la restituiva.
--
-- Admin, operatore e artista condividono il ruolo Postgres `authenticated`:
-- un REVOKE di colonna su authenticated nasconderebbe le note anche alle
-- schermate staff. La nota si sposta quindi in partecipazioni_note, con RLS
-- propria, come artisti_note e artisti_dati_riservati.
--
-- Lettura: admin, operatore, readonly (chi non è artista già leggeva la
-- colonna). Scrittura: admin e operatore, policy spezzate per comando
-- (niente FOR ALL). get_user_role() sta in (select ...) così il planner lo
-- valuta una volta.
--
-- Non modifica le policy di partecipazioni (PR #62 / #63).
-- Copia ogni note IS NOT NULL prima del DROP COLUMN e annulla la migration
-- se un testo non coincide. Idempotente: se la colonna non c'è più, la copia
-- non viene rifatta e le note già spostate restano com'erano.
-- Unica transazione: niente CREATE INDEX CONCURRENTLY, niente COMMIT interno
-- (il runner Supabase avvolge il file).

DO $preflight$
BEGIN
  IF to_regclass('public.partecipazioni') IS NULL
     OR to_regclass('public.audit_log') IS NULL
     OR to_regprocedure('public.get_user_role()') IS NULL
     OR to_regprocedure('public.update_updated_at_column()') IS NULL
     OR to_regprocedure('public.set_updated_by_auth_uid()') IS NULL THEN
    RAISE EXCEPTION
      'schema base assente (partecipazioni, audit_log, get_user_role, update_updated_at_column o set_updated_by_auth_uid). Le migration sono incrementali e presuppongono db/init.';
  END IF;
END
$preflight$;

CREATE TABLE IF NOT EXISTS public.partecipazioni_note (
  partecipazione_id UUID PRIMARY KEY REFERENCES public.partecipazioni(id) ON DELETE CASCADE,
  note              TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.partecipazioni_note IS
  'Note interne sulla partecipazione. Visibili ad admin, operatore e readonly. Il ruolo artista non ha policy di lettura.';

COMMENT ON COLUMN public.partecipazioni_note.note IS
  'Testo spostato da partecipazioni.note. Non esposto all''area personale artista.';

CREATE OR REPLACE TRIGGER update_partecipazioni_note_updated_at
  BEFORE UPDATE ON public.partecipazioni_note
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_partecipazioni_note_updated_by
  BEFORE INSERT OR UPDATE ON public.partecipazioni_note
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by_auth_uid();

-- Copia prima dei trigger di audit, così il backfill non riempie il registro.
DO $copy_notes$
DECLARE
  v_before integer;
  v_after integer;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'partecipazioni'
      AND column_name = 'note'
  ) THEN
    SELECT count(*) INTO v_before
    FROM public.partecipazioni
    WHERE note IS NOT NULL;

    INSERT INTO public.partecipazioni_note (partecipazione_id, note, created_at, updated_at, updated_by)
    SELECT
      p.id,
      p.note,
      COALESCE(p.created_at, NOW()),
      COALESCE(p.updated_at, p.created_at, NOW()),
      p.updated_by
    FROM public.partecipazioni p
    WHERE p.note IS NOT NULL
    ON CONFLICT (partecipazione_id) DO UPDATE
    SET
      note = EXCLUDED.note,
      updated_at = EXCLUDED.updated_at,
      updated_by = EXCLUDED.updated_by
    WHERE public.partecipazioni_note.note IS DISTINCT FROM EXCLUDED.note;

    SELECT count(*) INTO v_after
    FROM public.partecipazioni p
    JOIN public.partecipazioni_note n ON n.partecipazione_id = p.id
    WHERE p.note IS NOT NULL
      AND n.note IS NOT DISTINCT FROM p.note;

    IF v_after IS DISTINCT FROM v_before
       OR EXISTS (
         SELECT 1
         FROM public.partecipazioni p
         LEFT JOIN public.partecipazioni_note n ON n.partecipazione_id = p.id
         WHERE p.note IS NOT NULL
           AND n.note IS DISTINCT FROM p.note
       ) THEN
      RAISE EXCEPTION
        'migrazione note partecipazioni: attese % note, allineate %. Rollback.',
        v_before, v_after;
    END IF;

    ALTER TABLE public.partecipazioni DROP COLUMN note;
  END IF;
END
$copy_notes$;

ALTER TABLE public.partecipazioni_note ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partecipazioni_note_select_policy" ON public.partecipazioni_note;
CREATE POLICY "partecipazioni_note_select_policy"
  ON public.partecipazioni_note
  FOR SELECT
  TO public
  USING (
    (select public.get_user_role()) = ANY (
      ARRAY[
        'admin'::public.ruolo_utente,
        'operatore'::public.ruolo_utente,
        'readonly'::public.ruolo_utente
      ]
    )
  );

DROP POLICY IF EXISTS "partecipazioni_note_insert_policy" ON public.partecipazioni_note;
CREATE POLICY "partecipazioni_note_insert_policy"
  ON public.partecipazioni_note
  FOR INSERT
  TO public
  WITH CHECK (
    (select public.get_user_role()) = ANY (
      ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]
    )
  );

DROP POLICY IF EXISTS "partecipazioni_note_update_policy" ON public.partecipazioni_note;
CREATE POLICY "partecipazioni_note_update_policy"
  ON public.partecipazioni_note
  FOR UPDATE
  TO public
  USING (
    (select public.get_user_role()) = ANY (
      ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]
    )
  )
  WITH CHECK (
    (select public.get_user_role()) = ANY (
      ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]
    )
  );

DROP POLICY IF EXISTS "partecipazioni_note_delete_policy" ON public.partecipazioni_note;
CREATE POLICY "partecipazioni_note_delete_policy"
  ON public.partecipazioni_note
  FOR DELETE
  TO public
  USING (
    (select public.get_user_role()) = ANY (
      ARRAY['admin'::public.ruolo_utente, 'operatore'::public.ruolo_utente]
    )
  );

REVOKE ALL ON TABLE public.partecipazioni_note FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.partecipazioni_note TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.audit_partecipazioni_note_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_old jsonb;
  v_new jsonb;
  v_changed text[];
  v_artista uuid;
  v_opera uuid;
  v_label text;
  v_email text;
  v_ruolo text;
  v_claims jsonb;
  v_partecipazione uuid := COALESCE(NEW.partecipazione_id, OLD.partecipazione_id);
BEGIN
  IF TG_OP = 'UPDATE' AND v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old := to_jsonb(OLD) - ARRAY['updated_at', 'updated_by'];
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new := to_jsonb(NEW) - ARRAY['updated_at', 'updated_by'];
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(n.key ORDER BY n.key)
    INTO v_changed
    FROM jsonb_each(v_new) AS n
    WHERE v_old -> n.key IS DISTINCT FROM n.value;

    IF v_changed IS NULL THEN
      RETURN NULL;
    END IF;

    SELECT jsonb_object_agg(key, value) INTO v_old FROM jsonb_each(v_old) WHERE key = ANY (v_changed);
    SELECT jsonb_object_agg(key, value) INTO v_new FROM jsonb_each(v_new) WHERE key = ANY (v_changed);
  END IF;

  BEGIN
    v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  EXCEPTION WHEN others THEN
    v_claims := NULL;
  END;
  v_email := v_claims ->> 'email';
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

  SELECT p.artista_id, p.opera_id,
         concat_ws(' — ', trim(a.nome::text || ' ' || a.cognome::text), o.titolo::text)
  INTO v_artista, v_opera, v_label
  FROM public.partecipazioni p
  LEFT JOIN public.artisti a ON a.id = p.artista_id
  LEFT JOIN public.opere o ON o.id = p.opera_id
  WHERE p.id = v_partecipazione;

  INSERT INTO public.audit_log (
    user_id, user_email, user_ruolo, azione, tabella, record_id, record_label,
    artista_id, opera_id, campi_modificati, old_data, new_data
  ) VALUES (
    v_uid, v_email, v_ruolo, TG_OP, 'partecipazioni_note',
    v_partecipazione::text,
    left(v_label, 300),
    v_artista, v_opera, v_changed, v_old, v_new
  );

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_partecipazioni_note_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_partecipazioni_note_change ON public.partecipazioni_note;
CREATE TRIGGER audit_partecipazioni_note_change
  AFTER INSERT OR UPDATE OR DELETE ON public.partecipazioni_note
  FOR EACH ROW EXECUTE FUNCTION public.audit_partecipazioni_note_change();
