import { supabaseService } from '../supabase.js'

/**
 * Stato di un job di elaborazione, persistito su tabella `campaign_jobs`.
 * Il browser fa polling di questa riga per mostrare l'avanzamento; sopravvive
 * ai restart del container Railway.
 */
export interface CampaignJob {
  id: string
  tipo: 'individuazione' | 'programmazione'
  stato: 'queued' | 'running' | 'completed' | 'error' | 'cancelled'
  fase: string | null
  campagne_programmazione_id: string
  campagne_individuazione_id: string | null
  programmazioni_totali: number
  programmazioni_processate: number
  individuazioni_create: number
  current_chunk: number
  total_chunks: number
  error: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  opzioni?: IndividuazioneJobOpzioni | null
  interrotto_at?: string | null
}

/** Opzioni di un run di individuazione, riusate da "Riprendi" e dalla ripresa automatica. */
export interface IndividuazioneJobOpzioni {
  soglia_titolo: number
  artista_ids: string[] | null
  mandato_override_artist_ids: string[] | null
}

export type NewJob = {
  tipo: CampaignJob['tipo']
  campagne_programmazione_id: string
  created_by: string | null
  opzioni?: IndividuazioneJobOpzioni | null
}

const TABLE = 'campaign_jobs'
const STALE_JOB_ERROR =
  'Job interrotto dal riavvio del worker. Usa Riprendi per continuare.'
export const INTERRUPTED_DURING_INIT_ERROR =
  "Job interrotto dal riavvio del worker durante l'avvio. Rilancia l'individuazione."
const CAMPAIGN_OPERATOR_ROLES = new Set(['admin', 'operatore'])

export async function createJob(input: NewJob): Promise<CampaignJob> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .insert({
      tipo: input.tipo,
      stato: 'queued',
      fase: 'init',
      campagne_programmazione_id: input.campagne_programmazione_id,
      created_by: input.created_by,
      ...(input.opzioni ? { opzioni: input.opzioni } : {}),
    })
    .select('*')
    .single()

  if (error) throw new Error(`createJob: ${error.message}`)
  return data as CampaignJob
}

export async function getJob(id: string): Promise<CampaignJob | null> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`getJob: ${error.message}`)
  return (data as CampaignJob) ?? null
}

export async function getJobForUser(id: string, userId: string): Promise<CampaignJob | null> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .eq('created_by', userId)
    .maybeSingle()

  if (error) throw new Error(`getJobForUser: ${error.message}`)
  return (data as CampaignJob) ?? null
}

export async function userOwnsCampagnaProgrammazione(
  campagneProgrammazioneId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabaseService
    .from('campagne_programmazione')
    .select('id')
    .eq('id', campagneProgrammazioneId)
    .eq('created_by', userId)
    .maybeSingle()

  if (error) throw new Error(`userOwnsCampagnaProgrammazione: ${error.message}`)
  return Boolean(data?.id)
}

export async function userCanManageCampagnaProgrammazione(
  campagneProgrammazioneId: string,
  userId: string,
  userRole: string | null | undefined
): Promise<boolean> {
  const query = supabaseService
    .from('campagne_programmazione')
    .select('id')
    .eq('id', campagneProgrammazioneId)

  if (!CAMPAIGN_OPERATOR_ROLES.has(userRole ?? '')) {
    query.eq('created_by', userId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) throw new Error(`userCanManageCampagnaProgrammazione: ${error.message}`)
  return Boolean(data?.id)
}

/**
 * Aggiorna parzialmente un job. `updated_at` viene sempre rinfrescato.
 */
export async function patchJob(
  id: string,
  patch: Partial<Omit<CampaignJob, 'id' | 'created_at'>>
): Promise<void> {
  const { error } = await supabaseService
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`patchJob: ${error.message}`)
}

/**
 * Esiste già un job attivo (queued/running) per questa campagna?
 * Evita doppi avvii concorrenti dallo stesso o da più client.
 */
export async function findActiveJob(
  campagneProgrammazioneId: string
): Promise<CampaignJob | null> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .select('*')
    .eq('campagne_programmazione_id', campagneProgrammazioneId)
    .in('stato', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`findActiveJob: ${error.message}`)
  return (data as CampaignJob) ?? null
}

