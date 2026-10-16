/**
 * Registro in memoria dei job di individuazione che girano in questo processo.
 *
 * Serve allo spegnimento ordinato: quando Railway invia SIGTERM (deploy) il
 * worker sa quali job stava eseguendo, li rimette in coda per la ripresa
 * automatica e impedisce ai runner di sovrascrivere quello stato.
 */

export interface ActiveJobEntry {
  jobId: string
  campagneIndividuazioneId: string | null
}

const activeJobs = new Map<string, ActiveJobEntry>()
let shutdownRequested = false

export function registerActiveJob(jobId: string): void {
  activeJobs.set(jobId, { jobId, campagneIndividuazioneId: null })
}

export function setActiveJobCampagnaIndividuazione(
  jobId: string,
  campagneIndividuazioneId: string
): void {
  const entry = activeJobs.get(jobId)
  if (entry) entry.campagneIndividuazioneId = campagneIndividuazioneId
}

export function unregisterActiveJob(jobId: string): void {
  activeJobs.delete(jobId)
}

export function isShutdownRequested(): boolean {
  return shutdownRequested
}

/** Segna lo spegnimento e restituisce i job ancora in corso in questo processo. */
export function requestShutdown(): ActiveJobEntry[] {
  shutdownRequested = true
  return [...activeJobs.values()].map((entry) => ({ ...entry }))
}

/** Solo per i test. */
export function resetActiveJobsForTests(): void {
  activeJobs.clear()
  shutdownRequested = false
}
