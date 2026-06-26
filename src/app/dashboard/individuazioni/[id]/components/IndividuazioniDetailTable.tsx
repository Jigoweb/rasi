'use client'

import { Calendar, Film, Loader2, User } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent } from '@/shared/components/ui/card'
import { useInfiniteScroll } from '@/shared/hooks/useInfiniteScroll'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import type { Individuazione } from '@/features/individuazioni/services/individuazioni.service'

interface IndividuazioniDetailTableProps {
  individuazioni: Individuazione[]
  loadingData: boolean
  loadingMore: boolean
  searchTerm: string
  totalCount: number
  hasMore: boolean
  onLoadMore: () => void
}

export default function IndividuazioniDetailTable({
  individuazioni,
  loadingData,
  loadingMore,
  searchTerm,
  totalCount,
  hasMore,
  onLoadMore,
}: IndividuazioniDetailTableProps) {
  const loadMoreRef = useInfiniteScroll<HTMLDivElement>({
    enabled: hasMore,
    isLoading: loadingData || loadingMore,
    onLoadMore,
  })

  return (
    <Card>
      <CardContent className="p-0">
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
                <TableHead className="py-4 text-center">Match %</TableHead>
                <TableHead className="py-4">Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingData && individuazioni.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : individuazioni.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    {searchTerm ? 'Nessuna individuazione trovata' : 'Nessuna individuazione'}
                  </TableCell>
                </TableRow>
              ) : (
                individuazioni.map(ind => (
                  <TableRow key={ind.id} className="hover:bg-muted/50">
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
                        <span className="font-medium">{getArtistaDisplay(ind)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <Film className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[150px]" title={ind.opere?.titolo || ''}>
                          {ind.opere?.titolo || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline">{ind.ruoli_tipologie?.nome || '-'}</Badge>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <span className={`font-medium ${getMatchColor(ind.punteggio_matching)}`}>
                        {formatMatchPercent(ind.punteggio_matching)}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <StatusBadge stato={ind.stato} />
                    </TableCell>
                  </TableRow>
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

function StatusBadge({ stato }: { stato: string | undefined }) {
  switch (stato) {
    case 'validato':
      return <Badge className="bg-green-100 text-green-800 border-green-200">Validato</Badge>
    case 'individuato':
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Individuato</Badge>
    case 'rifiutato':
      return <Badge className="bg-red-100 text-red-800 border-red-200">Rifiutato</Badge>
    case 'in_revisione':
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">In revisione</Badge>
    default:
      return <Badge variant="secondary">{stato || '-'}</Badge>
  }
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
  if (
    fallback?.confidence === 'review_required' ||
    ind.dettagli_matching?.episodio_mancante === true ||
    isBroadcasterEpisodeCode(ind.numero_episodio, ind.numero_stagione)
  ) {
    return 'review episodio'
  }
  return null
}

function getEpisodeNormalizationBadgeClass(ind: Individuazione) {
  return getEpisodeNormalizationLabel(ind) === 'review episodio'
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

function normalizeMatchScore(score: number) {
  return score > 1 ? score : score * 100
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
