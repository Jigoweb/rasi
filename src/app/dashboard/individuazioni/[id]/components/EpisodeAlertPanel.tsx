'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Film, Loader2, Tv } from 'lucide-react'
import {
  getCampagnaIndividuazioneEpisodeAlerts,
  type IndividuazioneEpisodeAlert,
  type IndividuazioneEpisodeAlertSummary,
} from '@/features/individuazioni/services/individuazioni.service'
import {
  buildOperaHref,
  buildProgrammazioneHref,
  formatEpisodeCode,
  getEpisodeAlertActionHint,
  getEpisodeAlertTypeLabel,
} from '@/features/individuazioni/utils/episode-alerts'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'

interface EpisodeAlertPanelProps {
  campagnaId: string
  summary: IndividuazioneEpisodeAlertSummary | null
}

export default function EpisodeAlertPanel({
  campagnaId,
  summary,
}: EpisodeAlertPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [alerts, setAlerts] = useState<IndividuazioneEpisodeAlert[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!expanded || alerts != null) return

    let cancelled = false
    setLoading(true)
    setError(null)

    void getCampagnaIndividuazioneEpisodeAlerts(campagnaId)
      .then(({ data, error: loadError }) => {
        if (cancelled) return
        if (loadError) {
          setError('Impossibile caricare il dettaglio degli alert episodi.')
          setAlerts([])
          return
        }
        setAlerts(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [expanded, alerts, campagnaId])

  if (!summary || summary.totale === 0) return null

  const topOpere = summary.topOpere.slice(0, 3)

  return (
    <Card className="gap-4 border-amber-200 bg-amber-50/60 py-4">
      <CardContent className="space-y-3 px-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-900">
              Alert episodi esclusi dalle individuazioni
            </div>
            <p className="mt-2 text-sm text-amber-950">
              {formatNumber(summary.totale)} alert sono stati esclusi dai match automatici perché
              richiedono revisione catalogo o dati episodio.
            </p>
            {topOpere.length > 0 && (
              <p className="mt-2 text-xs text-amber-900">
                Opere più ricorrenti: {topOpere.map(item => `${item.titolo} (${formatNumber(item.count)})`).join(', ')}
              </p>
            )}
          </div>
          <div className="grid min-w-[280px] gap-3 text-sm sm:grid-cols-2">
            <SummaryPill label="Episodi non censiti" value={formatNumber(summary.catalogEpisodeNotCensito)} />
            <SummaryPill label="Dati episodio invalidi" value={formatNumber(summary.programmazioneEpisodeDataInvalid)} />
            <SummaryPill label="Programmazioni" value={formatNumber(summary.programmazioniCoinvolte)} />
            <SummaryPill label="Opere" value={formatNumber(summary.opereCoinvolte)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-amber-300 bg-white/80 text-amber-950 hover:bg-white"
            onClick={() => setExpanded(value => !value)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1.5" />
                Nascondi coda revisione
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1.5" />
                Apri coda revisione
              </>
            )}
          </Button>
          <p className="text-xs text-amber-900">
            Ogni alert ha un percorso dedicato: censimento opera o correzione dati programmazione.
          </p>
        </div>

        {expanded && (
          <div className="rounded-md border border-amber-200 bg-white/80">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-amber-900">
                <Loader2 className="h-4 w-4 animate-spin" />
                Caricamento alert...
              </div>
            ) : error ? (
              <div className="flex items-start gap-2 px-4 py-4 text-sm text-amber-950">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : !alerts || alerts.length === 0 ? (
              <div className="px-4 py-6 text-sm text-amber-900">
                Nessun dettaglio alert disponibile.
              </div>
            ) : (
              <ul className="divide-y divide-amber-100">
                {alerts.map(alert => (
                  <EpisodeAlertRow key={alert.id} alert={alert} />
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EpisodeAlertRow({ alert }: { alert: IndividuazioneEpisodeAlert }) {
  const episodeCode = formatEpisodeCode(alert.numeroStagione, alert.numeroEpisodio)
  const operaHref = buildOperaHref(alert.operaId)
  const programmazioneHref = buildProgrammazioneHref(
    alert.campagneProgrammazioneId,
    alert.titolo,
  )
  const primaryIsOpera = alert.tipoAlert === 'catalog_episode_not_censito'

  return (
    <li className="px-4 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-amber-300 text-amber-950">
            {getEpisodeAlertTypeLabel(alert.tipoAlert)}
          </Badge>
          {episodeCode && (
            <span className="font-mono text-xs text-amber-900">{episodeCode}</span>
          )}
        </div>
        <p className="font-medium text-amber-950 truncate">{alert.titolo}</p>
        <p className="text-xs text-amber-900">
          {alert.titoloEpisodio ? `Episodio: ${alert.titoloEpisodio}` : getEpisodeAlertActionHint(alert.tipoAlert)}
        </p>
        {(alert.dataTrasmissione || alert.operaTitolo) && (
          <p className="text-xs text-muted-foreground">
            {[
              alert.dataTrasmissione
                ? `Tx ${new Date(alert.dataTrasmissione).toLocaleDateString('it-IT')}${alert.oraInizio ? ` ${alert.oraInizio}` : ''}`
                : null,
              alert.operaTitolo ? `Opera: ${alert.operaTitolo}` : null,
            ].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 shrink-0">
        {primaryIsOpera ? (
          <>
            <AlertActionLink href={operaHref} icon={<Film className="h-3.5 w-3.5" />} label="Apri opera" primary />
            <AlertActionLink href={programmazioneHref} icon={<Tv className="h-3.5 w-3.5" />} label="Apri programmazione" />
          </>
        ) : (
          <>
            <AlertActionLink href={programmazioneHref} icon={<Tv className="h-3.5 w-3.5" />} label="Apri programmazione" primary />
            <AlertActionLink href={operaHref} icon={<Film className="h-3.5 w-3.5" />} label="Apri opera" />
          </>
        )}
      </div>
    </li>
  )
}

function AlertActionLink({
  href,
  icon,
  label,
  primary = false,
}: {
  href: string | null
  icon: ReactNode
  label: string
  primary?: boolean
}) {
  if (!href) {
    return (
      <Button size="sm" variant={primary ? 'default' : 'outline'} disabled className="gap-1.5">
        {icon}
        {label}
      </Button>
    )
  }

  return (
    <Button asChild size="sm" variant={primary ? 'default' : 'outline'} className="gap-1.5">
      <Link href={href} target="_blank" rel="noreferrer">
        {icon}
        {label}
        <ExternalLink className="h-3 w-3 opacity-70" />
      </Link>
    </Button>
  )
}

function SummaryPill({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border border-amber-200 bg-white/70 px-3 py-2">
      <div className="text-xs text-amber-900">{label}</div>
      <div className="font-mono text-lg font-semibold text-amber-950">{value}</div>
    </div>
  )
}

function formatNumber(value: number): string {
  return value.toLocaleString('it-IT')
}
