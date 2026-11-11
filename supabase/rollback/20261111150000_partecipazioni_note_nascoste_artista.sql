-- Rollback di 20261111150000_partecipazioni_note_nascoste_artista.sql.
-- NON è una migration: non sta in supabase/migrations e non parte da solo.
--
-- Eseguirlo a mano, in un'unica transazione (il BEGIN/COMMIT qui sotto).
-- Rimette il testo in partecipazioni.note e poi elimina partecipazioni_note.
-- Le righe già scritte in audit_log restano: sono storia, non dati vivi.
--
-- Va eseguito insieme al revert del codice applicativo: dopo il rollback la
-- colonna c'è di nuovo e l'app di questa PR legge solo la tabella nuova.

BEGIN;

ALTER TABLE public.partecipazioni ADD COLUMN IF NOT EXISTS note TEXT;

DO $rollback_notes$
BEGIN
  IF to_regclass('public.partecipazioni') IS NULL THEN
    RAISE EXCEPTION 'partecipazioni assente, rollback annullato';
  END IF;

  IF to_regclass('public.partecipazioni_note') IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.partecipazioni p
  SET note = n.note
  FROM public.partecipazioni_note n
  WHERE n.partecipazione_id = p.id
    AND p.note IS DISTINCT FROM n.note;

  IF EXISTS (
    SELECT 1
    FROM public.partecipazioni_note n
    LEFT JOIN public.partecipazioni p ON p.id = n.partecipazione_id
    WHERE p.id IS NULL
       OR p.note IS DISTINCT FROM n.note
  ) THEN
    RAISE EXCEPTION 'rollback note partecipazioni: testo non ripristinato';
  END IF;
END
$rollback_notes$;

DROP TABLE IF EXISTS public.partecipazioni_note;
DROP FUNCTION IF EXISTS public.audit_partecipazioni_note_change();

COMMIT;
