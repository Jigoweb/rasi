import { findStaleActiveJobs, markStaleActiveJobAsError } from './store.js'
import {
  findStaleActiveUploadJobs,
  markStaleActiveUploadJobAsError,
} from './upload-job-store.js'

const STALE_JOB_CUTOFF_MS = 30 * 60 * 1000

export async function markStaleActiveJobsAsError(now = new Date()): Promise<number> {
  const cutoffIso = new Date(now.getTime() - STALE_JOB_CUTOFF_MS).toISOString()
  const staleJobs = await findStaleActiveJobs(cutoffIso)
  let markedCount = 0

  for (const job of staleJobs) {
    const marked = await markStaleActiveJobAsError(job.id, cutoffIso, now)
    if (marked) markedCount += 1
  }

  return markedCount
}

export async function markStaleActiveUploadJobsAsError(now = new Date()): Promise<number> {
  const cutoffIso = new Date(now.getTime() - STALE_JOB_CUTOFF_MS).toISOString()
  const staleJobs = await findStaleActiveUploadJobs(cutoffIso)
  let markedCount = 0

  for (const job of staleJobs) {
    const marked = await markStaleActiveUploadJobAsError(job, cutoffIso, now)
    if (marked) markedCount += 1
  }

  return markedCount
}
