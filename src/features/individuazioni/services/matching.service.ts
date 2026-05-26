/**
 * matching.service — frontend wrapper for the hierarchical find_opera_candidates
 * RPC. Exposes typed candidates + confidence classification used by the
 * review-queue UI and the auto-individuazione pipeline.
 *
 * RPC defined in supabase/migrations/20260526143305_find_opera_candidates_v2.sql.
 */
import { supabase } from '@/shared/lib/supabase-client'

export type MatchStrategy =
  | 'alias_emittente'
  | 'alias_canonical'
  | 'codice_isan'
  | 'imdb_tconst'
  | 'match_key_strict'
  | 'match_key_loose'
  | 'fuzzy_trgm'

export interface Candidate {
  opera_id: string
  strategy: MatchStrategy
  confidence: number
  signals: Record<string, unknown>
}

export type ConfidenceClass = 'auto' | 'review' | 'no_match'

/**
 * Bucket a confidence score:
 *   >= 0.85 → auto      (apply without review)
 *   0.60-0.84 → review  (route to human queue)
 *   < 0.60 → no_match   (drop or flag)
 */
export function classifyConfidence(c: number): ConfidenceClass {
  if (c >= 0.85) return 'auto'
  if (c >= 0.60) return 'review'
  return 'no_match'
}

/**
 * Fetch ranked opera candidates for a programmazione via the hierarchical RPC.
 * Throws on RPC error so callers surface failures explicitly.
 */
export async function findCandidates(
  progId: string,
  titleThreshold = 0.4,
  maxResults = 10,
): Promise<Candidate[]> {
  const { data, error } = await (supabase as any).rpc('find_opera_candidates', {
    p_prog_id: progId,
    p_title_threshold: titleThreshold,
    p_max_results: maxResults,
  })
  if (error) throw error
  return (data ?? []) as Candidate[]
}

export interface AutoMatchResult {
  matched: boolean
  opera_id?: string
  confidence: number
  needs_review: boolean
  strategy?: MatchStrategy
}

/**
 * Top-level classifier: given a programmazione id, decide whether to
 * auto-individuate, send to the review queue, or skip entirely.
 */
export async function autoMatchProgrammazione(progId: string): Promise<AutoMatchResult> {
  const candidates = await findCandidates(progId)
  const top = candidates[0]
  if (!top) {
    return { matched: false, confidence: 0, needs_review: false }
  }
  const cls = classifyConfidence(top.confidence)
  return {
    matched: cls === 'auto' || cls === 'review',
    opera_id: top.opera_id,
    confidence: top.confidence,
    strategy: top.strategy,
    needs_review: cls === 'review',
  }
}
