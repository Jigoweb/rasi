-- Report read-only su artista_id Auth. Non modifica dati e non stampa email.
-- Eseguirlo PRIMA della migration 20261020205939_artista_id_app_metadata.sql
-- e di nuovo DOPO, come verifica.
--
-- Prima della migration il proprietario elimina da Auth l'artista non
-- collegato 2caf7dfe-9801-4416-867e-f5f284987a58 (nessun artista_id).
-- Dopo quella cancellazione e prima del backfill ci si aspetta:
--   artisti_app_ruolo = 2
--   user_metadata valido = 2
--   app_metadata valido = 0
--   artisti senza artista_id = 0
--   non_artista con artista_id = 0
-- Dopo il backfill: app_metadata valido = 2 e user_metadata artista_id assente.
-- Se l'uid da eliminare compare ancora in questo report, non applicare la migration.

SELECT 'artisti' AS report,
       u.id,
       COALESCE(u.raw_app_meta_data ->> 'ruolo', '(assente)') AS ruolo_app_metadata,
       COALESCE(u.raw_user_meta_data ->> 'ruolo', '(assente)') AS ruolo_user_metadata,
       NULLIF(u.raw_user_meta_data ->> 'artista_id', '') AS artista_id_user_metadata,
       NULLIF(u.raw_app_meta_data ->> 'artista_id', '') AS artista_id_app_metadata,
       CASE
         WHEN NULLIF(u.raw_user_meta_data ->> 'artista_id', '')
              ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           THEN EXISTS (
             SELECT 1 FROM public.artisti a
             WHERE a.id = (u.raw_user_meta_data ->> 'artista_id')::uuid
           )
         ELSE false
       END AS user_artista_esiste,
       CASE
         WHEN NULLIF(u.raw_app_meta_data ->> 'artista_id', '')
              ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           THEN EXISTS (
             SELECT 1 FROM public.artisti a
             WHERE a.id = (u.raw_app_meta_data ->> 'artista_id')::uuid
           )
         ELSE false
       END AS app_artista_esiste,
       CASE
         WHEN u.id = '2caf7dfe-9801-4416-867e-f5f284987a58'::uuid
           THEN 'eliminare_prima_della_migration'
         WHEN u.raw_app_meta_data ->> 'ruolo' = 'artista'
          AND NULLIF(u.raw_user_meta_data ->> 'artista_id', '') IS NULL
          AND NULLIF(u.raw_app_meta_data ->> 'artista_id', '') IS NULL
           THEN 'artista_senza_id'
         ELSE 'ok'
       END AS nota
FROM auth.users u
WHERE u.raw_app_meta_data ->> 'ruolo' = 'artista'
   OR u.raw_user_meta_data ->> 'ruolo' = 'artista'
   OR NULLIF(u.raw_user_meta_data ->> 'artista_id', '') IS NOT NULL
   OR NULLIF(u.raw_app_meta_data ->> 'artista_id', '') IS NOT NULL
ORDER BY nota, u.id;

SELECT 'summary' AS report,
       COUNT(*) FILTER (WHERE raw_app_meta_data ->> 'ruolo' = 'artista') AS artisti_app_ruolo,
       COUNT(*) FILTER (
         WHERE raw_app_meta_data ->> 'ruolo' = 'artista'
           AND CASE
             WHEN NULLIF(raw_user_meta_data ->> 'artista_id', '')
                  ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
               THEN EXISTS (
                 SELECT 1 FROM public.artisti a
                 WHERE a.id = (raw_user_meta_data ->> 'artista_id')::uuid
               )
             ELSE false
           END
       ) AS artisti_user_metadata_valido,
       COUNT(*) FILTER (
         WHERE raw_app_meta_data ->> 'ruolo' = 'artista'
           AND CASE
             WHEN NULLIF(raw_app_meta_data ->> 'artista_id', '')
                  ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
               THEN EXISTS (
                 SELECT 1 FROM public.artisti a
                 WHERE a.id = (raw_app_meta_data ->> 'artista_id')::uuid
               )
             ELSE false
           END
       ) AS artisti_app_metadata_valido,
       COUNT(*) FILTER (
         WHERE raw_app_meta_data ->> 'ruolo' = 'artista'
           AND NULLIF(raw_user_meta_data ->> 'artista_id', '') IS NULL
           AND NULLIF(raw_app_meta_data ->> 'artista_id', '') IS NULL
       ) AS artisti_senza_artista_id,
       COUNT(*) FILTER (
         WHERE COALESCE(raw_app_meta_data ->> 'ruolo', '') <> 'artista'
           AND (
             NULLIF(raw_user_meta_data ->> 'artista_id', '') IS NOT NULL
             OR NULLIF(raw_app_meta_data ->> 'artista_id', '') IS NOT NULL
           )
       ) AS non_artista_con_artista_id
FROM auth.users;
