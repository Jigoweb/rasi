import type {
  CampagnaProgrammazione,
  ProcessingActivityJob,
  ProcessingProgress,
} from './programmazioni.service'
import type { UploadJobSnapshot } from './programmazioni-upload-worker.service'
import { classifyProcessingOperationalState } from './programmazioni-state.service'

type AsyncResult<T> = Promise<{ data: T | null; error: unknown }>

export interface ProgrammazioniOperationalSnapshotDeps {
  workerMode: boolean
  now?: number
  getCampagneProgrammazione: () => AsyncResult<CampagnaProgrammazione[]>
  getLatestProcessingJobsForCampagne: (campagneIds: string[]) => AsyncResult<ProcessingActivityJob[]>
  getLatestUploadJobsForCampagne: (campagneIds: string[]) => AsyncResult<UploadJobSnapshot[]>
  getProcessingProgress: (campagnaId: string) => AsyncResult<ProcessingProgress | null>
}

export interface InterruptedProgrammazioneSnapshot {
  id: string
  nome: string
  programmazioni_totali: number
  individuazioni_create: number
  minutesSinceActivity: number | null
}

export interface ProgrammazioniOperationalSnapshot {
  campagne: CampagnaProgrammazione[]
  processingJobMap: Record<string, ProcessingActivityJob | null>
  processingProgressMap: Record<string, ProcessingProgress | null>
  uploadJobs: UploadJobSnapshot[]
  interrupted: InterruptedProgrammazioneSnapshot[]
  error: unknown | null
}

export async function loadProgrammazioniOperationalSnapshot(
  deps: ProgrammazioniOperationalSnapshotDeps
): Promise<ProgrammazioniOperationalSnapshot> {
  const { data, error } = await deps.getCampagneProgrammazione()
  if (error) {
    return emptySnapshot(error)
  }

  const campagne = data ?? []
  if (!deps.workerMode || campagne.length === 0) {
    return {
      campagne,
      processingJobMap: {},
      processingProgressMap: {},
      uploadJobs: [],
      interrupted: [],
      error: null,
    }
  }

  const campagneIds = campagne.map(campagna => campagna.id)
  const uploadingIds = campagne
    .filter(campagna => campagna.stato === 'uploading')
    .map(campagna => campagna.id)

  const [processingJobsResult, uploadJobsResult] = await Promise.all([
    deps.getLatestProcessingJobsForCampagne(campagneIds),
    uploadingIds.length > 0
      ? deps.getLatestUploadJobsForCampagne(uploadingIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const processingJobs = processingJobsResult.data ?? []
  const processingJobMap = buildProcessingJobMap(processingJobs)
  const progressTargets = campagne.filter(campagna => (
    campagna.stato === 'in_corso' &&
    !processingJobMap[campagna.id]
  ))
  const progressEntries = await Promise.all(
    progressTargets.map(async campagna => {
      const { data: progress } = await deps.getProcessingProgress(campagna.id)
      return [campagna.id, progress] as const
    })
  )

  return {
    campagne,
    processingJobMap,
    processingProgressMap: Object.fromEntries(progressEntries),
    uploadJobs: uploadJobsResult.data ?? [],
    interrupted: buildInterruptedProgrammazioni({
      campagne,
      processingJobMap,
      processingProgressMap: Object.fromEntries(progressEntries),
      now: deps.now,
    }),
    error: processingJobsResult.error ?? uploadJobsResult.error ?? null,
  }
}

export function createCoalescedOperationalSnapshotLoader(
  deps: ProgrammazioniOperationalSnapshotDeps
): { load: () => Promise<ProgrammazioniOperationalSnapshot> } {
  let inFlight: Promise<ProgrammazioniOperationalSnapshot> | null = null

  return {
    load: () => {
      if (!inFlight) {
        inFlight = loadProgrammazioniOperationalSnapshot(deps).finally(() => {
          inFlight = null
        })
      }
      return inFlight
    },
  }
}

function buildProcessingJobMap(
  jobs: ProcessingActivityJob[]
): Record<string, ProcessingActivityJob | null> {
  const map: Record<string, ProcessingActivityJob | null> = {}
  for (const job of jobs) {
    if (job.campagne_programmazione_id) {
      map[job.campagne_programmazione_id] = job
    }
  }
  return map
}

function emptySnapshot(error: unknown): ProgrammazioniOperationalSnapshot {
  return {
    campagne: [],
    processingJobMap: {},
    processingProgressMap: {},
    uploadJobs: [],
    interrupted: [],
    error,
  }
}

function buildInterruptedProgrammazioni({
  campagne,
  processingJobMap,
  processingProgressMap,
  now,
}: {
  campagne: CampagnaProgrammazione[]
  processingJobMap: Record<string, ProcessingActivityJob | null>
  processingProgressMap: Record<string, ProcessingProgress | null>
  now?: number
}): InterruptedProgrammazioneSnapshot[] {
  return campagne.flatMap(campagna => {
    if (campagna.stato !== 'in_corso') return []

    const progress = processingProgressMap[campagna.id] ?? null
    const state = classifyProcessingOperationalState({
      datasetStatus: campagna.stato,
      campaignJob: processingJobMap[campagna.id],
      progress,
      hasLocalRuntimeProcess: false,
      now,
    })
    const isInterrupted =
      state === 'stale' ||
      state === 'recoverable_unknown' ||
      state === 'error_recent' ||
      state === 'error_old'

    if (!isInterrupted) return []

    return [{
      id: campagna.id,
      nome: campagna.nome,
      programmazioni_totali: progress?.programmazioni_totali ?? campagna.programmazioni_count ?? 0,
      individuazioni_create: progress?.individuazioni_create ?? 0,
      minutesSinceActivity: minutesSinceActivity(progress?.last_activity_at ?? null, now),
    }]
  })
}

function minutesSinceActivity(lastActivityAt: string | null, now = Date.now()): number | null {
  if (!lastActivityAt) return null
  const lastActivityTime = new Date(lastActivityAt).getTime()
  if (Number.isNaN(lastActivityTime)) return null
  return Math.max(0, Math.floor((now - lastActivityTime) / 60000))
}
