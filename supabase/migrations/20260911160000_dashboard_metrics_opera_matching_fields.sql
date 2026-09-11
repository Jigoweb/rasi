-- Data Health: include opera matching signals beyond title/year/imdb.
-- Adds regia, alias titoli, ISAN, year-end range (series) and missing episodes.

create or replace function public.get_dashboard_metrics(
  p_first_day date,
  p_last_day date
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with counts as (
  select
    (select count(*) from artisti where stato = 'attivo')::int as artisti_attivi,
    (select count(*) from opere)::int as opere_totali,
    (select count(*) from episodi)::int as episodi_totali,
    (select count(*) from opere where tipo = 'film')::int as opere_film,
    (select count(*) from opere where tipo = 'serie_tv')::int as opere_serie_tv,
    (select count(*) from programmazioni where data_trasmissione >= p_first_day and data_trasmissione <= p_last_day)::int as programmazioni_mese,
    (
      select count(*)
      from campagne_individuazione ci
      join campagne_programmazione cp on cp.id = ci.campagne_programmazione_id
      where ci.stato = 'in_corso'
        and cp.stato = 'in_corso'
    )::int as campagne_attive,
    coalesce((select sum(importo_totale_disponibile::numeric) from campagne_ripartizione where stato = 'distribuita'), 0)::numeric as importo_distribuito,
    (select count(*) from individuazioni)::int as individuazioni_totali,
    (select count(*) from individuazioni where stato <> 'respinto')::int as individuazioni_valide,
    (select count(*) from partecipazioni)::int as partecipazioni,
    (select count(*) from campagne_ripartizione)::int as campagne_ripartizione,
    (select created_at from programmazioni order by created_at desc limit 1) as ultimo_dato
),
health as (
  select
    (
      select count(*) from artisti
      where
        coalesce(codice_ipn, '') = ''
        or coalesce(nome, '') = ''
        or coalesce(cognome, '') = ''
        or stato is null
        or coalesce(imdb_nconst, '') = ''
        or data_nascita is null
        or coalesce(codice_fiscale, '') = ''
    )::int as artisti_incompleti,
    (
      select count(*) from opere
      where
        coalesce(titolo, '') = ''
        or tipo is null
        or anno_produzione is null
        or coalesce(imdb_tconst, '') = ''
        or coalesce(titolo_originale, '') = ''
        or coalesce(cardinality(regista), 0) = 0
        or (tipo = 'serie_tv' and has_episodes = false)
    )::int as opere_incomplete,
    (select count(*) from artisti where coalesce(codice_ipn, '') = '')::int as artisti_missing_codice_ipn,
    (select count(*) from artisti where coalesce(nome, '') = '')::int as artisti_missing_nome,
    (select count(*) from artisti where coalesce(cognome, '') = '')::int as artisti_missing_cognome,
    (select count(*) from artisti where stato is null)::int as artisti_missing_stato,
    (select count(*) from artisti where coalesce(imdb_nconst, '') = '')::int as artisti_missing_imdb_nconst,
    (select count(*) from artisti where data_nascita is null)::int as artisti_missing_data_nascita,
    (select count(*) from artisti where coalesce(codice_fiscale, '') = '')::int as artisti_missing_codice_fiscale,
    (select count(*) from opere where coalesce(titolo, '') = '')::int as opere_missing_titolo,
    (select count(*) from opere where tipo is null)::int as opere_missing_tipo,
    (select count(*) from opere where anno_produzione is null)::int as opere_missing_anno_produzione,
    (select count(*) from opere where coalesce(imdb_tconst, '') = '')::int as opere_missing_imdb_tconst,
    (select count(*) from opere where coalesce(titolo_originale, '') = '')::int as opere_missing_titolo_originale,
    (select count(*) from opere where coalesce(cardinality(regista), 0) = 0)::int as opere_missing_regista,
    (select count(*) from opere where coalesce(cardinality(alias_titoli), 0) = 0)::int as opere_missing_alias_titoli,
    (select count(*) from opere where coalesce(codice_isan, '') = '')::int as opere_missing_codice_isan,
    (select count(*) from opere where tipo = 'serie_tv' and anno_produzione_fine is null)::int as opere_missing_anno_produzione_fine,
    (select count(*) from opere where tipo = 'serie_tv' and has_episodes = false)::int as opere_missing_episodi
),
recent as (
  select coalesce(jsonb_agg(item order by (item->>'timestamp')::timestamptz desc), '[]'::jsonb) as items
  from (
    select jsonb_build_object(
      'tipo', 'artista',
      'label', 'Nuovo artista registrato',
      'dettaglio', concat_ws(' ', nome, cognome),
      'timestamp', created_at
    ) as item
    from (select nome, cognome, created_at from artisti order by created_at desc limit 3) a
    union all
    select jsonb_build_object(
      'tipo', 'opera',
      'label', 'Nuova opera catalogata',
      'dettaglio', titolo,
      'timestamp', created_at
    )
    from (select titolo, created_at from opere order by created_at desc limit 3) o
    union all
    select jsonb_build_object(
      'tipo', 'campagna_individuazione',
      'label', 'Campagna completata',
      'dettaglio', nome,
      'timestamp', updated_at
    )
    from (select nome, updated_at from campagne_individuazione where stato = 'completata' order by updated_at desc limit 3) ci
    union all
    select jsonb_build_object(
      'tipo', 'campagna_programmazione',
      'label', 'Nuova campagna programmazione',
      'dettaglio', nome,
      'timestamp', created_at
    )
    from (select nome, created_at from campagne_programmazione order by created_at desc limit 3) cp
  ) recent_items
)
select jsonb_build_object(
  'stats', jsonb_build_object(
    'artisti_attivi', counts.artisti_attivi,
    'opere_totali', counts.opere_totali,
    'episodi_totali', counts.episodi_totali,
    'opere_film', counts.opere_film,
    'opere_serie_tv', counts.opere_serie_tv,
    'programmazioni_mese', counts.programmazioni_mese,
    'campagne_attive', counts.campagne_attive,
    'importo_distribuito', counts.importo_distribuito,
    'tasso_matching', case
      when counts.individuazioni_totali = 0 then 0
      else round((counts.individuazioni_valide::numeric / counts.individuazioni_totali::numeric) * 1000) / 10
    end
  ),
  'totalArtisti', counts.artisti_attivi,
  'totalOpere', counts.opere_totali,
  'individuazioniTotal', counts.individuazioni_totali,
  'secondary', jsonb_build_object(
    'attivitaRecenti', recent.items,
    'statsAggiuntive', jsonb_build_object(
      'individuazioni', counts.individuazioni_totali,
      'partecipazioni', counts.partecipazioni,
      'campagneRipartizione', counts.campagne_ripartizione,
      'ultimoDato', counts.ultimo_dato
    )
  ),
  'health', jsonb_build_object(
    'artistiIncompleti', health.artisti_incompleti,
    'opereIncomplete', health.opere_incomplete,
    'artistiMetrics', jsonb_build_array(
      jsonb_build_object('key', 'codice_ipn', 'label', 'Codice IPN', 'missing', health.artisti_missing_codice_ipn, 'total', counts.artisti_attivi),
      jsonb_build_object('key', 'nome', 'label', 'Nome', 'missing', health.artisti_missing_nome, 'total', counts.artisti_attivi),
      jsonb_build_object('key', 'cognome', 'label', 'Cognome', 'missing', health.artisti_missing_cognome, 'total', counts.artisti_attivi),
      jsonb_build_object('key', 'stato', 'label', 'Stato', 'missing', health.artisti_missing_stato, 'total', counts.artisti_attivi),
      jsonb_build_object('key', 'imdb_nconst', 'label', 'IMDB nconst', 'missing', health.artisti_missing_imdb_nconst, 'total', counts.artisti_attivi),
      jsonb_build_object('key', 'data_nascita', 'label', 'Data nascita', 'missing', health.artisti_missing_data_nascita, 'total', counts.artisti_attivi),
      jsonb_build_object('key', 'codice_fiscale', 'label', 'Codice fiscale', 'missing', health.artisti_missing_codice_fiscale, 'total', counts.artisti_attivi)
    ),
    'opereMetrics', jsonb_build_array(
      jsonb_build_object('key', 'titolo', 'label', 'Titolo', 'missing', health.opere_missing_titolo, 'total', counts.opere_totali),
      jsonb_build_object('key', 'tipo', 'label', 'Tipo', 'missing', health.opere_missing_tipo, 'total', counts.opere_totali),
      jsonb_build_object('key', 'anno_produzione', 'label', 'Anno produzione', 'missing', health.opere_missing_anno_produzione, 'total', counts.opere_totali),
      jsonb_build_object('key', 'imdb_tconst', 'label', 'IMDB tconst', 'missing', health.opere_missing_imdb_tconst, 'total', counts.opere_totali),
      jsonb_build_object('key', 'titolo_originale', 'label', 'Titolo originale', 'missing', health.opere_missing_titolo_originale, 'total', counts.opere_totali),
      jsonb_build_object('key', 'regista', 'label', 'Regia', 'missing', health.opere_missing_regista, 'total', counts.opere_totali),
      jsonb_build_object('key', 'alias_titoli', 'label', 'Alias titoli', 'missing', health.opere_missing_alias_titoli, 'total', counts.opere_totali),
      jsonb_build_object('key', 'codice_isan', 'label', 'Codice ISAN', 'missing', health.opere_missing_codice_isan, 'total', counts.opere_totali),
      jsonb_build_object('key', 'anno_produzione_fine', 'label', 'Anno produzione fine', 'missing', health.opere_missing_anno_produzione_fine, 'total', counts.opere_serie_tv),
      jsonb_build_object('key', 'episodi', 'label', 'Episodi (serie TV)', 'missing', health.opere_missing_episodi, 'total', counts.opere_serie_tv)
    )
  )
)
from counts, health, recent;
$$;

grant execute on function public.get_dashboard_metrics(date, date) to authenticated;
