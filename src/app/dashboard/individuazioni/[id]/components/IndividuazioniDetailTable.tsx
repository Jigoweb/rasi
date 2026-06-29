'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { ArrowUpDown, Calendar, Film, Layers3, Loader2, RotateCcw, User } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { useInfiniteScroll } from '@/shared/hooks/useInfiniteScroll'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import {
  getMatchScoreBand,
  getMatchScoreBandLabel,
  getStatusDisplay,
  normalizeIndividuazioneStatus,
  normalizeMatchScore,
} from '@/features/individuazioni/utils/individuazioni-detail'
import type {
  Individuazione,
  IndividuazioneGroupBy,
  IndividuazioneSortBy,
  IndividuazioneSortDirection,
} from '@/features/individuazioni/services/individuazioni.service'

interface IndividuazioniDetailTableProps {
  individuazioni: Individuazione[]
  loadingData: boolean
  loadingMore: boolean
  searchTerm: string
  totalCount: number
  hasMore: boolean
  sortBy?: IndividuazioneSortBy
  sortDirection?: IndividuazioneSortDirection
  groupBy?: IndividuazioneGroupBy
  onSortChange?: (value: string) => void
  onGroupByChange?: (value: IndividuazioneGroupBy) => void
  onLoadMore: () => void
}

