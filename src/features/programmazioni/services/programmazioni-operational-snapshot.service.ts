import type {
  CampagnaProgrammazione,
  ProcessingActivityJob,
  ProcessingProgress,
} from './programmazioni.service'
import type { UploadJobSnapshot } from './programmazioni-upload-worker.service'

type AsyncResult<T> = Promise<{ data: T | null; error: unknown }>

export interface ProgrammazioniOperationalSnapshotDeps {
  workerMode: boolean
  getCampagneProgrammazione: () => AsyncResult<CampagnaProgrammazione[]>
  getLatestProcessingJobsForCampagne: (campagneIds: string[]) => AsyncResult<ProcessingActivityJob[]>
  getLatestUploadJobsForCampagne: (campagneIds: string[]) => AsyncResult<UploadJobSnapshot[]>
  getProcessingProgress: (campagnaId: string) => AsyncResult<ProcessingProgress | null>
}

export interface ProgrammazioniOperationalSnapshot {
  campagne: CampagnaProgrammazione[]
  processingJobMap: Record<string, ProcessingActivityJob | null>
  processingProgressMap: Record<string, ProcessingProgress | null>
  uploadJobs: UploadJobSnapshot[]
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
    error,
  }
}
