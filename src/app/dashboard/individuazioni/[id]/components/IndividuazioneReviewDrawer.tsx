'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Film,
  Loader2,
  User,
} from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  getIndividuazioneReviewDetail,
  updateIndividuazioneStatus,
  type Individuazione,
  type IndividuazioneReviewDetail,
  type IndividuazioneStatus,
} from '@/features/individuazioni/services/individuazioni.service'
import {
  buildMatchingBreakdown,
  buildMatchingComparison,
} from '@/features/individuazioni/utils/matching-details'
import {
  getMatchScoreBand,
  getMatchScoreBandLabel,
  getStatusDisplay,
  normalizeMatchScore,
} from '@/features/individuazioni/utils/individuazioni-detail'

interface IndividuazioneReviewDrawerProps {
  open: boolean
  individuazioni: Individuazione[]
  selectedId: string | null
  canReview: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (id: string) => void
  onStatusUpdated: (individuazione: Individuazione) => void
}

export default function IndividuazioneReviewDrawer({
  open,
  individuazioni,
  selectedId,
  canReview,
  onOpenChange,
  onNavigate,
  onStatusUpdated,
}: IndividuazioneReviewDrawerProps) {
  const [detail, setDetail] = useState<IndividuazioneReviewDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [noteValidazione, setNoteValidazione] = useState('')
  const [savingStatus, setSavingStatus] = useState<IndividuazioneStatus | null>(null)
  const [showTechnicalBreakdown, setShowTechnicalBreakdown] = useState(false)

  const selectedIndex = useMemo(
    () => individuazioni.findIndex(item => item.id === selectedId),
    [individuazioni, selectedId]
  )
  const selectedIndividuazione = selectedIndex >= 0 ? individuazioni[selectedIndex] : null
  const previousId = selectedIndex > 0 ? individuazioni[selectedIndex - 1]?.id ?? null : null
  const nextId = selectedIndex >= 0 && selectedIndex < individuazioni.length - 1
    ? individuazioni[selectedIndex + 1]?.id ?? null
    : null

  useEffect(() => {
    if (!open || !selectedId) {
      setDetail(null)
      setDetailError(null)
      return
    }

    const individuazioneId = selectedId
    let cancelled = false

    async function loadDetail() {
      setLoadingDetail(true)
      setDetailError(null)
      try {
        const { data, error } = await getIndividuazioneReviewDetail(individuazioneId)
        if (cancelled) return
        if (error || !data) {
          setDetail(null)
          setDetailError('Impossibile caricare i dettagli dell\'individuazione.')
          return
        }
        setDetail(data)
        setNoteValidazione(data.individuazione.note_validazione || '')
      } catch {
        if (!cancelled) {
          setDetail(null)
          setDetailError('Impossibile caricare i dettagli dell\'individuazione.')
        }
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    }

    void loadDetail()
    setShowTechnicalBreakdown(false)

    return () => {
      cancelled = true
    }
  }, [open, selectedId])

  const individuazione = detail?.individuazione ?? selectedIndividuazione
  const comparisonRows = useMemo(() => {
    if (!individuazione) return []
    return buildMatchingComparison({
      snapshotTitolo: individuazione.titolo,
      snapshotTitoloOriginale: individuazione.titolo_originale,
      snapshotAnno: individuazione.anno,
      snapshotRegia: individuazione.regia,
      snapshotStagione: individuazione.numero_stagione,
      snapshotEpisodio: individuazione.numero_episodio,
      snapshotTitoloEpisodio: individuazione.titolo_episodio || individuazione.titolo_episodio_originale,
      snapshotDataTrasmissione: individuazione.data_trasmissione,
      snapshotOraInizio: individuazione.ora_inizio,
      snapshotOraFine: individuazione.ora_fine,
      operaTitolo: detail?.opera?.titolo ?? individuazione.opere?.titolo,
      operaTitoloOriginale: detail?.opera?.titolo_originale ?? individuazione.opere?.titolo_originale,
      operaAnno: detail?.opera?.anno_produzione,
      operaRegisti: detail?.opera?.regista ?? undefined,
      episodioStagione: detail?.episodio?.numero_stagione,
      episodioNumero: detail?.episodio?.numero_episodio,
      episodioTitolo: detail?.episodio?.titolo_episodio,
      dettagliMatching: individuazione.dettagli_matching as Record<string, unknown> | undefined,
    })
  }, [detail, individuazione])

  const breakdownItems = useMemo(
    () => buildMatchingBreakdown(individuazione?.dettagli_matching as Record<string, unknown> | undefined),
    [individuazione]
  )

  async function handleStatusChange(stato: IndividuazioneStatus) {
    if (!individuazione || !canReview) return

    setSavingStatus(stato)
    try {
      const { data, error } = await updateIndividuazioneStatus(
        individuazione.id,
        stato,
        noteValidazione
      )
      if (error || !data) {
        setDetailError('Aggiornamento stato non riuscito.')
        return
      }
      onStatusUpdated(data)
      onOpenChange(false)
    } catch {
      setDetailError('Aggiornamento stato non riuscito.')
    } finally {
      setSavingStatus(null)
    }
  }

  const statusDisplay = getStatusDisplay(individuazione?.stato)
  const matchPercent = individuazione ? Math.round(normalizeMatchScore(individuazione.punteggio_matching)) : 0
  const artistaDisplay = getArtistaDisplay(individuazione)
  const operaDisplay = detail?.opera?.titolo || individuazione?.opere?.titolo || '-'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <SheetTitle className="text-left text-lg">
                {individuazione?.titolo || 'Revisione individuazione'}
              </SheetTitle>
              <SheetDescription className="text-left">
                Confronto tra programmazione e catalogo matchato
              </SheetDescription>
            </div>
            {selectedIndex >= 0 && (
              <Badge variant="outline" className="shrink-0">
                {selectedIndex + 1} / {individuazioni.length}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!previousId}
                onClick={() => previousId && onNavigate(previousId)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Precedente
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!nextId}
                onClick={() => nextId && onNavigate(nextId)}
              >
                Successiva
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            {individuazione && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={getStatusBadgeClass(statusDisplay.tone)}>{statusDisplay.label}</Badge>
                <Badge variant="secondary">{matchPercent}% · {getMatchScoreBandLabelFromScore(individuazione.punteggio_matching)}</Badge>
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 p-4">
          {loadingDetail ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailError ? (
            <p className="text-sm text-destructive">{detailError}</p>
          ) : individuazione ? (
            <>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Match corrente</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard
                    icon={<User className="h-4 w-4" />}
                    label="Artista"
                    value={artistaDisplay}
                    href={individuazione.artista_id ? `/dashboard/artisti/${individuazione.artista_id}` : undefined}
                  />
                  <InfoCard
                    icon={<Film className="h-4 w-4" />}
                    label="Opera"
                    value={operaDisplay}
                    href={individuazione.opera_id ? `/dashboard/opere/${individuazione.opera_id}` : undefined}
                  />
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span>Ruolo: <strong className="text-foreground">{individuazione.ruoli_tipologie?.nome || '-'}</strong></span>
                  {detail?.opera?.tipo && (
                    <span>Tipo opera: <strong className="text-foreground">{detail.opera.tipo}</strong></span>
                  )}
                  {detail?.opera?.stato_validazione && (
                    <span>Validazione opera: <strong className="text-foreground">{detail.opera.stato_validazione}</strong></span>
                  )}
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Confronto matching</h3>
                <div className="overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-[120px_1fr_1fr] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <span>Campo</span>
                    <span>Programmazione</span>
                    <span>Catalogo</span>
                  </div>
                  {comparisonRows.map(row => (
                    <div
                      key={row.label}
                      className={`grid grid-cols-[120px_1fr_1fr] gap-3 border-b px-3 py-2 text-sm last:border-b-0 ${row.highlight ? 'bg-amber-50/70' : ''}`}
                    >
                      <span className="font-medium text-muted-foreground">{row.label}</span>
                      <span className="break-words">{row.programmazione}</span>
                      <span className="break-words">{row.catalogo}</span>
                    </div>
                  ))}
                </div>
              </section>

              {breakdownItems.length > 0 && (
                <section className="space-y-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-semibold"
                    onClick={() => setShowTechnicalBreakdown(current => !current)}
                  >
                    Breakdown tecnico matching
                    {showTechnicalBreakdown
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  {showTechnicalBreakdown && (
                    <div className="space-y-3">
                      {breakdownItems.map(item => (
                        <div key={item.key} className="rounded-lg border p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <h4 className="text-sm font-medium">{item.label}</h4>
                            {item.score && <Badge variant="outline">Score {item.score}</Badge>}
                          </div>
                          <dl className="space-y-1 text-sm">
                            {item.details.map(detailItem => (
                              <div key={`${item.key}-${detailItem.label}`} className="grid grid-cols-[140px_1fr] gap-2">
                                <dt className="text-muted-foreground">{detailItem.label}</dt>
                                <dd className="break-words">{detailItem.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {individuazione.validato_il && (
                <section className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                  Ultima revisione: {new Date(individuazione.validato_il).toLocaleString('it-IT')}
                </section>
              )}
            </>
          ) : null}
        </div>

        {canReview && individuazione && (
          <SheetFooter className="border-t bg-background">
            <div className="w-full space-y-3">
              <div className="space-y-2">
                <label htmlFor="note-validazione" className="text-sm font-medium">
                  Note validazione
                </label>
                <Textarea
                  id="note-validazione"
                  value={noteValidazione}
                  onChange={event => setNoteValidazione(event.target.value)}
                  placeholder="Opzionale. Consigliata in caso di respinto."
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  className="sm:flex-1"
                  disabled={!!savingStatus}
                  onClick={() => handleStatusChange('validato')}
                >
                  {savingStatus === 'validato' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Valida
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="sm:flex-1"
                  disabled={!!savingStatus}
                  onClick={() => handleStatusChange('dubbioso')}
                >
                  {savingStatus === 'dubbioso' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  In revisione
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="sm:flex-1"
                  disabled={!!savingStatus}
                  onClick={() => handleStatusChange('respinto')}
                >
                  {savingStatus === 'respinto' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Respinto
                </Button>
              </div>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

function InfoCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      {href && value !== '-' ? (
        <Link href={href} className="font-medium hover:text-primary hover:underline">
          {value}
        </Link>
      ) : (
        <p className="font-medium">{value}</p>
      )}
    </div>
  )
}

function getArtistaDisplay(individuazione: Individuazione | null | undefined) {
  if (!individuazione?.artisti) return '-'
  const nome = individuazione.artisti.nome_arte
    || `${individuazione.artisti.nome} ${individuazione.artisti.cognome}`.trim()
  return nome || '-'
}

function getStatusBadgeClass(tone: 'blue' | 'green' | 'red' | 'yellow' | 'muted') {
  switch (tone) {
    case 'green':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'blue':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'red':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'yellow':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    default:
      return ''
  }
}

function getMatchScoreBandLabelFromScore(score: number) {
  return getMatchScoreBandLabel(getMatchScoreBand(score))
}
