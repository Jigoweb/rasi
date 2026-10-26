-- Backfill numero_episodio / numero_stagione for historical programmazioni where
-- upload already stored episode_normalization in metadati but the old gate
-- (confidence = high only) left canonical columns null.
-- Prefer metadati (fast, already computed). Fallback: derive for rows with
-- Ep.N / Episode N patterns in titles and no usable metadati episode.

WITH from_metadati AS (
  SELECT
    p.id,
    NULLIF(p.metadati_trasmissione->'episode_normalization'->>'season', '')::integer AS derived_stagione,
    NULLIF(p.metadati_trasmissione->'episode_normalization'->>'episode', '')::integer AS derived_episodio
  FROM public.programmazioni p
  WHERE p.numero_episodio IS NULL
    AND p.metadati_trasmissione ? 'episode_normalization'
    AND (p.metadati_trasmissione->'episode_normalization'->>'confidence') IN ('high', 'medium')
    AND NULLIF(p.metadati_trasmissione->'episode_normalization'->>'episode', '') IS NOT NULL
),
from_derive AS (
  SELECT
    p.id,
    d.numero_stagione AS derived_stagione,
    d.numero_episodio AS derived_episodio
  FROM public.programmazioni p
  CROSS JOIN LATERAL public.derive_programmazione_episode_signals(
    p.numero_stagione,
    p.numero_episodio,
    p.titolo,
    p.titolo_originale,
    p.titolo_episodio,
    p.titolo_episodio_originale
  ) d
  WHERE p.numero_episodio IS NULL
    AND NOT EXISTS (SELECT 1 FROM from_metadati m WHERE m.id = p.id)
    AND (
      COALESCE(p.titolo_episodio, '') ~* '\y(?:episode|episodio|ep)\.?\s*[0-9]{1,3}\y'
      OR COALESCE(p.titolo_episodio_originale, '') ~* '\y(?:episode|episodio|ep)\.?\s*[0-9]{1,3}\y'
      OR COALESCE(p.titolo, '') ~* '\ys(?:t)?\.?\s*[0-9]{1,2}\s*e(?:p(?:isode)?)?\.?\s*[0-9]{1,3}\y'
      OR COALESCE(p.titolo_episodio, '') ~* '\ys(?:t)?\.?\s*[0-9]{1,2}\s*e(?:p(?:isode)?)?\.?\s*[0-9]{1,3}\y'
    )
    AND (
      d.confidence = 'high'
      OR (d.confidence = 'medium' AND d.numero_episodio IS NOT NULL)
    )
),
eligible AS (
  SELECT * FROM from_metadati
  UNION ALL
  SELECT * FROM from_derive
)
UPDATE public.programmazioni p
SET
  numero_stagione = COALESCE(p.numero_stagione, e.derived_stagione),
  numero_episodio = COALESCE(p.numero_episodio, e.derived_episodio)
FROM eligible e
WHERE p.id = e.id
  AND e.derived_episodio IS NOT NULL
  AND (
    (p.numero_stagione IS NULL AND e.derived_stagione IS NOT NULL)
    OR p.numero_episodio IS NULL
  );
