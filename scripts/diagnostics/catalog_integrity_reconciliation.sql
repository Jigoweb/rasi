-- Diagnostica per l'incontro su integrità catalogo + precisione matching serie.
-- Eseguire sul database operativo (read-only). Adattare i filtri emittente/anno.

-- 1) FRINGE: episodi catalogo vs snapshot stagione/episodio delle individuazioni
SELECT
  o.titolo,
  e.numero_stagione AS catalog_stagione,
  e.numero_episodio AS catalog_episodio,
  COUNT(*) AS n_episodi_catalogo
FROM opere o
JOIN episodi e ON e.opera_id = o.id
WHERE o.titolo ILIKE 'FRINGE%'
GROUP BY o.titolo, e.numero_stagione, e.numero_episodio
ORDER BY 1, 2, 3;

SELECT
  i.titolo,
  i.numero_stagione AS snapshot_stagione,
  i.numero_episodio AS snapshot_episodio,
  e.numero_stagione AS catalog_stagione,
  e.numero_episodio AS catalog_episodio,
  i.dettagli_matching->>'episodio_mancante' AS episodio_mancante,
  i.dettagli_matching->'episodio'->>'score' AS ep_score,
  COUNT(*) AS n_individuazioni
FROM individuazioni i
LEFT JOIN episodi e ON e.id = i.episodio_id
WHERE i.titolo ILIKE 'FRINGE%'
GROUP BY 1, 2, 3, 4, 5, 6, 7
ORDER BY 2, 3;

-- 2) HAWAII FIVE-0 stagione 2
SELECT
  e.numero_stagione,
  e.numero_episodio,
  a.cognome,
  a.nome
FROM opere o
JOIN episodi e ON e.opera_id = o.id
LEFT JOIN partecipazioni p ON p.episodio_id = e.id
LEFT JOIN artisti a ON a.id = p.artista_id
WHERE o.titolo ILIKE '%HAWAII%FIVE%'
  AND e.numero_stagione = 2
ORDER BY e.numero_episodio, a.cognome;

SELECT
  i.numero_stagione,
  i.numero_episodio,
  e.numero_stagione AS catalog_stagione,
  e.numero_episodio AS catalog_episodio,
  a.cognome,
  a.nome,
  COUNT(*) AS n
FROM individuazioni i
LEFT JOIN episodi e ON e.id = i.episodio_id
LEFT JOIN artisti a ON a.id = i.artista_id
WHERE i.titolo ILIKE '%HAWAII%FIVE%'
  AND i.numero_stagione = 2
GROUP BY 1, 2, 3, 4, 5, 6
ORDER BY 2, 5;

-- 3) YELLOWSTONE stagione 3 — artisti catalogo vs individuati
SELECT
  e.numero_episodio AS catalog_ep,
  a.cognome,
  a.nome
FROM opere o
JOIN episodi e ON e.opera_id = o.id
JOIN partecipazioni p ON p.episodio_id = e.id
JOIN artisti a ON a.id = p.artista_id
WHERE o.titolo ILIKE 'YELLOWSTONE%'
  AND e.numero_stagione = 3
ORDER BY e.numero_episodio, a.cognome;

SELECT
  i.numero_episodio AS snapshot_ep,
  e.numero_stagione AS matched_stagione,
  e.numero_episodio AS matched_ep,
  a.cognome,
  a.nome,
  i.dettagli_matching->>'episodio_mancante' AS episodio_mancante
FROM individuazioni i
LEFT JOIN episodi e ON e.id = i.episodio_id
LEFT JOIN artisti a ON a.id = i.artista_id
WHERE i.titolo ILIKE 'YELLOWSTONE%'
  AND i.numero_stagione = 3
ORDER BY i.numero_episodio, a.cognome;

-- 4) Manuale D'Amore / D'Am3re — possibili accorpamenti titolo+anno
SELECT
  o.id,
  o.titolo,
  o.titolo_originale,
  o.anno_produzione,
  o.codice_opera,
  o.codice_isan,
  COUNT(p.id) AS n_partecipazioni
FROM opere o
LEFT JOIN partecipazioni p ON p.opera_id = o.id
WHERE o.titolo ILIKE '%MANUALE%AM_RE%'
   OR o.titolo ILIKE '%MANUALE D%AMORE%'
   OR o.titolo_originale ILIKE '%MANUAL%LOVE%'
GROUP BY o.id
ORDER BY o.anno_produzione, o.titolo;

-- 5) Volume falsi positivi serie: snapshot S/E diverso dall'episodio catalogo matchato
SELECT
  COUNT(*) FILTER (
    WHERE e.id IS NOT NULL
      AND (
        i.numero_stagione IS DISTINCT FROM e.numero_stagione
        OR i.numero_episodio IS DISTINCT FROM e.numero_episodio
      )
  ) AS snapshot_diverso_da_catalogo,
  COUNT(*) FILTER (
    WHERE COALESCE(i.dettagli_matching->>'episodio_mancante', 'false') = 'true'
  ) AS episodio_mancante_serie_cast,
  COUNT(*) AS totale_serie
FROM individuazioni i
JOIN opere o ON o.id = i.opera_id
LEFT JOIN episodi e ON e.id = i.episodio_id
WHERE o.tipo = 'serie_tv';
