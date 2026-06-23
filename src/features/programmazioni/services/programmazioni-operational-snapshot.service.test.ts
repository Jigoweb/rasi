import {
  createCoalescedOperationalSnapshotLoader,
  loadProgrammazioniOperationalSnapshot,
} from './programmazioni-operational-snapshot.service'
import type { CampagnaProgrammazione, ProcessingProgress } from './programmazioni.service'
import type { UploadJobSnapshot } from './programmazioni-upload-worker.service'

const campaign = (overrides: Partial<CampagnaProgrammazione>): CampagnaProgrammazione => ({
  id: 'campagna-1',
  emittente_id: 'emittente-1',
  anno: 2026,
  nome: 'Campagna',
  descrizione: null,
  stato: 'in_review',
  created_at: '2026-06-23T10:00:00.000Z',
  created_by: 'user-1',
  programmazioni_count: 10,
  ...overrides,
})

const progress = (overrides: Partial<ProcessingProgress> = {}): ProcessingProgress => ({
  programmazioni_processate: 0,
  programmazioni_totali: 10,
  individuazioni_create: 0,
  percentuale: 0,
  last_activity_at: null,
  activity_source: 'unknown',
  job_id: null,
  job_stato: null,
  job_updated_at: null,
  ...overrides,
})

const uploadJob = (overrides: Partial<UploadJobSnapshot> = {}): UploadJobSnapshot => ({
  id: 'upload-job-1',
  campagna_programmazione_id: 'campagna-uploading',
  stato: 'running',
  fase: 'insert',
  righe_totali: 100,
  righe_processate: 25,
  righe_inserite: 25,
  righe_duplicate_saltate: 0,
  current_chunk: 1,
  total_chunks: 4,
  error: null,
  ...overrides,
})

