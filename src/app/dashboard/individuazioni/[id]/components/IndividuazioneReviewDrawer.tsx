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
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  getIndividuazioneReviewDetail,
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
  normalizeMatchScore,
} from '@/features/individuazioni/utils/individuazioni-detail'
import IndividuazioneStatusDropdown from './IndividuazioneStatusDropdown'

interface IndividuazioneReviewDrawerProps {
  open: boolean
  individuazioni: Individuazione[]
  selectedId: string | null
  canReview: boolean
  isSubmitting?: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: (id: string) => void
  onRequestStatusChange: (stato: IndividuazioneStatus, note: string) => void
}

export default function IndividuazioneReviewDrawer({
  open,
  individuazioni,
  selectedId,
  canReview,
  isSubmitting = false,
  onOpenChange,
  onNavigate,
  onRequestStatusChange,
}: IndividuazioneReviewDrawerProps) {
  const [detail, setDetail] = useState<IndividuazioneReviewDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [noteValidazione, setNoteValidazione] = useState('')

  const selectedIndex = useMemo(
    () => individuazioni.findIndex(item => item.id === selectedId),
    [individuazioni, selectedId]
  )
  const previousId = selectedIndex > 0 ? individuazioni[selectedIndex - 1]?.id ?? null : null
  const nextId = selectedIndex >= 0 && selectedIndex < individuazioni.length - 1
    ? individuazioni[selectedIndex + 1]?.id ?? null
    : null
  const selectedIndividuazione = selectedIndex >= 0 ? individuazioni[selectedIndex] : null
  const individuazione = detail?.individuazione ?? selectedIndividuazione

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
      setDetail(null)
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

  useEffect(() => {
    if (!open || !canReview || !individuazione || isSubmitting) return

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      if (
        target instanceof HTMLTextAreaElement
        || target instanceof HTMLInputElement
        || (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }

      if (event.key === 'ArrowLeft' && previousId) {
        event.preventDefault()
        onNavigate(previousId)
        return
      }

      if (event.key === 'ArrowRight' && nextId) {
        event.preventDefault()
        onNavigate(nextId)
        return
      }

      const key = event.key.toLowerCase()
      if (key === 'v') {
        event.preventDefault()
        onRequestStatusChange('validato', noteValidazione)
      } else if (key === 'r') {
        event.preventDefault()
        onRequestStatusChange('respinto', noteValidazione)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canReview, individuazione, isSubmitting, nextId, noteValidazione, onNavigate, onRequestStatusChange, open, previousId])

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

  const matchPercent = individuazione ? Math.round(normalizeMatchScore(individuazione.punteggio_matching)) : 0
  const artistaDisplay = getArtistaDisplay(individuazione)
  const operaDisplay = detail?.opera?.titolo || individuazione?.opere?.titolo || '-'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0 space-y-1">
              <SheetTitle className="text-left text-lg">
                {individuazione?.titolo || 'Revisione individuazione'}
              </SheetTitle>
              <SheetDescription className="text-left">
                Verifica rapida del match proposto e dei segnali rilevanti
              </SheetDescription>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {selectedIndex >= 0 && (
                <Badge variant="outline">
                  {selectedIndex + 1} / {individuazioni.length}
                </Badge>
              )}
              {canReview && individuazione && (
                <IndividuazioneStatusDropdown
                  stato={individuazione.stato}
                  saving={isSubmitting}
                  onSelectStatus={stato => onRequestStatusChange(stato, noteValidazione)}
                />
              )}
            </div>
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
              <Badge variant="secondary">
                {matchPercent}% · {getMatchScoreBandLabelFromScore(individuazione.punteggio_matching)}
              </Badge>
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
              {canReview && (
                <section className="space-y-2 rounded-lg border bg-muted/20 p-3">
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
                  <p className="text-xs text-muted-foreground">
                    Cambia stato dal menu in alto a destra. Scorciatoie: <kbd className="rounded border px-1">V</kbd> valida, <kbd className="rounded border px-1">R</kbd> respinto.
                  </p>
                </section>
              )}

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

function getMatchScoreBandLabelFromScore(score: number) {
  return getMatchScoreBandLabel(getMatchScoreBand(score))
}
