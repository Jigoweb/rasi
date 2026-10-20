-- Year range overlap helper + matcher uses rilascio/produzione semantics.

CREATE OR REPLACE FUNCTION public.year_range_bounds(p_start INT, p_end INT)
RETURNS TABLE(range_start INT, range_end INT)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    LEAST(p_start, COALESCE(p_end, p_start)),
    GREATEST(p_start, COALESCE(p_end, p_start));
$$;

CREATE OR REPLACE FUNCTION public.year_ranges_overlap(
  a_start INT,
  a_end INT,
  b_start INT,
  b_end INT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  WITH a AS (
    SELECT * FROM public.year_range_bounds(a_start, a_end)
  ),
  b AS (
    SELECT * FROM public.year_range_bounds(b_start, b_end)
  )
  SELECT a.range_start <= b.range_end AND b.range_start <= a.range_end
  FROM a, b;
$$;

CREATE OR REPLACE FUNCTION public.score_year_overlap(
  p_prog_start INT,
  p_prog_end INT,
  p_ref_start INT,
  p_ref_end INT,
  p_soft INT,
  p_hard INT
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_diff INT;
BEGIN
  IF p_prog_start IS NULL OR p_ref_start IS NULL THEN
    RETURN 0;
  END IF;

  IF public.year_ranges_overlap(
    p_prog_start,
    COALESCE(p_prog_end, p_prog_start),
    p_ref_start,
    COALESCE(p_ref_end, p_ref_start)
  ) THEN
    RETURN 1.0;
  END IF;

  v_diff := ABS(p_prog_start - p_ref_start);

  IF v_diff = 0 THEN
    RETURN 1.0;
  ELSIF v_diff <= p_soft THEN
    RETURN 0.7;
  ELSIF v_diff <= p_hard THEN
    RETURN 0.3;
  END IF;

  RETURN 0;
END;
$$;
