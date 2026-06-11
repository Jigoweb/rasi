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
}

export type NewJob = {
  tipo: CampaignJob['tipo']
  campagne_programmazione_id: string
  created_by: string | null
}

const TABLE = 'campaign_jobs'

export async function createJob(input: NewJob): Promise<CampaignJob> {
  const { data, error } = await supabaseService
    .from(TABLE)
    .insert({
      tipo: input.tipo,
      stato: 'queued',
      fase: 'init',
      campagne_programmazione_id: input.campagne_programmazione_id,
      created_by: input.created_by,
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
