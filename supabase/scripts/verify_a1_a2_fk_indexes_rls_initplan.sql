-- Verifica read-only dopo le migration A1 e A2 (20261029082849, 20261029082850).
-- Da eseguire a mano sul database su cui le migration sono state applicate.
-- Non modifica nulla.
-- Atteso: la prima query torna 4 righe con ok = true; la seconda 0 righe;
-- la terza torna 40.

-- A1. Definizione degli indici. Atteso: 4 righe, valido = true.
SELECT
  c.relname AS indexname,
  i.indisvalid AND i.indisready AS valido,
  pg_get_indexdef(c.oid) AS indexdef
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_index i ON i.indexrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relname IN (
    'idx_individuazioni_episodio_id',
    'idx_partecipazioni_episodio_id',
    'idx_partecipazioni_ruolo_id',
    'idx_ci_episode_alerts_opera_id'
  )
ORDER BY c.relname;

-- A1. Indici mancanti, non validi o con definizione diversa. Atteso: 0 righe.
SELECT expected.name AS indexname, 'mancante, non valido o definizione diversa' AS problema
FROM (
  VALUES
    ('idx_individuazioni_episodio_id', 'CREATE INDEX idx_individuazioni_episodio_id ON public.individuazioni USING btree (episodio_id) WHERE (episodio_id IS NOT NULL)'),
    ('idx_partecipazioni_episodio_id', 'CREATE INDEX idx_partecipazioni_episodio_id ON public.partecipazioni USING btree (episodio_id)'),
    ('idx_partecipazioni_ruolo_id', 'CREATE INDEX idx_partecipazioni_ruolo_id ON public.partecipazioni USING btree (ruolo_id)'),
    ('idx_ci_episode_alerts_opera_id', 'CREATE INDEX idx_ci_episode_alerts_opera_id ON public.campagne_individuazione_episode_alerts USING btree (opera_id)')
) AS expected(name, indexdef)
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_index i ON i.indexrelid = c.oid
  WHERE n.nspname = 'public'
    AND c.relname = expected.name
    AND i.indisvalid
    AND i.indisready
    AND pg_get_indexdef(c.oid) = expected.indexdef
);

-- A2. Chiamate ancora nude sulle 40 policy riscritte. Atteso: 0 righe.
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname = ANY (ARRAY[
    'artisti_select_policy',
    'artisti_insert_policy',
    'artisti_update_policy',
    'artisti_delete_policy',
    'artisti_note_select_policy',
    'artisti_note_write_policy',
    'artisti_referenti_select_policy',
    'artisti_referenti_write_policy',
    'alert_prese_visione_select_policy',
    'alert_prese_visione_write_policy',
    'audit_log_select_policy',
    'cast_esterno_select_policy',
    'cast_esterno_write_policy',
    'opere_write_policy',
    'episodi_write_policy',
    'programmazioni_write_policy',
    'emittenti_select_policy',
    'emittenti_write_policy',
    'ruoli_tipologie_select_policy',
    'ruoli_tipologie_write_policy',
    'parametri_ripartizione_write_policy',
    'campagne_individuazione_select_policy',
    'campagne_individuazione_write_policy',
    'campagne_programmazione_select_policy',
    'campagne_programmazione_write_policy',
    'campagne_ripartizione_select_policy',
    'campagne_ripartizione_write_policy',
    'partecipazioni_select_policy',
    'partecipazioni_write_policy',
    'individuazioni_select_policy',
    'individuazioni_write_policy',
    'ripartizioni_dettaglio_select_policy',
    'ripartizioni_dettaglio_write_policy',
    'campaign_jobs_select_authenticated',
    'upload_jobs_select_owner',
    'Permetti gestione admin pages',
    'Permetti gestione admin documents',
    'Permetti gestione admin bandi_news',
    'opera_aliases_read_all',
    'opera_aliases_write_admin'
  ])
  AND (
    regexp_replace(
      COALESCE(qual, '') || ' ' || COALESCE(with_check, ''),
      '\(\s*SELECT\s+(get_user_role|get_user_artista_id|auth\.uid|auth\.role)\(\)\s+AS\s+[A-Za-z_]+\s*\)',
      '',
      'gi'
    ) ~ 'get_user_role\(\)|get_user_artista_id\(\)|auth\.uid\(\)|auth\.role\(\)'
  )
ORDER BY tablename, policyname;

-- A2. Quante delle 40 policy ci sono. Atteso: 40.
SELECT count(*) AS policy_riscritte
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname = ANY (ARRAY[
    'artisti_select_policy',
    'artisti_insert_policy',
    'artisti_update_policy',
    'artisti_delete_policy',
    'artisti_note_select_policy',
    'artisti_note_write_policy',
    'artisti_referenti_select_policy',
    'artisti_referenti_write_policy',
    'alert_prese_visione_select_policy',
    'alert_prese_visione_write_policy',
    'audit_log_select_policy',
    'cast_esterno_select_policy',
    'cast_esterno_write_policy',
    'opere_write_policy',
    'episodi_write_policy',
    'programmazioni_write_policy',
    'emittenti_select_policy',
    'emittenti_write_policy',
    'ruoli_tipologie_select_policy',
    'ruoli_tipologie_write_policy',
    'parametri_ripartizione_write_policy',
    'campagne_individuazione_select_policy',
    'campagne_individuazione_write_policy',
    'campagne_programmazione_select_policy',
    'campagne_programmazione_write_policy',
    'campagne_ripartizione_select_policy',
    'campagne_ripartizione_write_policy',
    'partecipazioni_select_policy',
    'partecipazioni_write_policy',
    'individuazioni_select_policy',
    'individuazioni_write_policy',
    'ripartizioni_dettaglio_select_policy',
    'ripartizioni_dettaglio_write_policy',
    'campaign_jobs_select_authenticated',
    'upload_jobs_select_owner',
    'Permetti gestione admin pages',
    'Permetti gestione admin documents',
    'Permetti gestione admin bandi_news',
    'opera_aliases_read_all',
    'opera_aliases_write_admin'
  ]);
