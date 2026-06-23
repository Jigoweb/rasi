import { supabaseService } from '../supabase.js'
import type { UploadMappingSnapshot } from './programmazioni-import-core.js'

const TABLE = 'upload_jobs'
const STALE_UPLOAD_ERROR =
  'Upload interrotto dal riavvio del worker. Riprova il caricamento.'

export interface UploadJob {
  id: string
  campagna_programmazione_id: string
  storage_path: string
  file_name: string
  file_type: string
  mapping_snapshot: UploadMappingSnapshot
  stato: 'queued' | 'running' | 'completed' | 'error' | 'cancelled'
  fase: string | null
  righe_totali: number
  righe_processate: number
  righe_inserite: number
  righe_duplicate_saltate: number
  current_chunk: number
  total_chunks: number
  chunk_size: number
  error: string | null
  quality_report: Record<string, unknown> | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface NewUploadJob {
  campagna_programmazione_id: string
  storage_path: string
  file_name: string
  file_type: string
  mapping_snapshot: UploadMappingSnapshot
  chunk_size: number
  created_by: string | null
}

export async function createUploadJob(input: NewUploadJob): Promise<UploadJob> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .insert({
      ...input,
      stato: 'queued',
      fase: 'queued',
    })
    .select('*')
    .single()

  if (error) throw new Error(`createUploadJob: ${error.message}`)
  return data as UploadJob
}

export async function getUploadJobForUser(id: string, userId: string): Promise<UploadJob | null> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .eq('created_by', userId)
    .maybeSingle()

  if (error) throw new Error(`getUploadJobForUser: ${error.message}`)
  return (data as UploadJob) ?? null
}

export async function findActiveUploadJob(
  campagneProgrammazioneId: string
): Promise<UploadJob | null> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .select('*')
    .eq('campagna_programmazione_id', campagneProgrammazioneId)
    .in('stato', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`findActiveUploadJob: ${error.message}`)
  return (data as UploadJob) ?? null
}

export async function userOwnsCampagnaEmittente(
  campagneProgrammazioneId: string,
  emittenteId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabaseService
    .from('campagne_programmazione')
    .select('id')
    .eq('id', campagneProgrammazioneId)
    .eq('emittente_id', emittenteId)
    .eq('created_by', userId)
    .maybeSingle()

  if (error) throw new Error(`userOwnsCampagnaEmittente: ${error.message}`)
  return Boolean(data?.id)
}

export async function patchUploadJob(
  id: string,
  patch: Partial<Omit<UploadJob, 'id' | 'created_at'>>
): Promise<void> {
  const { error } = await supabaseService
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`patchUploadJob: ${error.message}`)
}

export async function findStaleActiveUploadJobs(cutoffIso: string): Promise<UploadJob[]> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .select('*')
    .in('stato', ['queued', 'running'])
    .lt('updated_at', cutoffIso)

  if (error) throw new Error(`findStaleActiveUploadJobs: ${error.message}`)
  return (data as UploadJob[]) ?? []
}

export async function markStaleActiveUploadJobAsError(
  job: UploadJob,
  cutoffIso: string,
  now = new Date()
): Promise<boolean> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .update({
      stato: 'error',
      fase: 'error',
      error: STALE_UPLOAD_ERROR,
      updated_at: now.toISOString(),
    })
    .eq('id', job.id)
    .in('stato', ['queued', 'running'])
    .lt('updated_at', cutoffIso)
    .select('id')

  if (error) throw new Error(`markStaleActiveUploadJobAsError: ${error.message}`)
  const marked = ((data as Array<Pick<UploadJob, 'id'>> | null) ?? []).length > 0
  if (!marked) return false

  await supabaseService
    .from('campagne_programmazione')
    .update({
      stato: 'in_review',
      processing_by: null,
      processing_started_at: null,
      updated_at: now.toISOString(),
    })
    .eq('id', job.campagna_programmazione_id)
    .eq('stato', 'uploading')

  return true
}
