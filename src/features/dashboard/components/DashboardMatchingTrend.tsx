'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import type { MatchingTrendPoint } from './dashboard-home.types'

type DashboardMatchingTrendProps = {
  points: MatchingTrendPoint[]
  loading?: boolean
}

const CHART_W = 320
const CHART_H = 88
const PAD_X = 4
const PAD_Y = 8

function hasMatchingData(points: MatchingTrendPoint[]): boolean {
  return points.some(p => p.total > 0)
}

function buildPolyline(points: MatchingTrendPoint[]): string {
  const rates = points.map(p => p.rate)
  const min = Math.min(...rates)
  const max = Math.max(...rates)
  const span = max - min || 1
  const n = points.length
  if (n === 1) {
    const y = PAD_Y + (CHART_H - PAD_Y * 2) / 2
    return `${PAD_X},${y} ${CHART_W - PAD_X},${y}`
  }
  return points
    .map((p, i) => {
      const x = PAD_X + (i / (n - 1)) * (CHART_W - PAD_X * 2)
      const y = CHART_H - PAD_Y - ((p.rate - min) / span) * (CHART_H - PAD_Y * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function computeDelta(points: MatchingTrendPoint[]): {
  latest: number
  delta: number | null
} {
  const withData = points.filter(p => p.total > 0)
  if (withData.length === 0) return { latest: 0, delta: null }
  const latest = withData[withData.length - 1].rate
  const first = withData[0].rate
  if (withData.length < 2) return { latest, delta: null }
  return { latest, delta: latest - first }
}

function formatDelta(delta: number): string {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)} pp`
}

export function DashboardMatchingTrend({
  points,
  loading = false,
}: DashboardMatchingTrendProps) {
  const empty = !hasMatchingData(points)
  const { latest, delta } = empty ? { latest: 0, delta: null } : computeDelta(points)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Trend matching (30 giorni)</CardTitle>
            <CardDescription className="text-sm mt-1">
              Utile per capire se un import recente ha peggiorato il matching
            </CardDescription>
          </div>
          {!loading && !empty ? (
            <div className="text-right shrink-0">
              <p className="text-xl font-bold tabular-nums">{latest}%</p>
              {delta != null ? (
                <p
                  className={`text-xs tabular-nums ${
                    delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  {formatDelta(delta)} vs inizio periodo
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <div className="h-[88px] animate-pulse rounded bg-gray-100" />
        ) : empty ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            Nessun dato matching negli ultimi 30 giorni
          </p>
        ) : (
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="w-full h-[88px]"
            role="img"
            aria-label={`Tasso matching attuale ${latest}%`}
          >
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="text-gray-700"
              points={buildPolyline(points)}
            />
          </svg>
        )}
      </CardContent>
    </Card>
  )
}
