-- Report read-only sul ruolo Auth. Non modifica dati e non stampa email.
-- Eseguirlo PRIMA della migration 20261020075909_role_app_metadata.sql
-- e di nuovo DOPO, come verifica.
--
-- Ruoli attesi: admin, operatore, artista, readonly, collecting.
-- collecting è un ruolo applicativo: get_user_role() non lo restituisce
-- (non è nell'enum ruolo_utente) e le policy lo trattano come assente.
--
-- Prima del backfill ci si aspetta app_metadata_missing per ogni utente
-- che ha già un ruolo noto in user_metadata.
-- Dopo il backfill ci si aspetta una sola riga issue=ok per ciascun ruolo,
-- oppure app_user_mismatch se un ruolo in app_metadata è stato cambiato
-- dopo il cutover (user_metadata resta la copia storica, non autoritativa).

SELECT 'by_role' AS report,
       COALESCE(raw_user_meta_data->>'ruolo', '(assente)') AS ruolo_user_metadata,
       COALESCE(raw_app_meta_data->>'ruolo', '(assente)') AS ruolo_app_metadata,
       COUNT(*) AS utenti
FROM auth.users
GROUP BY 2, 3
ORDER BY 2, 3;

SELECT 'anomaly_count' AS report,
       issue,
       ruolo_user_metadata,
       ruolo_app_metadata,
       COUNT(*) AS utenti
FROM (
  SELECT CASE
           WHEN COALESCE(raw_user_meta_data->>'ruolo', '') NOT IN
                ('admin', 'operatore', 'artista', 'readonly', 'collecting')
             THEN 'user_metadata_missing_or_unexpected'
           WHEN COALESCE(raw_app_meta_data->>'ruolo', '') = ''
             THEN 'app_metadata_missing'
           WHEN COALESCE(raw_app_meta_data->>'ruolo', '') NOT IN
                ('admin', 'operatore', 'artista', 'readonly', 'collecting')
             THEN 'app_metadata_unexpected'
           WHEN (raw_app_meta_data->>'ruolo') IS DISTINCT FROM (raw_user_meta_data->>'ruolo')
             THEN 'app_user_mismatch'
           ELSE 'ok'
         END AS issue,
         COALESCE(raw_user_meta_data->>'ruolo', '(assente)') AS ruolo_user_metadata,
         COALESCE(raw_app_meta_data->>'ruolo', '(assente)') AS ruolo_app_metadata
  FROM auth.users
) roles
GROUP BY issue, ruolo_user_metadata, ruolo_app_metadata
ORDER BY issue, ruolo_user_metadata, ruolo_app_metadata;
