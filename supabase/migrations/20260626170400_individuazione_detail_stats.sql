create or replace function public.get_individuazione_detail_stats(
  p_campagna_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with campagna as (
  select statistiche
  from campagne_individuazione
  where id = p_campagna_id
),
base as (
  select
    i.*,
    case
      when i.punteggio_matching is null then 0
      when i.punteggio_matching > 1 then i.punteggio_matching
      else i.punteggio_matching * 100
    end as score_percent
  from individuazioni i
  where i.campagna_individuazioni_id = p_campagna_id
),
counts as (
  select
    coalesce(count(*), 0)::int as totale,
    coalesce(count(*) filter (where stato = 'individuato'), 0)::int as individuati,
    coalesce(count(*) filter (where stato = 'validato'), 0)::int as validati,
    coalesce(count(*) filter (where stato = 'dubbioso'), 0)::int as dubbiosi,
    coalesce(count(*) filter (where stato = 'respinto'), 0)::int as respinti,
    coalesce(count(*) filter (where score_percent >= 90), 0)::int as match_alti,
    coalesce(count(*) filter (where score_percent >= 70 and score_percent < 90), 0)::int as match_medi,
    coalesce(count(*) filter (where score_percent > 0 and score_percent < 70), 0)::int as match_bassi,
    coalesce(count(*) filter (where dettagli_matching->>'episodio_mancante' = 'true'), 0)::int as episodio_da_controllare,
    coalesce(count(distinct artista_id), 0)::int as artisti_distinti,
    coalesce(count(distinct opera_id), 0)::int as opere_distinte,
    coalesce(round(avg(score_percent)::numeric, 1), 0)::numeric as score_medio,
    coalesce(round(min(score_percent)::numeric, 1), 0)::numeric as score_min,
    coalesce(round(max(score_percent)::numeric, 1), 0)::numeric as score_max
  from base
),
review as (
  select
    coalesce(count(*), 0)::int as da_controllare
  from base
  where
    stato = 'dubbioso'
    or score_percent < 70
    or dettagli_matching->>'episodio_mancante' = 'true'
),
top_ruolo as (
  select
    rt.nome,
    count(*)::int as count
  from base b
  left join ruoli_tipologie rt on rt.id = b.ruolo_id
  where b.ruolo_id is not null
  group by rt.nome
  order by count(*) desc, rt.nome asc
  limit 1
),
stats as (
  select
    coalesce((c.statistiche->>'programmazioni_totali')::int, 0) as programmazioni_totali,
    coalesce((c.statistiche->>'programmazioni_processate')::int, 0) as programmazioni_processate,
    coalesce((c.statistiche->>'programmazioni_con_match')::int, 0) as programmazioni_con_match,
    coalesce(
      (c.statistiche->>'programmazioni_senza_match')::int,
      greatest(
        coalesce((c.statistiche->>'programmazioni_totali')::int, 0)
        - coalesce((c.statistiche->>'programmazioni_con_match')::int, 0),
        0
      )
    ) as programmazioni_senza_match
  from campagna c
)
select jsonb_build_object(
  'coverage', jsonb_build_object(
    'programmazioniTotali', stats.programmazioni_totali,
    'programmazioniProcessate', stats.programmazioni_processate,
    'programmazioniConMatch', stats.programmazioni_con_match,
    'programmazioniSenzaMatch', stats.programmazioni_senza_match,
    'coperturaPercentuale', case
      when stats.programmazioni_totali > 0
        then round((stats.programmazioni_con_match::numeric / stats.programmazioni_totali::numeric) * 100, 1)
      else 0
    end
  ),
  'outcomes', jsonb_build_object(
    'totale', counts.totale,
    'individuati', counts.individuati,
    'validati', counts.validati,
    'dubbiosi', counts.dubbiosi,
    'respinti', counts.respinti,
    'sicuri', counts.individuati + counts.validati
  ),
  'quality', jsonb_build_object(
    'scoreMedio', counts.score_medio,
    'scoreMin', counts.score_min,
    'scoreMax', counts.score_max,
    'matchAlti', counts.match_alti,
    'matchMedi', counts.match_medi,
    'matchBassi', counts.match_bassi
  ),
  'review', jsonb_build_object(
    'daControllare', review.da_controllare,
    'dubbiosi', counts.dubbiosi,
    'scoreBasso', counts.match_bassi,
    'episodioDaControllare', counts.episodio_da_controllare
  ),
  'catalog', jsonb_build_object(
    'artistiDistinti', counts.artisti_distinti,
    'opereDistinte', counts.opere_distinte,
    'ruoloPrincipale', (
      select case
        when top_ruolo.nome is null then null
        else jsonb_build_object('nome', top_ruolo.nome, 'count', top_ruolo.count)
      end
      from top_ruolo
    )
  )
)
from stats, counts, review;
$$;

grant execute on function public.get_individuazione_detail_stats(uuid) to authenticated;
