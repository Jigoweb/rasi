-- Riproduce l'ACL post-#58 sulle 8 funzioni staff, così il check legge gli
-- stessi grant che CREATE OR REPLACE deve conservare. Non è una migration.

DO $grants$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.delete_campagna_individuazione_safe(uuid, uuid, integer)',
    'public.delete_campagna_programmazione_safe(uuid, uuid, integer)',
    'public.get_campagne_programmazione_with_counts()',
    'public.get_dashboard_metrics(date, date)',
    'public.get_individuazione_detail_stats(uuid)',
    'public.get_individuazione_episode_alert_summary(uuid)',
    'public.get_individuazione_episode_alerts(uuid)',
    'public.get_processing_progress(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END
$grants$;
