/**
 * Tests for matching.service — wraps the hierarchical find_opera_candidates RPC
 * and classifies confidence into auto / review / no_match buckets.
 */
import { findCandidates, classifyConfidence, autoMatchProgrammazione } from './matching.service'
import { supabase } from '@/shared/lib/supabase-client'

jest.mock('@/shared/lib/supabase-client', () => ({
  supabase: { rpc: jest.fn() },
}))

const mockedRpc = supabase.rpc as jest.MockedFunction<any>

describe('classifyConfidence', () => {
  it('auto for >= 0.85', () => {
    expect(classifyConfidence(0.85)).toBe('auto')
    expect(classifyConfidence(0.90)).toBe('auto')
    expect(classifyConfidence(0.99)).toBe('auto')
  })
  it('review for 0.60-0.84', () => {
    expect(classifyConfidence(0.60)).toBe('review')
    expect(classifyConfidence(0.72)).toBe('review')
    expect(classifyConfidence(0.84)).toBe('review')
  })
  it('no_match for < 0.60', () => {
    expect(classifyConfidence(0.59)).toBe('no_match')
    expect(classifyConfidence(0)).toBe('no_match')
    expect(classifyConfidence(-1)).toBe('no_match')
  })
})

describe('findCandidates', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls find_opera_candidates RPC with the prog id and returns typed candidates', async () => {
    mockedRpc.mockResolvedValue({
      data: [
        {
          opera_id: 'o1',
          strategy: 'match_key_strict',
          confidence: 0.90,
          signals: { match_key: 'saw vi::2009' },
        },
      ],
      error: null,
    })
    const result = await findCandidates('prog-1')
    expect(mockedRpc).toHaveBeenCalledWith('find_opera_candidates', {
      p_prog_id: 'prog-1',
      p_title_threshold: 0.4,
      p_max_results: 10,
    })
    expect(result).toHaveLength(1)
    expect(result[0].strategy).toBe('match_key_strict')
    expect(result[0].confidence).toBe(0.90)
  })

  it('returns empty array when RPC returns null data', async () => {
    mockedRpc.mockResolvedValue({ data: null, error: null })
    const result = await findCandidates('prog-1')
    expect(result).toEqual([])
  })

  it('throws on RPC error', async () => {
    mockedRpc.mockResolvedValue({ data: null, error: new Error('rpc failed') })
    await expect(findCandidates('prog-1')).rejects.toThrow(/rpc failed/)
  })

  it('passes through custom threshold and limit', async () => {
    mockedRpc.mockResolvedValue({ data: [], error: null })
    await findCandidates('p', 0.6, 20)
    expect(mockedRpc).toHaveBeenCalledWith('find_opera_candidates', {
      p_prog_id: 'p',
      p_title_threshold: 0.6,
      p_max_results: 20,
    })
  })
})

describe('autoMatchProgrammazione', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns matched=true needs_review=false for top hit >=0.85', async () => {
    mockedRpc.mockResolvedValue({
      data: [{ opera_id: 'o1', strategy: 'alias_emittente', confidence: 1.00, signals: {} }],
      error: null,
    })
    const r = await autoMatchProgrammazione('p1')
    expect(r).toMatchObject({
      matched: true,
      needs_review: false,
      opera_id: 'o1',
      confidence: 1.00,
      strategy: 'alias_emittente',
    })
  })

  it('returns needs_review=true for mid-confidence top hit (0.60-0.84)', async () => {
    mockedRpc.mockResolvedValue({
      data: [{ opera_id: 'o1', strategy: 'fuzzy_trgm', confidence: 0.70, signals: {} }],
      error: null,
    })
    const r = await autoMatchProgrammazione('p1')
    expect(r).toMatchObject({
      matched: true,
      needs_review: true,
      opera_id: 'o1',
    })
  })

  it('returns matched=false for no_match top hit (<0.60)', async () => {
    mockedRpc.mockResolvedValue({
      data: [{ opera_id: 'o1', strategy: 'fuzzy_trgm', confidence: 0.55, signals: {} }],
      error: null,
    })
    const r = await autoMatchProgrammazione('p1')
    expect(r).toMatchObject({
      matched: false,
      needs_review: false,
      opera_id: 'o1',
      confidence: 0.55,
    })
  })

  it('returns matched=false confidence=0 when no candidates', async () => {
    mockedRpc.mockResolvedValue({ data: [], error: null })
    const r = await autoMatchProgrammazione('p1')
    expect(r).toEqual({
      matched: false,
      confidence: 0,
      needs_review: false,
    })
  })

  it('propagates RPC errors', async () => {
    mockedRpc.mockResolvedValue({ data: null, error: new Error('boom') })
    await expect(autoMatchProgrammazione('p1')).rejects.toThrow(/boom/)
  })
})