export default function IndividuazioniDetailTable({
  individuazioni,
  loadingData,
  loadingMore,
  searchTerm,
  totalCount,
  hasMore,
  sortBy = 'review_priority',
  sortDirection = 'asc',
  groupBy = 'none',
  onSortChange,
  onGroupByChange,
  onLoadMore,
}: IndividuazioniDetailTableProps) {
  const loadMoreRef = useInfiniteScroll<HTMLDivElement>({
    enabled: hasMore,
    isLoading: loadingData || loadingMore,
    onLoadMore,
  })
  const groupedRows = getGroupedRows(individuazioni, groupBy)
  const matchSortDirection = sortBy === 'punteggio_matching' ? sortDirection : 'asc'
  const nextMatchSortDirection: IndividuazioneSortDirection = matchSortDirection === 'asc' ? 'desc' : 'asc'
  const hasCustomTableView = sortBy !== 'review_priority' || sortDirection !== 'asc' || groupBy !== 'none'

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b p-4 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold">Risultati individuazione</h2>
              <p className="text-sm text-muted-foreground">
                Ordine predefinito: match da rivedere prima, con motivo esplicito per ogni riga.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={groupBy} onValueChange={value => onGroupByChange?.(value as IndividuazioneGroupBy)}>
                <SelectTrigger className="w-full sm:w-[190px]">
                  <Layers3 className="h-4 w-4 mr-2 shrink-0" />
                  <SelectValue placeholder="Raggruppa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessun gruppo</SelectItem>
                  <SelectItem value="stato">Raggruppa per stato</SelectItem>
                  <SelectItem value="match_band">Raggruppa per fascia match</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasCustomTableView}
                onClick={() => {
                  onSortChange?.('review_priority:asc')
                  onGroupByChange?.('none')
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset vista
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Vista: {getSortSummaryLabel(sortBy, sortDirection)}</Badge>
            {groupBy !== 'none' && <Badge variant="outline">Gruppo: {getGroupLabel(groupBy)}</Badge>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="py-4 px-6">Data</TableHead>
                <TableHead className="py-4">Orario</TableHead>
                <TableHead className="py-4">Titolo Programmazione</TableHead>
                <TableHead className="py-4">Artista</TableHead>
                <TableHead className="py-4">Opera Matchata</TableHead>
                <TableHead className="py-4">Ruolo</TableHead>
                <TableHead
                  className="py-4 text-center"
                  aria-sort={sortBy === 'punteggio_matching' ? getAriaSort(sortDirection) : 'none'}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mx-auto h-auto px-2 font-medium"
                    onClick={() => onSortChange?.(`punteggio_matching:${nextMatchSortDirection}`)}
                    aria-label={`Ordina per match percentuale: ${getMatchSortLabel(nextMatchSortDirection)}`}
                  >
                    Match %
                    <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-primary" />
                  </Button>
                </TableHead>
                <TableHead className="py-4">Stato</TableHead>
                <TableHead className="py-4">Motivo revisione</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingData && individuazioni.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : individuazioni.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <div className="mx-auto max-w-sm space-y-1">
                      <p className="font-medium text-foreground">
                        {searchTerm ? 'Nessuna individuazione trovata' : 'Nessuna individuazione da mostrare'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm
                          ? 'Modifica la ricerca o resetta i filtri per tornare alla vista di revisione.'
                          : 'Quando la campagna produce match, li vedrai ordinati per priorità di revisione.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                groupedRows.map(group => (
                  <Fragment key={group.key}>
                    {groupBy !== 'none' && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={9} className="px-6 py-3 text-sm font-semibold text-muted-foreground">
                          {group.label} <span className="font-normal">({formatNumber(group.rows.length)})</span>
                        </TableCell>
                      </TableRow>
                    )}
                    {group.rows.map(ind => (
                      <IndividuazioneRow key={ind.id} individuazione={ind} />
                    ))}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div ref={loadMoreRef} className="h-1" aria-hidden="true" />

        {individuazioni.length > 0 && (
          <div className="px-6 py-4 border-t flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {formatNumber(individuazioni.length)} di {formatNumber(totalCount)} individuazioni
            </p>
            <div className="text-sm text-muted-foreground" aria-live="polite">
              {loadingMore ? (
                <span className="inline-flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Caricamento...
                </span>
              ) : hasMore ? (
                'Scorri per caricare altri risultati'
              ) : (
                'Fine elenco'
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function IndividuazioneRow({ individuazione: ind }: { individuazione: Individuazione }) {
  const artistaDisplay = getArtistaDisplay(ind)
  const operaDisplay = ind.opere?.titolo || '-'
  const reviewReasons = getReviewReasons(ind)

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="py-4 px-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {formatDate(ind.data_trasmissione)}
        </div>
      </TableCell>
      <TableCell className="py-4">
        <span className="text-sm">{formatTime(ind.ora_inizio)} - {formatTime(ind.ora_fine)}</span>
      </TableCell>
      <TableCell className="py-4">
        <div className="max-w-[200px]">
          <p className="font-medium truncate" title={ind.titolo || ''}>{ind.titolo || '-'}</p>
          {getEpisodeDisplay(ind) && (
            <p className="text-xs text-muted-foreground truncate" title={getEpisodeDisplay(ind) ?? undefined}>
              {getEpisodeDisplay(ind)}
            </p>
          )}
          {getEpisodeNormalizationLabel(ind) && (
            <Badge
              variant="outline"
              className={`mt-1 text-[10px] ${getEpisodeNormalizationBadgeClass(ind)}`}
            >
              {getEpisodeNormalizationLabel(ind)}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          {ind.artista_id && artistaDisplay !== '-' ? (
            <Link
              href={`/dashboard/artisti/${ind.artista_id}`}
              className="font-medium hover:text-primary hover:underline"
              aria-label={`Apri scheda artista ${artistaDisplay}`}
            >
              {artistaDisplay}
            </Link>
          ) : (
            <span className="font-medium">{artistaDisplay}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-4">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-muted-foreground" />
          {ind.opera_id && operaDisplay !== '-' ? (
            <Link
              href={`/dashboard/opere/${ind.opera_id}`}
              className="truncate max-w-[150px] hover:text-primary hover:underline"
              title={operaDisplay}
              aria-label={`Apri scheda opera ${operaDisplay}`}
            >
              {operaDisplay}
            </Link>
          ) : (
            <span className="truncate max-w-[150px]" title={operaDisplay}>
              {operaDisplay}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-4">
        <Badge variant="outline">{ind.ruoli_tipologie?.nome || '-'}</Badge>
      </TableCell>
      <TableCell className="py-4 text-center">
        <span
          className={`font-medium tabular-nums ${getMatchColor(ind.punteggio_matching)}`}
          aria-label={`Match ${formatMatchPercent(ind.punteggio_matching)}, ${getMatchScoreBandLabel(getMatchScoreBand(ind.punteggio_matching)).toLowerCase()}`}
        >
          {formatMatchPercent(ind.punteggio_matching)}
        </span>
      </TableCell>
      <TableCell className="py-4">
        <StatusBadge stato={ind.stato} />
      </TableCell>
      <TableCell className="py-4">
        <div className="flex max-w-[220px] flex-wrap gap-1.5">
          {reviewReasons.map(reason => (
            <Badge key={reason.label} variant={reason.variant} className={reason.className}>
              {reason.label}
            </Badge>
          ))}
        </div>
      </TableCell>
    </TableRow>
  )
}

type ReviewReason = {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className?: string
}

function getReviewReasons(ind: Individuazione): ReviewReason[] {
  const reasons: ReviewReason[] = []
  const normalizedStatus = normalizeIndividuazioneStatus(ind.stato)
  const hasMissingEpisode = ind.dettagli_matching?.episodio_mancante === true
  const needsEpisodeReview = getEpisodeNormalizationLabel(ind) === 'review episodio'

  if (hasMissingEpisode) {
    reasons.push({
      label: 'episodio mancante',
      variant: 'outline',
      className: 'border-amber-200 bg-amber-50 text-amber-900',
    })
  } else if (normalizedStatus === 'dubbioso') {
    reasons.push({
      label: 'revisione senza motivo tracciato',
      variant: 'outline',
      className: 'border-amber-200 bg-amber-50 text-amber-900',
    })
  }

  if (needsEpisodeReview && !hasMissingEpisode) {
    reasons.push({
      label: 'episodio da verificare',
      variant: 'outline',
      className: 'border-amber-200 bg-amber-50 text-amber-900',
    })
  }

  if (reasons.length === 0) {
    reasons.push({
      label: normalizedStatus === 'validato' ? 'validato' : 'nessun motivo specifico',
      variant: 'secondary',
    })
  }

  return reasons
}

function StatusBadge({ stato }: { stato: string | undefined }) {
  const display = getStatusDisplay(stato)
  const className = {
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    muted: '',
  }[display.tone]

  return display.tone === 'muted'
    ? <Badge variant="secondary">{display.label}</Badge>
    : <Badge className={className}>{display.label}</Badge>
}

function getArtistaDisplay(ind: Individuazione) {
  if (!ind.artisti) return '-'
  const nome = ind.artisti.nome_arte || `${ind.artisti.nome} ${ind.artisti.cognome}`.trim()
  return nome || '-'
}

function getEpisodeDisplay(ind: Individuazione) {
  const title = ind.titolo_episodio || ind.titolo_episodio_originale
  const normalized = getNormalizedEpisodeCode(ind)
  if (normalized) return title ? `${normalized}: ${title}` : normalized

  if (isBroadcasterEpisodeCode(ind.numero_episodio, ind.numero_stagione)) {
    return title ? `Codice emittente ${ind.numero_episodio}: ${title}` : `Codice emittente ${ind.numero_episodio}`
  }

  const hasEpisodeNumber = ind.numero_stagione != null || ind.numero_episodio != null
  if (!title && !hasEpisodeNumber) return null

  const code = hasEpisodeNumber
    ? `S${ind.numero_stagione ?? '?'}E${ind.numero_episodio ?? '?'}`
    : 'Episodio'

  return title ? `${code}: ${title}` : code
}

function getEpisodeNormalizationLabel(ind: Individuazione) {
  const fallback = getEpisodeNormalizationFallback(ind)
  if (fallback?.confidence === 'high' && getNormalizedEpisodeCode(ind)) return 'normalizzato'
  if (ind.dettagli_matching?.episodio_mancante === true) return 'episodio mancante'
  if (
    fallback?.confidence === 'review_required' ||
    isBroadcasterEpisodeCode(ind.numero_episodio, ind.numero_stagione)
  ) {
    return 'review episodio'
  }
  return null
}

function getEpisodeNormalizationBadgeClass(ind: Individuazione) {
  const label = getEpisodeNormalizationLabel(ind)
  return label === 'review episodio' || label === 'episodio mancante'
    ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
    : 'border-blue-200 bg-blue-50 text-blue-800'
}

function getEpisodeNormalizationFallback(ind: Individuazione): { confidence?: string } | null {
  const fallback = ind.dettagli_matching?.episode_normalization_fallback
  return fallback && typeof fallback === 'object' ? fallback : null
}

function getNormalizedEpisodeCode(ind: Individuazione) {
  const fallback = ind.dettagli_matching?.episode_normalization_fallback
  if (!fallback || typeof fallback !== 'object' || fallback.confidence !== 'high') return null
  const season = typeof fallback.numero_stagione === 'number' ? fallback.numero_stagione : null
  const episode = typeof fallback.numero_episodio === 'number' ? fallback.numero_episodio : null
  if (season == null && episode == null) return null
  return `S${season ?? '?'}E${episode ?? '?'}`
}

function isBroadcasterEpisodeCode(episode?: number | null, season?: number | null) {
  return season == null && typeof episode === 'number' && episode > 200
}

function formatMatchPercent(score: number) {
  return `${Math.round(normalizeMatchScore(score))}%`
}

function getMatchColor(score: number) {
  const normalized = normalizeMatchScore(score)
  if (normalized >= 90) return 'text-green-600'
  if (normalized >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

function getGroupedRows(individuazioni: Individuazione[], groupBy: IndividuazioneGroupBy) {
  if (groupBy === 'none') {
    return [{ key: 'all', label: 'Tutte le individuazioni', rows: individuazioni }]
  }

  const groups = new Map<string, { key: string; label: string; rows: Individuazione[] }>()

  for (const individuazione of individuazioni) {
    const key = getGroupKey(individuazione, groupBy)
    if (!groups.has(key.key)) {
      groups.set(key.key, { ...key, rows: [] })
    }
    groups.get(key.key)?.rows.push(individuazione)
  }

  return Array.from(groups.values())
}

function getGroupKey(individuazione: Individuazione, groupBy: IndividuazioneGroupBy) {
  if (groupBy === 'stato') {
    const normalizedStatus = normalizeIndividuazioneStatus(individuazione.stato)
    return {
      key: normalizedStatus || 'unknown',
      label: getStatusDisplay(individuazione.stato).label,
    }
  }

  const band = getMatchScoreBand(individuazione.punteggio_matching)
  return {
    key: band,
    label: getMatchScoreBandLabel(band),
  }
}

function getMatchSortLabel(direction: IndividuazioneSortDirection) {
  return direction === 'asc' ? 'match più bassi' : 'match più alti'
}

function getSortSummaryLabel(sortBy: IndividuazioneSortBy, direction: IndividuazioneSortDirection) {
  switch (sortBy) {
    case 'review_priority':
      return 'da rivedere prima'
    case 'punteggio_matching':
      return getMatchSortLabel(direction)
    case 'stato':
      return direction === 'asc' ? 'stato A-Z' : 'stato Z-A'
    case 'titolo':
      return direction === 'asc' ? 'titolo A-Z' : 'titolo Z-A'
    case 'data_trasmissione':
      return direction === 'asc' ? 'date meno recenti' : 'date più recenti'
  }
}

function getAriaSort(direction: IndividuazioneSortDirection) {
  return direction === 'asc' ? 'ascending' : 'descending'
}

function getGroupLabel(groupBy: IndividuazioneGroupBy) {
  switch (groupBy) {
    case 'stato':
      return 'stato'
    case 'match_band':
      return 'fascia match'
    case 'none':
    default:
      return 'nessuno'
  }
}

function formatNumber(num: number | undefined) {
  return (num || 0).toLocaleString('it-IT')
}

function formatDate(dateString: string | undefined) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatTime(timeString: string | undefined) {
  if (!timeString) return '-'
  return timeString.substring(0, 5)
}
