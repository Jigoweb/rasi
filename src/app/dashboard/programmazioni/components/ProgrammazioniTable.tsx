'use client'

import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Edit,
  Eye,
  FileUp,
  Info,
  Loader2,
  MoreHorizontal,
  RotateCw,
  Sparkles,
  Trash2,
  Tv,
  Database as DatabaseIcon,
} from 'lucide-react'
import {
  getProgrammazioneRowState,
} from '@/features/programmazioni/services/programmazioni-state.service'
import type {
  CampagnaProgrammazione,
  ProcessingActivityJob,
  ProcessingProgress,
} from '@/features/programmazioni/services/programmazioni.service'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
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
import { clickableRowClassName, handleClickableRowKeyDown } from '@/shared/lib/clickable-row'
import ProgrammazioneStatusBadge from './ProgrammazioneStatusBadge'

type ProgressCount = {
  done: number
  total: number
}

type CampagnaWithRuntimeError = CampagnaProgrammazione & { last_error?: string }

export interface ProgrammazioniTableProps {
  campagne: CampagnaProgrammazione[]
  uploadProgress: Record<string, ProgressCount>
  deleteProgress: Record<string, ProgressCount>
  processingProgressMap: Record<string, ProcessingProgress | null>
  processingJobMap: Record<string, ProcessingActivityJob | null>
  loadingProgressMap: Record<string, boolean>
  isCampagnaProcessing: (campagnaId: string) => boolean
  canStartProcess: (campagnaId: string) => boolean
  fetchProcessingProgress: (campagnaId: string) => void
  onUpload: (campagna: CampagnaProgrammazione) => void
  onStartIndividuazioni: (campagna: CampagnaProgrammazione) => void
  onResumeIndividuazioni: (campagna: CampagnaProgrammazione) => void
  onDelete: (campagna: CampagnaProgrammazione) => void
}

