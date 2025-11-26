import { supabase } from '@/shared/lib/supabase'

export interface CampagnaProgrammazionePayload {
  emittente_id: string
  anno: number
  nome: string
  stato?: string
  created_by?: string
}

export interface CampagnaProgrammazione {
  id: string
  emittente_id: string
  anno: number
  nome: string
  stato: string
  created_at: string
  created_by: string | null
  emittenti?: {
    nome: string
  }
}

export const getCampagneProgrammazione = async () => {
  const { data, error } = await supabase
    .from('campagne_programmazione' as any)
    .select('*, emittenti(nome)')
    .order('created_at', { ascending: false })

  return { data: (data as unknown) as CampagnaProgrammazione[], error }
}

export const createCampagnaProgrammazione = async (payload: CampagnaProgrammazionePayload) => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  const payloadWithUser = {
    ...payload,
    stato: 'bozza',
    created_by: user?.id
  }

  const { data, error } = await supabase
    .from('campagne_programmazione' as any) // Type assertion until schema is updated
    .insert([payloadWithUser])
    .select()
    .single()

  return { data, error }
}

export interface ProgrammazionePayload {
  campagna_programmazione_id: string
  emittente_id: string
  titolo: string
  tipo: string
  data_trasmissione?: string
  ora_inizio?: string
  ora_fine?: string
  durata_minuti?: number
  titolo_originale?: string
  numero_episodio?: number
  titolo_episodio?: string
  titolo_episodio_originale?: string
  numero_stagione?: number
  anno?: number
  production?: string
  regia?: string
  data_inizio?: string
  data_fine?: string
  retail_price?: number
  sales_month?: number
  track_price_local_currency?: number
  views?: number
  total_net_ad_revenue?: number
  total_revenue?: number
  canale?: string
  emittente?: string
  descrizione?: string
}

export const uploadProgrammazioni = async (programmazioni: ProgrammazionePayload[]) => {
  const { data, error } = await supabase
    .from('programmazioni')
    .insert(programmazioni as any)
    .select()

  return { data, error }
}

export const updateCampagnaStatus = async (id: string, stato: string) => {
  const { data, error } = await supabase
    .from('campagne_programmazione' as any)
    .update({ stato })
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

export const deleteCampagnaProgrammazione = async (id: string) => {
  const { data, error } = await supabase
    .from('campagne_programmazione' as any)
    .delete()
    .eq('id', id)
    .select()

  return { data, error }
}

export const getCampagnaProgrammazioneById = async (id: string) => {
  const { data, error } = await supabase
    .from('campagne_programmazione' as any)
    .select('*, emittenti(nome)')
    .eq('id', id)
    .single()

  return { data: (data as unknown) as CampagnaProgrammazione, error }
}

export interface ProgrammazioneRow {
  id: string
  campagna_programmazione_id: string
  emittente_id: string
  data_trasmissione: string
  ora_inizio: string
  ora_fine?: string | null
  durata_minuti?: number | null
  titolo: string
  descrizione?: string | null
  fascia_oraria?: string | null
  tipo_trasmissione?: string | null
  tipo?: string | null
  canale?: string | null
  emittente?: string | null
  processato: boolean
  errori_processamento?: any | null
  created_at: string
}

export interface ListProgrammazioniOptions {
  q?: string
  processato?: boolean
  fromDate?: string
  toDate?: string
}

export interface ProgrammazioniCursor {
  created_at: string
  id: string
}

export const listProgrammazioniByCampagnaKeyset = async (
  campagnaId: string,
  limit = 200,
  cursor?: ProgrammazioniCursor,
  options?: ListProgrammazioniOptions
) => {
  let query = supabase
    .from('programmazioni' as any)
    .select('*')
    .eq('campagna_programmazione_id', campagnaId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)

  if (cursor?.created_at) {
    query = query.lt('created_at', cursor.created_at)
  }

  if (options?.q) {
    query = query.ilike('titolo', `%${options.q}%`)
  }

  if (typeof options?.processato === 'boolean') {
    query = query.eq('processato', options.processato)
  }

  if (options?.fromDate) {
    query = query.gte('data_trasmissione', options.fromDate)
  }
  if (options?.toDate) {
    query = query.lte('data_trasmissione', options.toDate)
  }

  const { data, error } = await query

  const rows = (data as unknown) as ProgrammazioneRow[]
  const nextCursor = rows && rows.length > 0 ? { created_at: rows[rows.length - 1].created_at, id: rows[rows.length - 1].id } : undefined
  return { data: rows, nextCursor, error }
}

export interface ProgrammazioniHealth {
  total: number
  processed: number
  unprocessed: number
  missing_title: number
  missing_duration: number
  errors_count: number
  date_min?: string
  date_max?: string
}

export const getProgrammazioniHealth = async (campagnaId: string) => {
  const totalRes = await supabase
    .from('programmazioni' as any)
    .select('*', { count: 'exact', head: true })
    .eq('campagna_programmazione_id', campagnaId)

  const processedRes = await supabase
    .from('programmazioni' as any)
    .select('*', { count: 'exact', head: true })
    .eq('campagna_programmazione_id', campagnaId)
    .eq('processato', true)

  const unprocessedRes = await supabase
    .from('programmazioni' as any)
    .select('*', { count: 'exact', head: true })
    .eq('campagna_programmazione_id', campagnaId)
    .eq('processato', false)

  const missingTitleRes = await supabase
    .from('programmazioni' as any)
    .select('*', { count: 'exact', head: true })
    .eq('campagna_programmazione_id', campagnaId)
    .is('titolo', null)

  const missingDurationRes = await supabase
    .from('programmazioni' as any)
    .select('*', { count: 'exact', head: true })
    .eq('campagna_programmazione_id', campagnaId)
    .is('durata_minuti', null)

  const errorsRes = await supabase
    .from('programmazioni' as any)
    .select('*', { count: 'exact', head: true })
    .eq('campagna_programmazione_id', campagnaId)
    .not('errori_processamento', 'is', null)

  const rangeRes = await supabase
    .from('programmazioni' as any)
    .select('min:data_trasmissione.min,max:data_trasmissione.max')
    .eq('campagna_programmazione_id', campagnaId)
    .limit(1)

  const rangeRow = (rangeRes.data as any)?.[0] || {}

  const health: ProgrammazioniHealth = {
    total: totalRes.count || 0,
    processed: processedRes.count || 0,
    unprocessed: unprocessedRes.count || 0,
    missing_title: missingTitleRes.count || 0,
    missing_duration: missingDurationRes.count || 0,
    errors_count: errorsRes.count || 0,
    date_min: rangeRow?.min || undefined,
    date_max: rangeRow?.max || undefined,
  }

  return { data: health, error: totalRes.error || processedRes.error || unprocessedRes.error || missingTitleRes.error || missingDurationRes.error || errorsRes.error || rangeRes.error }
}
