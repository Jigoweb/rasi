import { requestShutdown, isShutdownRequested } from './active-jobs.js'
import { runIndividuazioneJob, type RunOptions } from './individuazione-runner.js'
import {
  INTERRUPTED_DURING_INIT_ERROR,
  claimInterruptedJob,
  findInterruptedJobs,
  markJobAsError,
  markJobInterrupted,
  parseJobOpzioni,
} from './store.js'

/**
 * Attesa prima di riprendere un job interrotto. Copre la sovrapposizione dei
 * container durante un deploy: l'ultima RPC del vecchio worker può ancora
 * girare su Postgres (fino allo statement_timeout di 8s).
 */
export const AUTO_RESUME_GRACE_MS = 60 * 1000

/**
 * Allo spegnimento (SIGTERM da deploy Railway) rimette in coda i job in corso.
 * Un job senza run di individuazione ancora creato non si può riprendere:
 * viene chiuso in errore con un messaggio che chiede di rilanciarlo.
 */
export async function interruptActiveJobs(now = new Date()): Promise<number> {
  const jobs = requestShutdown()
  const results = await Promise.allSettled(
    jobs.map((job) =>
      job.campagneIndividuazioneId
        ? markJobInterrupted(job.jobId, now)
        : markJobAsError(job.jobId, INTERRUPTED_DURING_INIT_ERROR, now)
    )
  )

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('[rasi-worker] marcatura job interrotto fallita', result.reason)
    }
  }
  return results.filter((result) => result.status === 'fulfilled').length
}

/**
 * Riprende i job rimessi in coda da uno spegnimento, sulla stessa riga
 * `campaign_jobs`: il browser che faceva polling vede il job ripartire.
 */
export async function resumeInterruptedJobs(
  now = new Date(),
  run: (opts: RunOptions) => Promise<void> = runIndividuazioneJob
): Promise<number> {
  if (isShutdownRequested()) return 0

  const cutoffIso = new Date(now.getTime() - AUTO_RESUME_GRACE_MS).toISOString()
  const jobs = await findInterruptedJobs(cutoffIso)
  let resumed = 0

  for (const job of jobs) {
    if (isShutdownRequested()) break

    if (!job.created_by || !job.campagne_individuazione_id) {
      await markJobAsError(job.id, INTERRUPTED_DURING_INIT_ERROR, now)
      continue
    }

    if (!(await claimInterruptedJob(job.id, now))) continue

    const opzioni = parseJobOpzioni(job.opzioni)
    void run({
      jobId: job.id,
      campagneProgrammazioneId: job.campagne_programmazione_id,
      campagneIndividuazioneId: job.campagne_individuazione_id,
      userId: job.created_by,
      resume: true,
      sogliaItolo: opzioni?.soglia_titolo,
      artistaIds: opzioni?.artista_ids ?? null,
      mandatoOverrideArtistIds: opzioni?.mandato_override_artist_ids ?? null,
    })
    resumed += 1
  }

  return resumed
}
