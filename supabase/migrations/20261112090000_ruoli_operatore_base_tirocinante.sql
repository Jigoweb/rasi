-- Fase 2a (resoconto RASI del 26/10, punto C5): tre livelli di operatore.
--   operatore       → «Operatore pro» (ruolo esistente, nessun cambio di dati)
--   operatore_base  → vede tutto, scrive solo nella sezione Opere, mai su opere validate
--   tirocinante     → vede e scrive solo nella sezione Opere, mai su opere validate
--
-- Solo i valori dell'enum. Un valore nuovo non si può usare nella stessa
-- transazione in cui viene aggiunto: policy, funzioni e controlli che lo usano
-- stanno nella migration successiva (20261112090100_restrizioni_ruoli_operatore).
-- Finché quella non è applicata get_user_role() restituisce NULL per questi
-- ruoli (nessun accesso), quindi questa migration da sola non apre nulla.

ALTER TYPE public.ruolo_utente ADD VALUE IF NOT EXISTS 'operatore_base';
ALTER TYPE public.ruolo_utente ADD VALUE IF NOT EXISTS 'tirocinante';