describe('loadProgrammazioniOperationalSnapshot', () => {
  it('loads campaigns and operational jobs in batch', async () => {
    const campagne = [
      campaign({ id: 'campagna-running', stato: 'in_corso' }),
      campaign({ id: 'campagna-uploading', stato: 'uploading' }),
      campaign({ id: 'campagna-review', stato: 'in_review' }),
    ]
    const getCampagneProgrammazione = jest.fn().mockResolvedValue({ data: campagne, error: null })
    const getLatestProcessingJobsForCampagne = jest.fn().mockResolvedValue({
      data: [{
        id: 'job-1',
        campagne_programmazione_id: 'campagna-running',
        stato: 'running',
        updated_at: '2026-06-23T10:01:00.000Z',
        error: null,
      }],
      error: null,
    })
    const getLatestUploadJobsForCampagne = jest.fn().mockResolvedValue({
      data: [uploadJob()],
      error: null,
    })
    const getProcessingProgress = jest.fn()

    const snapshot = await loadProgrammazioniOperationalSnapshot({
      workerMode: true,
      getCampagneProgrammazione,
      getLatestProcessingJobsForCampagne,
      getLatestUploadJobsForCampagne,
      getProcessingProgress,
    })

    expect(snapshot.campagne).toBe(campagne)
    expect(snapshot.processingJobMap['campagna-running']?.id).toBe('job-1')
    expect(snapshot.uploadJobs).toHaveLength(1)
    expect(getLatestProcessingJobsForCampagne).toHaveBeenCalledWith([
      'campagna-running',
      'campagna-uploading',
      'campagna-review',
    ])
    expect(getLatestUploadJobsForCampagne).toHaveBeenCalledWith(['campagna-uploading'])
    expect(getProcessingProgress).not.toHaveBeenCalled()
  })

  it('loads progress only for in_corso campaigns without an operational job', async () => {
    const campagne = [
      campaign({ id: 'campagna-orphan', stato: 'in_corso' }),
      campaign({ id: 'campagna-running', stato: 'in_corso' }),
    ]
    const getProcessingProgress = jest.fn().mockResolvedValue({
      data: progress({ last_activity_at: null }),
      error: null,
    })

    const snapshot = await loadProgrammazioniOperationalSnapshot({
      workerMode: true,
      getCampagneProgrammazione: jest.fn().mockResolvedValue({ data: campagne, error: null }),
      getLatestProcessingJobsForCampagne: jest.fn().mockResolvedValue({
        data: [{
          id: 'job-running',
          campagne_programmazione_id: 'campagna-running',
          stato: 'running',
          updated_at: '2026-06-23T10:01:00.000Z',
          error: null,
        }],
        error: null,
      }),
      getLatestUploadJobsForCampagne: jest.fn().mockResolvedValue({ data: [], error: null }),
      getProcessingProgress,
    })

    expect(getProcessingProgress).toHaveBeenCalledTimes(1)
    expect(getProcessingProgress).toHaveBeenCalledWith('campagna-orphan')
    expect(snapshot.processingProgressMap['campagna-orphan']).toMatchObject({
      programmazioni_totali: 10,
    })
    expect(snapshot.processingProgressMap['campagna-running']).toBeUndefined()
  })

  it('derives interrupted campaigns from the same operational snapshot', async () => {
    const now = Date.parse('2026-06-23T12:00:00.000Z')
    const campagne = [
      campaign({ id: 'campagna-unknown', nome: 'Unknown', stato: 'in_corso', programmazioni_count: 30 }),
      campaign({ id: 'campagna-running', nome: 'Running', stato: 'in_corso', programmazioni_count: 40 }),
      campaign({ id: 'campagna-error', nome: 'Error', stato: 'in_corso', programmazioni_count: 50 }),
    ]
    const getProcessingProgress = jest.fn().mockResolvedValue({
      data: progress({
        programmazioni_totali: 30,
        individuazioni_create: 3,
        last_activity_at: null,
      }),
      error: null,
    })

    const snapshot = await loadProgrammazioniOperationalSnapshot({
      workerMode: true,
      now,
      getCampagneProgrammazione: jest.fn().mockResolvedValue({ data: campagne, error: null }),
      getLatestProcessingJobsForCampagne: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'job-running',
            campagne_programmazione_id: 'campagna-running',
            stato: 'running',
            updated_at: '2026-06-23T11:59:00.000Z',
            error: null,
          },
          {
            id: 'job-error',
            campagne_programmazione_id: 'campagna-error',
            stato: 'error',
            updated_at: '2026-06-23T11:40:00.000Z',
            error: 'statement timeout',
          },
        ],
        error: null,
      }),
      getLatestUploadJobsForCampagne: jest.fn().mockResolvedValue({ data: [], error: null }),
      getProcessingProgress,
    })

    expect(snapshot.interrupted).toEqual([
      {
        id: 'campagna-unknown',
        nome: 'Unknown',
        programmazioni_totali: 30,
        individuazioni_create: 3,
        minutesSinceActivity: null,
      },
      {
        id: 'campagna-error',
        nome: 'Error',
        programmazioni_totali: 50,
        individuazioni_create: 0,
        minutesSinceActivity: null,
      },
    ])
    expect(snapshot.processingJobMap['campagna-running']?.stato).toBe('running')
  })
})

describe('createCoalescedOperationalSnapshotLoader', () => {
  it('reuses one in-flight snapshot request for concurrent refreshes', async () => {
    let resolveCampagne: (value: { data: CampagnaProgrammazione[]; error: null }) => void = () => {}
    const getCampagneProgrammazione = jest.fn().mockImplementation(() => new Promise(resolve => {
      resolveCampagne = resolve
    }))
    const loader = createCoalescedOperationalSnapshotLoader({
      workerMode: false,
      getCampagneProgrammazione,
      getLatestProcessingJobsForCampagne: jest.fn(),
      getLatestUploadJobsForCampagne: jest.fn(),
      getProcessingProgress: jest.fn(),
    })

    const first = loader.load()
    const second = loader.load()
    resolveCampagne({ data: [campaign({})], error: null })

    const [firstSnapshot, secondSnapshot] = await Promise.all([first, second])

    expect(getCampagneProgrammazione).toHaveBeenCalledTimes(1)
    expect(firstSnapshot).toBe(secondSnapshot)
  })
})
