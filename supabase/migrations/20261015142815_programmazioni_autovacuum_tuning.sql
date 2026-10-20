-- Autovacuum più frequente su programmazioni.
--
-- Ogni individuazione riscrive le righe della campagna (processato = true) e
-- gli import ne inseriscono decine di migliaia: con le soglie di default (20%
-- di 5M righe) l'ultimo autovacuum risaliva al 2026-08-07 con 930k righe
-- morte. La visibility map non aggiornata trasformava gli index-only scan in
-- letture random dell'heap (160k heap fetch per contare 89k righe).

ALTER TABLE public.programmazioni SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_insert_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE public.campagne_individuazione_processed_programmazioni SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_vacuum_insert_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.05
);
