-- Use only the campaign competence year for artist mandate filtering.
-- `programmazioni.anno` is the work/episode year and remains a matching
-- discriminator for homonyms; it must not decide artist mandate eligibility.

CREATE OR REPLACE FUNCTION public.match_programmazione_to_partecipazioni(
    p_programmazione_id uuid,
    p_soglia_titolo numeric,
    p_artista_ids uuid[],
    p_tolleranza_anno_soft integer,
    p_tolleranza_anno_hard integer,
    p_mandato_override_artist_ids uuid[]
)
RETURNS TABLE (
    partecipazione_id uuid,
    opera_id uuid,
    episodio_id uuid,
    artista_id uuid,
    ruolo_id uuid,
    punteggio numeric,
    dettagli_matching jsonb
)
LANGUAGE sql
STABLE
AS $function$
  WITH anno_competenza AS (
    SELECT cp.anno AS anno
    FROM public.programmazioni p
    JOIN public.campagne_programmazione cp
      ON cp.id = p.campagna_programmazione_id
    WHERE p.id = p_programmazione_id
  )
  SELECT
    m.partecipazione_id,
    m.opera_id,
    m.episodio_id,
    m.artista_id,
    m.ruolo_id,
    m.punteggio,
    CASE
      WHEN p_mandato_override_artist_ids IS NOT NULL
        AND m.artista_id = ANY(p_mandato_override_artist_ids)
      THEN jsonb_set(
        m.dettagli_matching,
        '{mandato}',
        jsonb_build_object(
          'anno_competenza', ac.anno,
          'criterio', 'anno_campagna_programmazione',
          'override', true
        ),
        true
      )
      ELSE jsonb_set(
        m.dettagli_matching,
        '{mandato}',
        jsonb_build_object(
          'anno_competenza', ac.anno,
          'criterio', 'anno_campagna_programmazione',
          'override', false
        ),
        true
      )
    END AS dettagli_matching
  FROM public.match_programmazione_to_partecipazioni(
    p_programmazione_id,
    p_soglia_titolo,
    p_artista_ids,
    p_tolleranza_anno_soft,
    p_tolleranza_anno_hard
  ) m
  CROSS JOIN anno_competenza ac
  WHERE public.artist_mandate_covers_year(
    m.artista_id,
    ac.anno,
    p_mandato_override_artist_ids
  );
$function$;

COMMENT ON FUNCTION public.match_programmazione_to_partecipazioni(uuid, numeric, uuid[], integer, integer, uuid[])
IS 'Mandate-aware overload of the individuazione matcher. Filters artist matches only by campaign competence year, never by the work/episode year stored in programmazioni.anno.';