export async function findStaleActiveJobs(cutoffIso: string): Promise<CampaignJob[]> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .select('*')
    .in('stato', ['queued', 'running'])
    .lt('updated_at', cutoffIso)

  if (error) throw new Error(`findStaleActiveJobs: ${error.message}`)
  return (data as CampaignJob[]) ?? []
}

export async function markStaleActiveJobAsError(
  jobId: string,
  cutoffIso: string,
  now = new Date()
): Promise<boolean> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .update({
      stato: 'error',
      fase: 'error',
      error: STALE_JOB_ERROR,
      updated_at: now.toISOString(),
    })
    .eq('id', jobId)
    .in('stato', ['queued', 'running'])
    .lt('updated_at', cutoffIso)
    .select('id')

  if (error) throw new Error(`markStaleActiveJobAsError: ${error.message}`)
  return ((data as Array<Pick<CampaignJob, 'id'>> | null) ?? []).length > 0
}

/** Legge le opzioni di un job, ignorando valori malformati. */
export function parseJobOpzioni(raw: unknown): IndividuazioneJobOpzioni | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = raw as Record<string, unknown>
  const soglia = typeof value.soglia_titolo === 'number' ? value.soglia_titolo : Number(value.soglia_titolo)
  const toIds = (ids: unknown): string[] | null =>
    Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : null

  return {
    soglia_titolo: Number.isFinite(soglia) && soglia > 0 ? soglia : 0.7,
    artista_ids: toIds(value.artista_ids),
    mandato_override_artist_ids: toIds(value.mandato_override_artist_ids),
  }
}

/**
 * Ultimo job che ha lavorato su un run di individuazione: da qui "Riprendi"
 * eredita opzioni e contatori invece di ripartire senza filtri e da zero.
 */
export async function getLatestJobForCampagnaIndividuazione(
  campagneIndividuazioneId: string
): Promise<CampaignJob | null> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .select('*')
    .eq('campagne_individuazione_id', campagneIndividuazioneId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`getLatestJobForCampagnaIndividuazione: ${error.message}`)
  return (data as CampaignJob) ?? null
}

/**
 * Rimette in coda un job interrotto da SIGTERM: resta 'queued' (la UI continua
 * il polling) e il worker successivo lo riprende sulla stessa riga.
 */
export async function markJobInterrupted(jobId: string, now = new Date()): Promise<void> {
  const { error } = await supabaseService
    .from(TABLE)
    .update({
      stato: 'queued',
      interrotto_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', jobId)
    .in('stato', ['queued', 'running'])

  if (error) throw new Error(`markJobInterrupted: ${error.message}`)
}

/** Chiude in errore un job interrotto che non si può riprendere da solo. */
export async function markJobAsError(jobId: string, message: string, now = new Date()): Promise<void> {
  const { error } = await supabaseService
    .from(TABLE)
    .update({
      stato: 'error',
      fase: 'error',
      error: message,
      interrotto_at: null,
      updated_at: now.toISOString(),
    })
    .eq('id', jobId)
    .in('stato', ['queued', 'running'])

  if (error) throw new Error(`markJobAsError: ${error.message}`)
}

/** Job di individuazione rimessi in coda da uno spegnimento prima di `cutoffIso`. */
export async function findInterruptedJobs(cutoffIso: string): Promise<CampaignJob[]> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .select('*')
    .eq('tipo', 'individuazione')
    .eq('stato', 'queued')
    .not('interrotto_at', 'is', null)
    .lt('interrotto_at', cutoffIso)

  if (error) throw new Error(`findInterruptedJobs: ${error.message}`)
  return (data as CampaignJob[]) ?? []
}

/**
 * Presa in carico atomica di un job interrotto: solo un worker la ottiene
 * anche se due container (deploy sovrapposti) controllano insieme.
 */
export async function claimInterruptedJob(jobId: string, now = new Date()): Promise<boolean> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .update({
      stato: 'running',
      interrotto_at: null,
      updated_at: now.toISOString(),
    })
    .eq('id', jobId)
    .eq('stato', 'queued')
    .not('interrotto_at', 'is', null)
    .select('id')

  if (error) throw new Error(`claimInterruptedJob: ${error.message}`)
  return ((data as Array<Pick<CampaignJob, 'id'>> | null) ?? []).length > 0
}
