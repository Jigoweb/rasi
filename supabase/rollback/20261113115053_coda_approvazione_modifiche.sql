-- Rollback di 20261113115053_coda_approvazione_modifiche.sql
-- Ripristina le scritture dirette della fase 2a (opera_modificabile / is_opere_editor).
-- Le proposte già approvate restano nei dati delle tabelle: questo script
-- toglie solo la coda e le colonne di validazione.

DROP FUNCTION IF EXISTS public.respingi_modifica(uuid, text);
DROP FUNCTION IF EXISTS public.approva_modifica(uuid, text);
DROP FUNCTION IF EXISTS public.proponi_modifica(text, text, jsonb, uuid, uuid);
DROP FUNCTION IF EXISTS public.modifica_richiede_campi(text, jsonb);
DROP FUNCTION IF EXISTS public.modifica_rifiuta_se_validata(uuid);
DROP FUNCTION IF EXISTS public.modifica_tabella(text);
DROP FUNCTION IF EXISTS public.modifica_applica_dopo(text, uuid, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.modifica_controlla_dopo(jsonb, jsonb);
DROP FUNCTION IF EXISTS public.modifica_espressione(text, text);
DROP FUNCTION IF EXISTS public.modifica_colonne_consentite(text);

DROP TABLE IF EXISTS public.modifiche_proposte;

DROP TRIGGER IF EXISTS opere_registra_validazione ON public.opere;
DROP FUNCTION IF EXISTS public.opere_registra_validazione();

ALTER TABLE public.opere DROP COLUMN IF EXISTS validato_il;
ALTER TABLE public.opere DROP COLUMN IF EXISTS validato_da;

-- Policy di scrittura come in 20261112090100_restrizioni_ruoli_operatore.sql
DROP POLICY IF EXISTS "opere_insert_policy" ON public.opere;
CREATE POLICY "opere_insert_policy" ON public.opere
  FOR INSERT WITH CHECK ((SELECT public.is_opere_editor()));

DROP POLICY IF EXISTS "opere_update_policy" ON public.opere;
CREATE POLICY "opere_update_policy" ON public.opere
  FOR UPDATE
  USING (public.opera_modificabile(id))
  WITH CHECK ((SELECT public.is_opere_editor()));

DROP POLICY IF EXISTS "episodi_insert_policy" ON public.episodi;
CREATE POLICY "episodi_insert_policy" ON public.episodi
  FOR INSERT WITH CHECK (public.opera_modificabile(opera_id));
DROP POLICY IF EXISTS "episodi_update_policy" ON public.episodi;
CREATE POLICY "episodi_update_policy" ON public.episodi
  FOR UPDATE
  USING (public.opera_modificabile(opera_id))
  WITH CHECK (public.opera_modificabile(opera_id));
DROP POLICY IF EXISTS "episodi_delete_policy" ON public.episodi;
CREATE POLICY "episodi_delete_policy" ON public.episodi
  FOR DELETE USING (public.opera_modificabile(opera_id));

DROP POLICY IF EXISTS "partecipazioni_insert_policy" ON public.partecipazioni;
CREATE POLICY "partecipazioni_insert_policy" ON public.partecipazioni
  FOR INSERT WITH CHECK (public.opera_modificabile(opera_id));
DROP POLICY IF EXISTS "partecipazioni_update_policy" ON public.partecipazioni;
CREATE POLICY "partecipazioni_update_policy" ON public.partecipazioni
  FOR UPDATE
  USING (public.opera_modificabile(opera_id))
  WITH CHECK (public.opera_modificabile(opera_id));
DROP POLICY IF EXISTS "partecipazioni_delete_policy" ON public.partecipazioni;
CREATE POLICY "partecipazioni_delete_policy" ON public.partecipazioni
  FOR DELETE USING (public.opera_modificabile(opera_id));

DROP POLICY IF EXISTS "cast_esterno_insert_policy" ON public.cast_esterno;
CREATE POLICY "cast_esterno_insert_policy" ON public.cast_esterno
  FOR INSERT WITH CHECK (public.opera_modificabile(opera_id));
DROP POLICY IF EXISTS "cast_esterno_update_policy" ON public.cast_esterno;
CREATE POLICY "cast_esterno_update_policy" ON public.cast_esterno
  FOR UPDATE
  USING (public.opera_modificabile(opera_id))
  WITH CHECK (public.opera_modificabile(opera_id));
DROP POLICY IF EXISTS "cast_esterno_delete_policy" ON public.cast_esterno;
CREATE POLICY "cast_esterno_delete_policy" ON public.cast_esterno
  FOR DELETE USING (public.opera_modificabile(opera_id));