export default function ProgrammazioniTable({
  campagne,
  uploadProgress,
  deleteProgress,
  processingProgressMap,
  processingJobMap,
  loadingProgressMap,
  isCampagnaProcessing,
  canStartProcess,
  fetchProcessingProgress,
  onUpload,
  onStartIndividuazioni,
  onResumeIndividuazioni,
  onDelete,
}: ProgrammazioniTableProps) {
  const router = useRouter()

  function navigateToCampagna(campagnaId: string): void {
    router.push(`/dashboard/programmazioni/${campagnaId}`)
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="hidden lg:block relative overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="py-4">Nome</TableHead>
                <TableHead className="py-4">Emittente</TableHead>
                <TableHead className="py-4 w-24 text-center">Anno</TableHead>
                <TableHead className="py-4 w-44">Stato</TableHead>
                <TableHead className="py-4 w-36">Creato il</TableHead>
                <TableHead className="py-4 w-72">Operazioni</TableHead>
                <TableHead className="py-4 w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campagne.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                    Nessuna campagna trovata con i criteri di ricerca attuali
                  </TableCell>
                </TableRow>
              ) : (
                campagne.map((campagna) => {
                  const rowState = getRowState({
                    campagna,
                    uploadProgress,
                    processingProgressMap,
                    processingJobMap,
                    isCampagnaProcessing,
                  })
                  const isGlobalProcessingThisCampagna = isCampagnaProcessing(campagna.id)
                  const isCompleted = rowState.badge === 'individuata'
                  const workflowStep = getWorkflowStep(rowState)

                  return (
                    <TableRow
                      key={campagna.id}
                      className={clickableRowClassName}
                      role="link"
                      tabIndex={0}
                      aria-label={`Apri dettaglio programmazione ${campagna.nome}`}
                      onClick={() => navigateToCampagna(campagna.id)}
                      onKeyDown={(event) => handleClickableRowKeyDown(event, () => navigateToCampagna(campagna.id))}
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{campagna.nome}</span>
                          <CampagnaInfoTooltip
                            campagna={campagna}
                            processingProgressMap={processingProgressMap}
                            loadingProgressMap={loadingProgressMap}
                            fetchProcessingProgress={fetchProcessingProgress}
                            detailed
                          />
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Tv className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{campagna.emittenti?.nome || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <span className="font-mono text-muted-foreground">{campagna.anno}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <StatusCell
                          campagna={campagna}
                          rowBadge={rowState.badge}
                          uploadProgress={uploadProgress}
                          deleteProgress={deleteProgress}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">{workflowStep.label}</p>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">{formatDate(campagna.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4" onClick={(event) => event.stopPropagation()}>
                        <PrimaryWorkflowAction
                          campagna={campagna}
                          rowState={rowState}
                          isCompleted={isCompleted}
                          isGlobalProcessingThisCampagna={isGlobalProcessingThisCampagna}
                          uploadProgress={uploadProgress}
                          canStartProcess={canStartProcess}
                          onUpload={onUpload}
                          onStartIndividuazioni={onStartIndividuazioni}
                          onResumeIndividuazioni={onResumeIndividuazioni}
                        />
                      </TableCell>
                      <TableCell className="py-4">
                        <SecondaryActions
                          campagna={campagna}
                          onNavigate={navigateToCampagna}
                          onDelete={onDelete}
                          onUpload={onUpload}
                          rowState={rowState}
                          showEdit
                        />
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
            <div className="text-center py-8 text-gray-500">Nessuna campagna trovata</div>
          ) : (
            campagne.map((campagna) => {
              const rowState = getRowState({
                campagna,
                uploadProgress,
                processingProgressMap,
                processingJobMap,
                isCampagnaProcessing,
              })
              const isCompleted = rowState.badge === 'individuata'
              const workflowStep = getWorkflowStep(rowState)

              return (
                <Card
                  key={campagna.id}
                  className={`p-4 ${clickableRowClassName}`}
                  role="link"
                  tabIndex={0}
                  aria-label={`Apri dettaglio programmazione ${campagna.nome}`}
                  onClick={() => navigateToCampagna(campagna.id)}
                  onKeyDown={(event) => handleClickableRowKeyDown(event, () => navigateToCampagna(campagna.id))}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-lg">{campagna.nome}</h3>
                        <CampagnaInfoTooltip
                          campagna={campagna}
                          processingProgressMap={processingProgressMap}
                          loadingProgressMap={loadingProgressMap}
                          fetchProcessingProgress={fetchProcessingProgress}
                        />
                      </div>
                      <div className="mt-1 text-sm text-gray-600 flex items-center gap-2">
                        <Tv className="h-4 w-4 text-gray-400" />
                        <span>{campagna.emittenti?.nome || '—'}</span>
                        <span className="font-mono">{campagna.anno}</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-600 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(campagna.created_at)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <ProgrammazioneStatusBadge badge={rowState.badge} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{workflowStep.label}</p>
                      <div className="mt-3" onClick={(event) => event.stopPropagation()}>
                        <PrimaryWorkflowAction
                          campagna={campagna}
                          rowState={rowState}
                          isCompleted={isCompleted}
                          isGlobalProcessingThisCampagna={isCampagnaProcessing(campagna.id)}
                          uploadProgress={uploadProgress}
                          canStartProcess={canStartProcess}
                          onUpload={onUpload}
                          onStartIndividuazioni={onStartIndividuazioni}
                          onResumeIndividuazioni={onResumeIndividuazioni}
                          compact
                        />
                      </div>
                    </div>
                    <SecondaryActions
                      campagna={campagna}
                      onNavigate={navigateToCampagna}
                      onDelete={onDelete}
                      onUpload={onUpload}
                      rowState={rowState}
                    />
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

interface RowStateInput {
  campagna: CampagnaProgrammazione
  uploadProgress: Record<string, ProgressCount>
  processingProgressMap: Record<string, ProcessingProgress | null>
  processingJobMap: Record<string, ProcessingActivityJob | null>
  isCampagnaProcessing: (campagnaId: string) => boolean
}

function getRowState({
  campagna,
  uploadProgress,
  processingProgressMap,
  processingJobMap,
  isCampagnaProcessing,
}: RowStateInput) {
  const hasData = (campagna.programmazioni_count || 0) > 0

  return getProgrammazioneRowState({
    datasetStatus: campagna.stato,
    uploadJob: uploadProgress[campagna.id]
      ? {
        stato: 'running',
        righe_processate: uploadProgress[campagna.id].done,
        righe_totali: uploadProgress[campagna.id].total,
      }
      : null,
    progress: processingProgressMap[campagna.id],
    campaignJob: processingJobMap[campagna.id],
    hasLocalRuntimeProcess: isCampagnaProcessing(campagna.id),
    hasData,
  })
}

type ProgrammazioneRowState = ReturnType<typeof getRowState>

function getWorkflowStep(rowState: ProgrammazioneRowState): { label: string } {
  if (rowState.badge === 'uploading') return { label: 'Step attuale: caricamento dati' }
  if (rowState.badge === 'deleting') return { label: 'Step attuale: eliminazione in corso' }
  if (rowState.badge === 'individuazione_running') return { label: 'Step attuale: monitoraggio individuazioni' }
  if (rowState.badge === 'individuazione_stale') return { label: 'Step attuale: riprendi individuazioni' }
  if (rowState.badge === 'individuata') return { label: 'Step completato: individuazioni create' }
  if (rowState.canCreateIndividuazione) return { label: 'Prossimo step: crea individuazioni' }
  if (rowState.canUpload) return { label: 'Prossimo step: carica dati' }
  return { label: 'Step attuale: verifica dati' }
}

interface PrimaryWorkflowActionProps {
  campagna: CampagnaProgrammazione
  rowState: ProgrammazioneRowState
  isCompleted: boolean
  isGlobalProcessingThisCampagna: boolean
  uploadProgress: Record<string, ProgressCount>
  canStartProcess: (campagnaId: string) => boolean
  onUpload: (campagna: CampagnaProgrammazione) => void
  onStartIndividuazioni: (campagna: CampagnaProgrammazione) => void
  onResumeIndividuazioni: (campagna: CampagnaProgrammazione) => void
  compact?: boolean
}

function PrimaryWorkflowAction({
  campagna,
  rowState,
  isCompleted,
  isGlobalProcessingThisCampagna,
  uploadProgress,
  canStartProcess,
  onUpload,
  onStartIndividuazioni,
  onResumeIndividuazioni,
  compact = false,
}: PrimaryWorkflowActionProps) {
  if (isCompleted) {
    return (
      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1.5 py-1.5 px-3">
        <CheckCircle className="h-3.5 w-3.5" />
        Completata
      </Badge>
    )
  }

  if (rowState.canResumeIndividuazione && !isGlobalProcessingThisCampagna) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={!canStartProcess(campagna.id)}
        onClick={(event) => {
          event.stopPropagation()
          onResumeIndividuazioni(campagna)
        }}
        className="gap-1.5 cursor-pointer disabled:cursor-not-allowed border-yellow-500 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400"
      >
        <RotateCw className="h-3.5 w-3.5" />
        Riprendi
      </Button>
    )
  }

  if (rowState.badge === 'individuazione_stale') {
    return (
      <Badge variant="outline" className="gap-1.5 py-1.5 px-3 border-yellow-500 text-yellow-600 dark:text-yellow-400">
        <AlertCircle className="h-3.5 w-3.5" />
        Individuazione interrotta
      </Badge>
    )
  }

  if (rowState.badge === 'individuazione_running') {
    return (
      <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Individuazione in corso
      </Badge>
    )
  }

  if (rowState.badge === 'uploading' || uploadProgress[campagna.id]) {
    return (
      <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Caricamento dati
      </Badge>
    )
  }

  if (rowState.canCreateIndividuazione) {
    return (
      <Button
        size="sm"
        onClick={(event) => {
          event.stopPropagation()
          onStartIndividuazioni(campagna)
        }}
        className="gap-1.5 cursor-pointer disabled:cursor-not-allowed"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {compact ? 'Individuazioni' : 'Crea Individuazioni'}
      </Button>
    )
  }

  if (rowState.canUpload) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={(event) => {
          event.stopPropagation()
          onUpload(campagna)
        }}
        className="gap-1.5 cursor-pointer disabled:cursor-not-allowed"
      >
        <FileUp className="h-3.5 w-3.5" />
        {compact ? 'Carica' : 'Carica Dati'}
      </Button>
    )
  }

  return (
    <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
      Verifica dati
    </Badge>
  )
}

interface StatusCellProps {
  campagna: CampagnaProgrammazione
  rowBadge: ReturnType<typeof getProgrammazioneRowState>['badge']
  uploadProgress: Record<string, ProgressCount>
  deleteProgress: Record<string, ProgressCount>
}

function StatusCell({
  campagna,
  rowBadge,
  uploadProgress,
  deleteProgress,
}: StatusCellProps) {
  if (uploadProgress[campagna.id]) {
    return (
      <div className="space-y-1.5">
        <Badge variant="secondary">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading
        </Badge>
        <div className="h-1.5 w-28 bg-muted rounded-full">
          <div
            className="h-1.5 bg-primary rounded-full transition-all"
            style={{ width: `${getPercent(uploadProgress[campagna.id])}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {uploadProgress[campagna.id].done.toLocaleString()} / {uploadProgress[campagna.id].total.toLocaleString()}
        </div>
      </div>
    )
  }

  if (deleteProgress[campagna.id]) {
    return (
      <div className="space-y-1.5">
        <Badge variant="outline">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Eliminazione
        </Badge>
        <div className="h-1.5 w-28 bg-muted rounded-full">
          <div
            className="h-1.5 bg-destructive rounded-full transition-all"
            style={{ width: `${getPercent(deleteProgress[campagna.id])}%` }}
          />
        </div>
      </div>
    )
  }

  return <ProgrammazioneStatusBadge badge={rowBadge} />
}

interface CampagnaInfoTooltipProps {
  campagna: CampagnaProgrammazione
  processingProgressMap: Record<string, ProcessingProgress | null>
  loadingProgressMap: Record<string, boolean>
  fetchProcessingProgress: (campagnaId: string) => void
  detailed?: boolean
}

function CampagnaInfoTooltip({
  campagna,
  processingProgressMap,
  loadingProgressMap,
  fetchProcessingProgress,
  detailed = false,
}: CampagnaInfoTooltipProps) {
  if (!detailed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Informazioni su ${campagna.nome}`}
            onClick={(event) => event.stopPropagation()}
          >
            <Info className="h-4 w-4 cursor-help" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Informazioni</p>
            <p className="text-sm">Record: <strong>{(campagna.programmazioni_count || 0).toLocaleString()}</strong></p>
            {campagna.descrizione && (
              <div className="pt-1 border-t">
                <p className="text-xs font-medium">Note:</p>
                <p className="text-xs">{campagna.descrizione}</p>
              </div>
            )}
            {campagna.stato === 'error' && getCampagnaLastError(campagna) && (
              <div className="pt-1 border-t">
                <p className="text-xs font-medium text-red-500">Errore:</p>
                <p className="text-xs text-red-400">{getCampagnaLastError(campagna)}</p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip
      onOpenChange={(open) => {
        if (open && campagna.stato === 'in_corso' && !processingProgressMap[campagna.id] && !loadingProgressMap[campagna.id]) {
          fetchProcessingProgress(campagna.id)
        }
      }}
    >
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={`Informazioni su ${campagna.nome}`}
          onClick={(event) => event.stopPropagation()}
        >
          <Info className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-sm">
        <div className="space-y-3">
          <div>
            <p className="font-semibold mb-1">Informazioni Campagna</p>
            <div className="flex items-center gap-2 text-sm">
              <DatabaseIcon className="h-3.5 w-3.5 shrink-0" />
              <span>Record caricati: <strong>{(campagna.programmazioni_count || 0).toLocaleString()}</strong></span>
            </div>
          </div>
          {campagna.descrizione && (
            <div className="pt-2 border-t border-primary-foreground/20">
              <p className="font-medium text-sm mb-1">Note:</p>
              <p className="text-xs opacity-90">{campagna.descrizione}</p>
            </div>
          )}
          <div className="pt-2 border-t border-primary-foreground/20">
            <p className="font-medium text-sm mb-1">Stato: {campagna.stato}</p>
            <p className="text-xs opacity-90">
              {campagna.stato === 'bozza' && 'La campagna è stata creata ma non sono ancora stati caricati dati. Utilizza il pulsante "Carica Dati" per importare un file CSV o Excel.'}
              {campagna.stato === 'in_review' && 'I dati sono stati caricati correttamente. Puoi procedere con la creazione delle individuazioni oppure caricare ulteriori file per aggiungere altri record.'}
              {campagna.stato === 'individuata' && 'Il processo di individuazione è stato completato con successo. Le individuazioni sono state create e sono pronte per la revisione.'}
              {campagna.stato === 'error' && 'Si è verificato un errore durante l\'elaborazione. Verifica i dati e riprova il caricamento.'}
              {campagna.stato === 'in_corso' && 'Esiste una campagna individuazione in corso o interrotta per questi dati. Gestiscila dalla pagina Individuazioni.'}
              {campagna.stato === 'uploading' && 'Caricamento dati in corso. Attendere il completamento...'}
            </p>

            {campagna.stato === 'in_corso' && (
              <ProcessingProgressDetails
                campagnaId={campagna.id}
                progress={processingProgressMap[campagna.id]}
                isLoading={loadingProgressMap[campagna.id]}
                onFetchProcessingProgress={fetchProcessingProgress}
              />
            )}

            {campagna.stato === 'error' && getCampagnaLastError(campagna) && (
              <div className="pt-2 border-t border-red-500/30">
                <p className="font-medium text-sm text-red-300 mb-1">Dettaglio errore:</p>
                <p className="text-xs text-red-200/90 wrap-break-word">{getCampagnaLastError(campagna)}</p>
              </div>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

interface ProcessingProgressDetailsProps {
  campagnaId: string
  progress: ProcessingProgress | null | undefined
  isLoading: boolean | undefined
  onFetchProcessingProgress: (campagnaId: string) => void
}

function ProcessingProgressDetails({
  campagnaId,
  progress,
  isLoading,
  onFetchProcessingProgress,
}: ProcessingProgressDetailsProps) {
  return (
    <div className="pt-2 border-t border-primary-foreground/20">
      <p className="font-medium text-sm mb-2 flex items-center gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" />
        Elaborazione in corso
      </p>
      {!progress && !isLoading ? (
        <button
          onClick={(event) => {
            event.stopPropagation()
            onFetchProcessingProgress(campagnaId)
          }}
          className="text-xs opacity-80 hover:opacity-100 underline"
        >
          Mostra avanzamento dettagliato
        </button>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-xs opacity-80">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Caricamento...</span>
        </div>
      ) : progress ? (
        <ProgressStats progress={progress} onRefresh={() => onFetchProcessingProgress(campagnaId)} />
      ) : null}
    </div>
  )
}

interface ProgressStatsProps {
  progress: ProcessingProgress
  onRefresh: () => void
}

function ProgressStats({ progress, onRefresh }: ProgressStatsProps) {
  const estimatedProgress = progress.programmazioni_totali > 0
    ? Math.min(100, Math.round((progress.individuazioni_create / progress.programmazioni_totali) * 10 * 100))
    : 0

  return (
    <div className="space-y-2 text-xs">
      <div className="space-y-1.5">
        <div className="flex justify-between opacity-90">
          <span>Individuazioni create:</span>
          <span className="font-medium">
            {progress.individuazioni_create.toLocaleString()} / {progress.programmazioni_totali.toLocaleString()} programmazioni
          </span>
        </div>
        <div className="h-1.5 bg-primary-foreground/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-foreground/80 rounded-full transition-all"
            style={{ width: `${estimatedProgress}%` }}
          />
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
      {progress.last_activity_at && <LastActivity lastActivityAt={progress.last_activity_at} />}
      <button
        onClick={(event) => {
          event.stopPropagation()
          onRefresh()
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
          <span>⚠️</span>
          <span>Processo interrotto ({minutesSinceActivity} minuti senza attività) — riprendibile</span>
        </div>
      )}
    </>
  )
}

interface SecondaryActionsProps {
  campagna: CampagnaProgrammazione
  onNavigate: (campagnaId: string) => void
  onDelete: (campagna: CampagnaProgrammazione) => void
  onUpload?: (campagna: CampagnaProgrammazione) => void
  rowState?: ProgrammazioneRowState
  showEdit?: boolean
}

function SecondaryActions({
  campagna,
  onNavigate,
  onDelete,
  onUpload,
  rowState,
  showEdit = false,
}: SecondaryActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Azioni per ${campagna.nome}`}
          variant="ghost"
          size="sm"
          className={showEdit ? 'h-8 w-8 p-0' : undefined}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={(event) => { event.stopPropagation(); onNavigate(campagna.id) }}>
          <Eye className="h-4 w-4 mr-2" />
          Dettaglio
        </DropdownMenuItem>
        {onUpload && rowState?.canUpload && (
          <DropdownMenuItem onClick={(event) => { event.stopPropagation(); onUpload(campagna) }}>
            <FileUp className="h-4 w-4 mr-2" />
            Carica dati
          </DropdownMenuItem>
        )}
        {showEdit && (
          <DropdownMenuItem>
            <Edit className="h-4 w-4 mr-2" />
            Modifica
          </DropdownMenuItem>
        )}
        {showEdit && (
          <DropdownMenuItem
            variant="destructive"
            onClick={(event) => {
              event.stopPropagation()
              onDelete(campagna)
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Elimina
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getCampagnaLastError(campagna: CampagnaProgrammazione): string | undefined {
  return (campagna as CampagnaWithRuntimeError).last_error
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('it-IT')
}

function getPercent(progress: ProgressCount): number {
  return Math.min(100, Math.round((progress.done / progress.total) * 100))
}
