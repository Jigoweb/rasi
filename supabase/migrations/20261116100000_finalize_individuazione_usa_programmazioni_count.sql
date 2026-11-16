-- finalize_campagna_individuazione: legge il totale da
-- campagne_programmazione.programmazioni_count (mantenuto dai trigger di
-- statement su programmazioni) invece di COUNT(*) sulla tabella.
--
-- Su PLEX FAST 2024 (100.000 righe) il COUNT(*) impiegava 11,0 s subito dopo
-- l'individuazione: ogni riga era appena stata aggiornata (processato = true)
-- e l'index-only scan doveva leggere l'heap (131.055 heap fetch). Lo
-- statement_timeout di 8 s delle chiamate dall'app annullava la chiusura: tutti
-- i blocchi erano fatti e le individuazioni salvate, ma la campagna restava
-- "in_corso" con 0 individuazioni in elenco, e «Riprendi» ripeteva lo stesso
-- errore. Stessa causa e stessa correzione di init_campagna_individuazione
-- (20261015142707). COUNT(*) resta come fallback se il contatore non c'è.
--
-- Le quattro statistiche sulle individuazioni passano in una sola query.
-- Firma, SECURITY DEFINER, search_path e risultato restano identici; i grant
-- (solo service_role) non cambiano con CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.finalize_campagna_individuazione(
  p_campagne_individuazione_id uuid,
  p_campagne_programmazione_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_programmazioni_totali INTEGER;
    v_programmazioni_con_match INTEGER;
    v_individuazioni_create INTEGER;
    v_artisti_distinti INTEGER;
    v_opere_distinte INTEGER;
    v_statistiche JSONB;
BEGIN
    SELECT cp.programmazioni_count INTO v_programmazioni_totali
    FROM campagne_programmazione cp
    WHERE cp.id = p_campagne_programmazione_id;

    IF v_programmazioni_totali IS NULL OR v_programmazioni_totali <= 0 THEN
        SELECT COUNT(*) INTO v_programmazioni_totali
        FROM programmazioni
        WHERE campagna_programmazione_id = p_campagne_programmazione_id;
    END IF;

    SELECT
        COUNT(DISTINCT programmazione_id),
        COUNT(*),
        COUNT(DISTINCT artista_id),
        COUNT(DISTINCT opera_id)
    INTO
        v_programmazioni_con_match,
        v_individuazioni_create,
        v_artisti_distinti,
        v_opere_distinte
    FROM individuazioni
    WHERE campagna_individuazioni_id = p_campagne_individuazione_id;

    v_statistiche := jsonb_build_object(
        'programmazioni_totali', v_programmazioni_totali,
        'programmazioni_processate', v_programmazioni_totali,
        'programmazioni_con_match', v_programmazioni_con_match,
        'programmazioni_senza_match', v_programmazioni_totali - v_programmazioni_con_match,
        'individuazioni_create', v_individuazioni_create,
        'artisti_distinti', v_artisti_distinti,
        'opere_distinte', v_opere_distinte,
        'data_completamento', NOW(),
        'errore', false
    );

    UPDATE campagne_individuazione
    SET
        statistiche = v_statistiche,
        stato = 'completata',
        updated_at = NOW()
    WHERE id = p_campagne_individuazione_id;

    UPDATE campagne_programmazione
    SET is_individuated = TRUE,
        stato = 'individuata',
        updated_at = NOW()
    WHERE id = p_campagne_programmazione_id;

    RETURN jsonb_build_object(
        'success', true,
        'statistiche', v_statistiche
    );
END;
$function$;
