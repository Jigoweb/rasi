'use client'

import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  CATALOG_HEALTH_IMPACT_LABEL,
  countMetricsByImpact,
  type CatalogHealthImpact,
} from '@/features/dashboard/services/catalog-health-impact'
import type { Metric } from '@/features/dashboard/services/dashboard-data.service'
import { Loader2 } from 'lucide-react'

function percentComplete(m: Metric): number {
  if (!m.total) return 0
  const v = Math.max(0, m.total - m.missing)
  return Math.floor((v / m.total) * 100)
}

function impactBadgeClass(impact: CatalogHealthImpact): string {
  switch (impact) {
    case 'critical':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'matching':
      return 'bg-amber-50 text-amber-800 border-amber-200'
    case 'identity':
      return 'bg-sky-50 text-sky-800 border-sky-200'
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200'
  }
}

function barClass(impact: CatalogHealthImpact): string {
  switch (impact) {
    case 'critical':
      return 'bg-red-600'
    case 'matching':
      return 'bg-amber-500'
    case 'identity':
      return 'bg-sky-600'
    default:
      return 'bg-gray-400'
  }
}

function MetricRow({ metric }: { metric: Metric }) {
  const complete = percentComplete(metric)
  return (
    <div>
      <div className="flex items-start justify-between gap-3 text-sm">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-800">{metric.label}</span>
            <Badge variant="outline" className={impactBadgeClass(metric.impact)}>
              {metric.impactLabel}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-gray-500 leading-snug">{metric.impactHint}</p>
        </div>
        <Badge variant="outline" className="shrink-0 tabular-nums">
          {complete}%
        </Badge>
      </div>
      <div className="mt-2 h-2 rounded bg-gray-200">
        <div
          className={`h-2 rounded ${barClass(metric.impact)}`}
          style={{ width: `${complete}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-gray-500">
        Coperti: {Math.max(0, metric.total - metric.missing).toLocaleString('it-IT')} /{' '}
        {metric.total.toLocaleString('it-IT')}
        {metric.missing > 0 ? (
          <span className="text-gray-600">
            {' '}
            · mancanti {metric.missing.toLocaleString('it-IT')}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function DashboardDataHealthCard({
  healthLoading,
  artistiIncompleti,
  opereIncomplete,
  totalArtisti,
  totalOpere,
  artistiMetrics,
  opereMetrics,
}: {
  healthLoading: boolean
  artistiIncompleti: number
  opereIncomplete: number
  totalArtisti: number
  totalOpere: number
  artistiMetrics: Metric[]
  opereMetrics: Metric[]
}) {
  const matchingGaps = countMetricsByImpact(opereMetrics, ['critical', 'matching'])
  const identityGaps = countMetricsByImpact(artistiMetrics, ['identity'])
  const overallComplete = (() => {
    const all = [...artistiMetrics, ...opereMetrics]
    const totals = all.reduce((acc, m) => acc + m.total, 0)
    const miss = all.reduce((acc, m) => acc + m.missing, 0)
    if (!totals) return '—'
    return `${Math.round(((totals - miss) / totals) * 100)}%`
  })()

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Data Health</CardTitle>
          {healthLoading && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Caricamento
            </Badge>
          )}
        </div>
        <CardDescription className="text-sm">
          Completezza catalogo con priorità ai campi che impattano l’individuazione
          (matching programmazioni → opere → partecipazioni → artisti).
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 lg:p-6 space-y-6">
        <div className="rounded-lg border bg-white p-3 lg:p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Legenda impatto individuazione
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATALOG_HEALTH_IMPACT_LABEL) as CatalogHealthImpact[]).map(impact => (
              <Badge key={impact} variant="outline" className={impactBadgeClass(impact)}>
                {CATALOG_HEALTH_IMPACT_LABEL[impact]}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500 leading-relaxed">
            Il matching lavora sul catalogo opere (titolo, anno, tipo, IMDB, titolo originale).
            Gli artisti entrano via partecipazioni: nome/cognome servono all’identità del risultato,
            IPN/CF/nascita/stato sono anagrafica e non segnali di matching.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg bg-white">
            <p className="text-sm font-medium text-gray-600">Gap matching opere</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{matchingGaps.fieldsWithGaps}</p>
              <span className="text-xs text-gray-500">campi critici/utili con lacune</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Max record scoperti su un campo: {matchingGaps.maxMissing.toLocaleString('it-IT')}
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-white">
            <p className="text-sm font-medium text-gray-600">Artisti incompleti</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{artistiIncompleti.toLocaleString('it-IT')}</p>
              <span className="text-xs text-gray-500">di {totalArtisti.toLocaleString('it-IT')}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Identità risultato con lacune: {identityGaps.fieldsWithGaps}
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-white">
            <p className="text-sm font-medium text-gray-600">Opere incomplete</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{opereIncomplete.toLocaleString('it-IT')}</p>
              <span className="text-xs text-gray-500">di {totalOpere.toLocaleString('it-IT')}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">Completamento complessivo campi: {overallComplete}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold mb-1">Opere — segnali individuazione</h3>
            <p className="text-xs text-gray-500 mb-3">
              Ordinati per criticità matching. Titolo e anno sono i gap da chiudere per primi.
            </p>
            <div className="space-y-4">
              {opereMetrics.map(metric => (
                <MetricRow key={metric.key} metric={metric} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1">Artisti — identità e anagrafica</h3>
            <p className="text-xs text-gray-500 mb-3">
              Nessun campo artista guida il match titolo; qui vedi cosa manca dopo che
              l’individuazione è già avvenuta via partecipazioni.
            </p>
            <div className="space-y-4">
              {artistiMetrics.map(metric => (
                <MetricRow key={metric.key} metric={metric} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
