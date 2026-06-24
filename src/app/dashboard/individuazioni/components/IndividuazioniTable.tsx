import {
  AlertCircle,
  Edit,
  Eye,
  Info,
  Loader2,
  MoreHorizontal,
  RotateCw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { EmptyState } from '@/shared/components/page-states'
import { clickableRowClassName, handleClickableRowKeyDown } from '@/shared/lib/clickable-row'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { isProcessingStale } from '@/features/programmazioni/services/programmazioni.service'
import type {
  CampagnaIndividuazione,
  IndividuazioneProcessingProgress,
} from '@/features/individuazioni/services/individuazioni.service'
import IndividuazioneStatusBadge from './IndividuazioneStatusBadge'

interface IndividuazioniTableProps {
  campagne: CampagnaIndividuazione[]
  loading: boolean
  searchTerm: string
  processingProgressMap: Record<string, IndividuazioneProcessingProgress | null>
  loadingProgressMap: Record<string, boolean>
  resumingId: string | null
  canStartProcess: (campagneProgrammazioneId: string) => boolean
  onOpenDetail: (campagnaId: string) => void
  onOpenEdit: (campagna: CampagnaIndividuazione) => void
  onOpenDelete: (campagna: CampagnaIndividuazione) => void
  onResume: (campagna: CampagnaIndividuazione) => void
  onFetchProcessingProgress: (campagnaId: string) => void
  hasActiveFilters?: boolean
  onResetFilters?: () => void
}

export default function IndividuazioniTable({
  campagne,
  loading,
  searchTerm,
  processingProgressMap,
  loadingProgressMap,
  resumingId,
  canStartProcess,
  onOpenDetail,
  onOpenEdit,
  onOpenDelete,
  onResume,
  onFetchProcessingProgress,
  hasActiveFilters = false,
  onResetFilters,
}: IndividuazioniTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="py-4 px-6">Nome Campagna</TableHead>
              <TableHead className="py-4">Emittente</TableHead>
              <TableHead className="py-4">Anno</TableHead>
              <TableHead className="py-4 text-right">Individuazioni</TableHead>
              <TableHead className="py-4 text-right">Artisti</TableHead>
              <TableHead className="py-4 text-right">Opere</TableHead>
              <TableHead className="py-4">Stato</TableHead>
              <TableHead className="py-4">Creata il</TableHead>
              <TableHead className="py-4 w-32">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : campagne.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  {hasActiveFilters ? 'Nessuna campagna corrisponde ai filtri attuali.' : 'Non ci sono campagne di individuazione disponibili.'}
                  {hasActiveFilters && onResetFilters && (
                    <div className="mt-3">
                      <Button type="button" variant="outline" size="sm" onClick={onResetFilters}>
                        Cancella filtri
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              campagne.map(campagna => {
                const progress = processingProgressMap[campagna.id]
                const showResume = canShowResume(campagna, progress)

                return (
                  <TableRow
                    key={campagna.id}
                    className={clickableRowClassName}
                    role="link"
                    tabIndex={0}
                    aria-label={`Apri dettaglio individuazione ${campagna.nome}`}
                    onClick={() => onOpenDetail(campagna.id)}
                    onKeyDown={event => handleClickableRowKeyDown(event, () => onOpenDetail(campagna.id))}
                  >
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{campagna.nome}</span>
                        <Tooltip
                          onOpenChange={open => {
                            if (open && campagna.stato === 'in_corso' && !processingProgressMap[campagna.id] && !loadingProgressMap[campagna.id]) {
                              onFetchProcessingProgress(campagna.id)
                            }
                          }}
                        >
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={`Informazioni su ${campagna.nome}`}
                              onClick={event => event.stopPropagation()}
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-sm">
                            <CampaignTooltip
                              campagna={campagna}
                              progress={progress}
                              loadingProgress={Boolean(loadingProgressMap[campagna.id])}
                              onFetchProcessingProgress={onFetchProcessingProgress}
                            />
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">{campagna.emittenti?.nome || '-'}</TableCell>
                    <TableCell className="py-4">{campagna.anno || '-'}</TableCell>
                    <TableCell className="py-4 text-right font-medium">
                      {formatNumber(campagna.statistiche?.individuazioni_create)}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      {formatNumber(campagna.statistiche?.artisti_distinti)}
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      {formatNumber(campagna.statistiche?.opere_distinte)}
                    </TableCell>
                    <TableCell className="py-4">
                      <IndividuazioneStatusBadge stato={campagna.stato} progress={progress} />
                    </TableCell>
                    <TableCell className="py-4">{formatDate(campagna.created_at)}</TableCell>
                    <TableCell className="py-4" onClick={event => event.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {showResume && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canStartProcess(campagna.campagne_programmazione_id) || resumingId === campagna.id}
                            onClick={() => onResume(campagna)}
                            className="gap-1.5 border-yellow-500 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400"
                          >
                            {resumingId === campagna.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCw className="h-4 w-4" />
                            )}
                            Riprendi
                          </Button>
                        )}
                        <Button variant="outline" size="sm" aria-label={`Apri dettaglio ${campagna.nome}`} onClick={() => onOpenDetail(campagna.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Azioni per ${campagna.nome}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onOpenDetail(campagna.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Dettaglio
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onOpenEdit(campagna)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => onOpenDelete(campagna)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        </div>

        <div className="lg:hidden space-y-4 p-4">
          {campagne.length === 0 ? (
            <EmptyState
              title={hasActiveFilters ? 'Nessuna campagna corrisponde ai filtri attuali' : 'Non ci sono campagne di individuazione disponibili'}
              description={hasActiveFilters ? 'Cancella i filtri per tornare alla lista completa.' : 'Quando verranno create campagne di individuazione, le troverai qui.'}
              actionLabel={hasActiveFilters ? 'Cancella filtri' : undefined}
              onAction={hasActiveFilters ? onResetFilters : undefined}
            />
          ) : (
            campagne.map(campagna => {
              const progress = processingProgressMap[campagna.id]
              const showResume = canShowResume(campagna, progress)

              return (
                <Card
                  key={campagna.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Apri dettaglio individuazione ${campagna.nome}`}
                  className={`p-4 ${clickableRowClassName}`}
                  onClick={() => onOpenDetail(campagna.id)}
                  onKeyDown={event => handleClickableRowKeyDown(event, () => onOpenDetail(campagna.id))}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-muted-foreground" />
                          <h2 className="font-medium text-foreground">{campagna.nome}</h2>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {campagna.emittenti?.nome || 'Emittente non indicata'} • {campagna.anno || '-'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <IndividuazioneStatusBadge stato={campagna.stato} progress={progress} />
                        <span className="text-xs text-muted-foreground">{formatDate(campagna.created_at)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <MobileMetric label="Individuazioni" value={formatNumber(campagna.statistiche?.individuazioni_create)} />
                        <MobileMetric label="Artisti" value={formatNumber(campagna.statistiche?.artisti_distinti)} />
                        <MobileMetric label="Opere" value={formatNumber(campagna.statistiche?.opere_distinte)} />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2" onClick={event => event.stopPropagation()}>
                      {showResume && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canStartProcess(campagna.campagne_programmazione_id) || resumingId === campagna.id}
                          onClick={() => onResume(campagna)}
                          className="gap-1.5 border-yellow-500 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400"
                        >
                          {resumingId === campagna.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCw className="h-4 w-4" />
                          )}
                          Riprendi
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => onOpenDetail(campagna.id)}>
                        <Eye className="h-4 w-4" />
                        Dettaglio
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onOpenEdit(campagna)}>
                        <Edit className="h-4 w-4" />
                        Modifica
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function CampaignTooltip({
  campagna,
  progress,
  loadingProgress,
  onFetchProcessingProgress,
}: {
  campagna: CampagnaIndividuazione
  progress: IndividuazioneProcessingProgress | null | undefined
  loadingProgress: boolean
  onFetchProcessingProgress: (campagnaId: string) => void
}) {
  const isInterrupted = progress?.job_stato === 'error' || isProcessingStale(progress)
  const needsReview = !progress?.last_activity_at && progress?.job_stato !== 'running'

  return (
    <div className="space-y-2">
      <p className="font-semibold">Informazioni Campagna</p>
      <div className="text-sm space-y-1">
        <p>Individuazioni: <strong>{formatNumber(campagna.statistiche?.individuazioni_create)}</strong></p>
        {campagna.statistiche && (
          <>
            <p>Programmazioni totali: <strong>{formatNumber(campagna.statistiche.programmazioni_totali)}</strong></p>
            <p>Con match: <strong>{formatNumber(campagna.statistiche.programmazioni_con_match)}</strong></p>
            <p>Senza match: <strong>{formatNumber(campagna.statistiche.programmazioni_senza_match)}</strong></p>
          </>
        )}
      </div>
      {campagna.descrizione && (
        <div className="pt-2 border-t">
          <p className="text-xs font-medium">Note:</p>
          <p className="text-xs">{campagna.descrizione}</p>
        </div>
      )}

      {campagna.stato === 'in_corso' && (
        <div className="pt-2 border-t border-primary-foreground/20">
          <p className="font-medium text-sm mb-2 flex items-center gap-1.5">
            {isInterrupted ? (
              <>
                <AlertCircle className="h-3 w-3 text-yellow-500" />
                Processo interrotto
              </>
            ) : needsReview ? (
              <>
                <AlertCircle className="h-3 w-3 text-yellow-500" />
                Stato da verificare
              </>
            ) : (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Elaborazione in corso
              </>
            )}
          </p>
          {!progress && !loadingProgress ? (
            <button
              onClick={event => {
                event.stopPropagation()
                onFetchProcessingProgress(campagna.id)
              }}
              className="text-xs opacity-80 hover:opacity-100 underline"
            >
              Mostra avanzamento dettagliato
            </button>
          ) : loadingProgress ? (
            <div className="flex items-center gap-2 text-xs opacity-80">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Caricamento...</span>
            </div>
          ) : progress ? (
            <ProgressDetails progress={progress} campagnaId={campagna.id} onFetchProcessingProgress={onFetchProcessingProgress} />
          ) : null}
        </div>
      )}
    </div>
  )
}

function ProgressDetails({
  progress,
  campagnaId,
  onFetchProcessingProgress,
}: {
  progress: IndividuazioneProcessingProgress
  campagnaId: string
  onFetchProcessingProgress: (campagnaId: string) => void
}) {
  const estimatedProgress = progress.programmazioni_totali > 0
    ? Math.min(100, Math.round((progress.individuazioni_create / progress.programmazioni_totali) * 10 * 100))
    : 0

  return (
    <div className="space-y-2 text-xs">
      <div className="space-y-1.5">
        <div className="flex justify-between opacity-90">
          <span>Individuazioni create:</span>
          <span className="font-medium">{progress.individuazioni_create.toLocaleString()} / {progress.programmazioni_totali.toLocaleString()} programmazioni</span>
        </div>
        <div className="h-1.5 bg-primary-foreground/20 rounded-full overflow-hidden">
          <div className="h-full bg-primary-foreground/80 rounded-full transition-all" style={{ width: `${estimatedProgress}%` }} />
        </div>
        <div className="flex justify-between opacity-70 text-[11px]">
          <span>Programmazioni totali:</span>
          <span>{progress.programmazioni_totali.toLocaleString()}</span>
        </div>
      </div>
      {progress.processing_started_at && (
        <div className="flex justify-between opacity-70 pt-1.5 border-t border-primary-foreground/10 text-[11px]">
          <span>Avviato il:</span>
          <span>{new Date(progress.processing_started_at).toLocaleString('it-IT')}</span>
        </div>
      )}
      {progress.job_stato === 'error' && (
        <div className="pt-1.5 text-[11px] text-yellow-300 flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          <span>Job in errore - puoi riprendere il processo.</span>
        </div>
      )}
      {progress.last_activity_at && (
        <LastActivity lastActivityAt={progress.last_activity_at} />
      )}
      <button
        onClick={event => {
          event.stopPropagation()
          onFetchProcessingProgress(campagnaId)
        }}
        className="opacity-70 hover:opacity-100 text-[11px] flex items-center gap-1"
      >
        ↻ Aggiorna stato
      </button>
    </div>
  )
}

function LastActivity({ lastActivityAt }: { lastActivityAt: string }) {
  const lastActivity = new Date(lastActivityAt)
  const minutesSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / 1000 / 60)
  const isStale = minutesSinceActivity > 10

  return (
    <>
      <div className={`flex justify-between pt-1.5 border-t border-primary-foreground/10 text-[11px] ${isStale ? 'text-yellow-300' : 'opacity-70'}`}>
        <span>Ultima attività:</span>
        <span>{lastActivity.toLocaleString('it-IT')}</span>
      </div>
      {isStale && (
        <div className="pt-1.5 text-[11px] text-yellow-300 flex items-center gap-1.5">
          <span>!</span>
          <span>Processo interrotto ({minutesSinceActivity} minuti senza attività) - riprendibile</span>
        </div>
      )}
    </>
  )
}

function canShowResume(
  campagna: CampagnaIndividuazione,
  progress: IndividuazioneProcessingProgress | null | undefined
): boolean {
  return campagna.stato === 'in_corso' && (
    progress?.job_stato === 'error' ||
    isProcessingStale(progress) ||
    (!progress?.last_activity_at && progress?.job_stato !== 'running')
  )
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
