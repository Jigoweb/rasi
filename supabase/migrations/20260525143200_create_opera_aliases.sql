-- opera_aliases: learned mappings from programmazione titles to opere,
-- scoped by emittente (so the same alias can map differently per emittente).

CREATE TABLE IF NOT EXISTS public.opera_aliases (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  opera_id uuid NOT NULL
    REFERENCES public.opere(id) ON DELETE CASCADE,
  emittente_id uuid
    REFERENCES public.emittenti(id) ON DELETE CASCADE,
  alias_titolo text NOT NULL,
  alias_titolo_norm text NOT NULL,
  alias_anno integer,
  source text NOT NULL
    CHECK (source IN ('manual', 'auto', 'historical', 'api'))
    DEFAULT 'manual',
  confidence numeric(3,2) NOT NULL DEFAULT 1.00
    CHECK (confidence >= 0 AND confidence <= 1),
  hit_count integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(opera_id, emittente_id, alias_titolo_norm, alias_anno)
);

COMMENT ON TABLE public.opera_aliases IS
  'Emittente-scoped title aliases used by find_opera_candidates RPC to short-circuit fuzzy matching. Populated by manual review resolution and historical backfill.';

-- Trigger to keep alias_titolo_norm in sync with alias_titolo + alias_anno
CREATE OR REPLACE FUNCTION public.trg_alias_normalize()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.alias_titolo_norm := public.build_match_key(NEW.alias_titolo, NEW.alias_anno);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS opera_aliases_normalize ON public.opera_aliases;
CREATE TRIGGER opera_aliases_normalize
  BEFORE INSERT OR UPDATE OF alias_titolo, alias_anno ON public.opera_aliases
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_alias_normalize();

-- Lookup index used by find_opera_candidates
CREATE INDEX IF NOT EXISTS idx_opera_aliases_lookup
  ON public.opera_aliases(emittente_id, alias_titolo_norm, alias_anno);

-- Index for hit_count sorting in alias inspector UI
CREATE INDEX IF NOT EXISTS idx_opera_aliases_opera_hits
  ON public.opera_aliases(opera_id, hit_count DESC);

-- RLS policies
ALTER TABLE public.opera_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY opera_aliases_read_all
  ON public.opera_aliases FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY opera_aliases_write_admin
  ON public.opera_aliases FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
