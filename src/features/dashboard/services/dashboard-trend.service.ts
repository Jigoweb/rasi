import type { SupabaseClient } from '@supabase/supabase-js'

export type MatchingTrendPoint = {
  date: string
  total: number
  valid: number
  rate: number
}

export type MatchingTrendRow = {
  created_at: string
  stato: string
}

export type MatchingTrendDeps = {
  /**
   * Fetch individuazioni created on/after `sinceIso` (inclusive).
   * Implementations should select only `created_at, stato`.
   * If the underlying query is truncated (hit a row cap), return what was fetched;
   * callers treat an all-zero series as empty UI.
   */
  loadIndividuazioniInRange: (sinceIso: string) => Promise<MatchingTrendRow[]>
}

/** Soft cap for the simple Supabase fetch — document truncation if hit. */
export const MATCHING_TREND_FETCH_LIMIT = 10_000

function toUtcDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return d.toISOString().slice(0, 10)
}

function addUtcDays(dateKey: string, deltaDays: number): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

function roundRate(valid: number, total: number): number {
  if (total === 0) return 0
  return Math.round((valid / total) * 1000) / 10
}

/**
 * Buckets individuazioni by UTC calendar day over the last `days` days (inclusive of end).
 * valid = stato !== 'respinto'; rate = valid/total*100 rounded to 1 decimal.
 * Missing days are filled with zeros.
 */
export function buildMatchingTrendSeries(
  rows: MatchingTrendRow[],
  days = 30,
  endDate: Date = new Date()
): MatchingTrendPoint[] {
  const endKey = toUtcDateKey(endDate)
  const startKey = addUtcDays(endKey, -(days - 1))

  const buckets = new Map<string, { total: number; valid: number }>()
  for (let i = 0; i < days; i++) {
    buckets.set(addUtcDays(startKey, i), { total: 0, valid: 0 })
  }

  for (const row of rows) {
    const key = toUtcDateKey(row.created_at)
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.total += 1
    if (row.stato !== 'respinto') bucket.valid += 1
  }

  const series: MatchingTrendPoint[] = []
  for (let i = 0; i < days; i++) {
    const date = addUtcDays(startKey, i)
    const { total, valid } = buckets.get(date)!
    series.push({
      date,
      total,
      valid,
      rate: roundRate(valid, total),
    })
  }
  return series
}

export async function loadMatchingTrend(
  deps: MatchingTrendDeps,
  options: { days?: number; now?: Date } = {}
): Promise<MatchingTrendPoint[]> {
  const days = options.days ?? 30
  const now = options.now ?? new Date()
  const endKey = toUtcDateKey(now)
  const startKey = addUtcDays(endKey, -(days - 1))
  const sinceIso = `${startKey}T00:00:00.000Z`

  const rows = await deps.loadIndividuazioniInRange(sinceIso)
  return buildMatchingTrendSeries(rows, days, now)
}

/**
 * Supabase deps for the 30-day matching trend.
 * Simple query with `.gte('created_at', sinceIso)` and a soft row cap.
 * If exactly MATCHING_TREND_FETCH_LIMIT rows are returned, the series may be truncated
 * (oldest days undercounted); UI still renders from available rows / zeros.
 */
export function createSupabaseMatchingTrendDeps(supabase: SupabaseClient): MatchingTrendDeps {
  return {
    loadIndividuazioniInRange: async (sinceIso: string) => {
      const { data, error } = await (supabase as any)
        .from('individuazioni')
        .select('created_at, stato')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: true })
        .limit(MATCHING_TREND_FETCH_LIMIT)

      if (error) throw error
      return (data || []) as MatchingTrendRow[]
    },
  }
}

/** Alias matching the task naming for page wiring. */
export const loadMatchingTrendDeps = createSupabaseMatchingTrendDeps
