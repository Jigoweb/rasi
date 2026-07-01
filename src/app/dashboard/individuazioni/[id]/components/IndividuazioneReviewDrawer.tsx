'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Film,
  Info,
  Loader2,
  User,
} from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
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
  buildMatchingReviewContext,
  type ReviewAlert,
  type SignalTone,
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

    return () => {
      cancelled = true
    }
  }, [open, selectedId])

  const individuazione = detail?.individuazione ?? selectedIndividuazione
  const reviewContext = useMemo(() => {
    if (!individuazione) return null
    return buildMatchingReviewContext({
      stato: individuazione.stato,
      punteggioMatching: individuazione.punteggio_matching,
      metodo: individuazione.metodo,
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
      snapshotCanale: individuazione.canale,
      snapshotTipo: individuazione.tipo,
      artistaDisplay: getArtistaDisplay(individuazione),
      ruoloDisplay: individuazione.ruoli_tipologie?.nome,
      operaTitolo: detail?.opera?.titolo ?? individuazione.opere?.titolo,
      operaTitoloOriginale: detail?.opera?.titolo_originale ?? individuazione.opere?.titolo_originale,
      operaTipo: detail?.opera?.tipo,
      operaAnno: detail?.opera?.anno_produzione,
      operaRegisti: detail?.opera?.regista ?? undefined,
      operaStatoValidazione: detail?.opera?.stato_validazione,
      episodioStagione: detail?.episodio?.numero_stagione,
      episodioNumero: detail?.episodio?.numero_episodio,
      episodioTitolo: detail?.episodio?.titolo_episodio,
      dettagliMatching: individuazione.dettagli_matching as Record<string, unknown> | undefined,
    })
  }, [detail, individuazione])

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
                Verifica rapida del match proposto e dei segnali rilevanti
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

        <div className="space-y-5 p-4">
          {loadingDetail ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailError ? (
            <p className="text-sm text-destructive">{detailError}</p>
          ) : individuazione && reviewContext ? (
            <>
              {reviewContext.scoreSummary && (
                <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      Punteggio <strong className="text-foreground">{reviewContext.scoreSummary.total}</strong>
                    </span>
                    <span>
                      Soglia <strong className="text-foreground">{reviewContext.scoreSummary.threshold}</strong>
                    </span>
                    {reviewContext.scoreSummary.method && (
                      <span>
                        Metodo <strong className="text-foreground">{reviewContext.scoreSummary.method}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Perché rivedere</h3>
                <div className="space-y-2">
                  {reviewContext.alerts.map(alert => (
                    <AlertCard key={`${alert.tone}-${alert.title}`} alert={alert} />
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Match proposto</h3>
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
              </section>

              <div className="grid gap-4 md:grid-cols-2">
                <FactsCard title="Trasmissione" facts={reviewContext.transmission} />
                <FactsCard title="Dettaglio catalogo" facts={reviewContext.catalog} />
              </div>

              {reviewContext.signals.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Segnali di matching</h3>
                  <div className="space-y-2">
                    {reviewContext.signals.map(signal => (
                      <div
                        key={signal.key}
                        className={`rounded-lg border px-3 py-2.5 ${getSignalSurfaceClass(signal.tone)}`}
                      >
                        <div className="flex items-start gap-2">
                          <SignalIcon tone={signal.tone} />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{signal.label}</span>
                              {signal.points && (
                                <Badge variant="outline" className="text-[11px]">
                                  {signal.points}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-foreground">{signal.summary}</p>
                            {signal.detail && (
                              <p className="text-xs text-muted-foreground">{signal.detail}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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

function AlertCard({ alert }: { alert: ReviewAlert }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${getSignalSurfaceClass(alert.tone)}`}>
      <div className="flex items-start gap-2">
        <SignalIcon tone={alert.tone} />
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{alert.title}</p>
          {alert.description && (
            <p className="text-xs text-muted-foreground">{alert.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function FactsCard({ title, facts }: { title: string; facts: Array<{ label: string; value: string }> }) {
  return (
    <section className="rounded-lg border">
      <div className="border-b bg-muted/30 px-3 py-2 text-sm font-semibold">{title}</div>
      {facts.length > 0 ? (
        <dl className="divide-y">
          {facts.map(fact => (
            <div key={`${title}-${fact.label}`} className="grid grid-cols-[120px_1fr] gap-3 px-3 py-2 text-sm">
              <dt className="text-muted-foreground">{fact.label}</dt>
              <dd className="font-medium wrap-break-word">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="px-3 py-4 text-sm text-muted-foreground">Nessun dato disponibile.</p>
      )}
    </section>
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

function SignalIcon({ tone }: { tone: SignalTone }) {
  switch (tone) {
    case 'ok':
      return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
    case 'warning':
      return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
    case 'risk':
      return <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
    default:
      return <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
  }
}

function getSignalSurfaceClass(tone: SignalTone) {
  switch (tone) {
    case 'ok':
      return 'border-green-200 bg-green-50/60'
    case 'warning':
      return 'border-amber-200 bg-amber-50/60'
    case 'risk':
      return 'border-red-200 bg-red-50/60'
    default:
      return 'bg-background'
  }
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
