import { supabase } from '@/shared/lib/supabase'

export interface CampagnaIndividuazione {
  id: string
  nome: string
  descrizione?: string
  emittente_id: string
  campagne_programmazione_id: string
  anno: number
  configurazione_matching?: any
  stato: 'bozza' | 'in_corso' | 'completata' | 'archiviata'
  statistiche?: {
    programmazioni_totali?: number
    programmazioni_processate?: number
    programmazioni_con_match?: number
    programmazioni_senza_match?: number
    individuazioni_create?: number
    artisti_distinti?: number
    opere_distinte?: number
    tempo_processamento_ms?: number
    data_completamento?: string
  }
  created_at: string
  updated_at?: string
  emittenti?: { nome: string }
  campagne_programmazione?: { nome: string }
  individuazioni_count?: number
}

export interface Individuazione {
  id: string
  campagna_individuazioni_id: string
  programmazione_id: string
  partecipazione_id: string
  artista_id: string
  ruolo_id: string
  opera_id: string
  episodio_id?: string
  emittente_id: string
  
  // Dati trasmissione (snapshot)
  data_trasmissione?: string
  ora_inizio?: string
  ora_fine?: string
  durata_minuti?: number
  canale?: string
  emittente?: string
  tipo?: string
  titolo?: string
  titolo_originale?: string
  numero_episodio?: number
  titolo_episodio?: string
  titolo_episodio_originale?: string
  numero_stagione?: number
  anno?: number
  production?: string
  regia?: string
  
  // Matching
  punteggio_matching: number
  dettagli_matching?: any
  metodo?: 'automatico' | 'manuale' | 'suggerito'
  stato?: 'individuato' | 'validato' | 'rifiutato' | 'in_revisione'
  
  // Validazione
  validato_da?: string
  validato_il?: string
  note_validazione?: string
  
  created_at: string
  
  // Relazioni
  artisti?: { nome: string; cognome: string; nome_arte?: string }
  opere?: { titolo: string; titolo_originale?: string }
  ruoli_tipologie?: { nome: string }
}

// ============================================
// CAMPAGNE INDIVIDUAZIONE
// ============================================

export const getCampagneIndividuazione = async () => {
  try {
  const { data, error } = await (supabase as any)
    .from('campagne_individuazione')
    .select(`
      *,
      emittenti(nome),
        campagne_programmazione(nome)
    `)
    .order('created_at', { ascending: false })

    if (error) {
      console.error('[getCampagneIndividuazione] Query error:', error)
      return { data: null, error }
    }

    if (!data || data.length === 0) {
      return { data: [], error: null }
    }

    // Fetch all counts in a single batch query using IN clause
    const campagnaIds = data.map((item: any) => item.id)
    
    // Get counts for all campagne at once
    const { data: countsData, error: countsError } = await (supabase as any)
      .from('individuazioni')
      .select('campagna_individuazioni_id')
      .in('campagna_individuazioni_id', campagnaIds)

    // Create a map of counts
    const countsMap = new Map<string, number>()
    if (countsData && !countsError) {
      countsData.forEach((item: any) => {
        const id = item.campagna_individuazioni_id
        countsMap.set(id, (countsMap.get(id) || 0) + 1)
      })
    } else if (countsError) {
      console.error('[getCampagneIndividuazione] Counts query error:', countsError)
    }

    // Transform data with counts
    const transformedData = data.map((item: any) => ({
      ...item,
      individuazioni_count: countsMap.get(item.id) || 0
    }))

    return { 
      data: (transformedData as unknown) as CampagnaIndividuazione[], 
      error: null 
    }
  } catch (error: any) {
    console.error('[getCampagneIndividuazione] Unexpected error:', error)
  return { 
      data: null, 
      error: error instanceof Error ? error : new Error(String(error))
    }
  }
}

export const getCampagnaIndividuazione = async (id: string) => {
  const { data, error } = await (supabase as any)
    .from('campagne_individuazione')
    .select(`
      *,
      emittenti(nome),
      campagne_programmazione(nome)
    `)
    .eq('id', id)
    .single()

  return { 
    data: (data as unknown) as CampagnaIndividuazione, 
    error 
  }
}

// ============================================
// INDIVIDUAZIONI
// ============================================

export type SearchField = 'titolo' | 'artista' | 'opera'

export const getIndividuazioni = async (
  campagnaId: string,
  options?: {
    page?: number
    pageSize?: number
    search?: string
    searchField?: SearchField
    stato?: string
    withCount?: boolean
  }
) => {
  const page = options?.page || 1
  const pageSize = options?.pageSize || 50
  const offset = (page - 1) * pageSize
  const searchField = options?.searchField || 'titolo'
  const withCount = options?.withCount ?? true

  // Se si cerca per artista o opera, dobbiamo prima trovare gli ID corrispondenti
  let filterIds: string[] | null = null

  if (options?.search && searchField === 'artista') {
    const { data: artisti } = await supabase
      .from('artisti')
      .select('id')
      .or(`nome.ilike.%${options.search}%,cognome.ilike.%${options.search}%,nome_arte.ilike.%${options.search}%`)
    
    filterIds = artisti?.map(a => a.id) || []
    if (filterIds.length === 0) {
      return { data: [] as Individuazione[], error: null, count: 0, totalPages: 0 }
    }
  }

  if (options?.search && searchField === 'opera') {
    const { data: opere } = await supabase
      .from('opere')
      .select('id')
      .or(`titolo.ilike.%${options.search}%,titolo_originale.ilike.%${options.search}%`)
    
    filterIds = opere?.map(o => o.id) || []
    if (filterIds.length === 0) {
      return { data: [] as Individuazione[], error: null, count: 0, totalPages: 0 }
    }
  }

  let query = (supabase as any)
    .from('individuazioni')
    .select(`
      *,
      artisti(nome, cognome, nome_arte),
      opere(titolo, titolo_originale),
      ruoli_tipologie(nome)
    `, withCount ? { count: 'exact' } : undefined)
    .eq('campagna_individuazioni_id', campagnaId)
    .order('data_trasmissione', { ascending: false })
    .range(offset, offset + pageSize - 1)

  // Applica filtro di ricerca
  if (options?.search) {
    if (searchField === 'titolo') {
      query = query.ilike('titolo', `%${options.search}%`)
    } else if (searchField === 'artista' && filterIds) {
      query = query.in('artista_id', filterIds)
    } else if (searchField === 'opera' && filterIds) {
      query = query.in('opera_id', filterIds)
    }
  }

  if (options?.stato) {
    query = query.eq('stato', options.stato)
  }

  const { data, error, count } = await query

  return { 
    data: (data as unknown) as Individuazione[], 
    error,
    count,
    totalPages: count ? Math.ceil(count / pageSize) : 0
  }
}

export {
  formatIndividuazioniForExport,
  getIndividuazioniForExport,
} from './individuazioni-export.service'

// ============================================
// STATISTICS
// ============================================

export const getCampagnaStatistiche = async (campagnaId: string) => {
  const { data, error } = await (supabase as any)
    .from('campagne_individuazione')
    .select('statistiche')
    .eq('id', campagnaId)
    .single()

  return { data: (data as any)?.statistiche, error }
}

export {
  getIndividuazioneProcessingProgress,
  calculateProcessingPercent,
} from './individuazioni-progress.service'
export type {
  IndividuazioneProcessingProgress,
} from './individuazioni-progress.service'

// ============================================
// DELETE CAMPAGNA INDIVIDUAZIONE
// ============================================

export interface DeleteCampagnaIndividuazioneInfo {
  individuazioni_count: number
  campagne_programmazione_id: string
  campagne_programmazione_nome?: string
}

/**
 * Ottiene le informazioni per la dialog di conferma cancellazione
 */
export const getDeleteCampagnaIndividuazioneInfo = async (campagnaId: string): Promise<{ data: DeleteCampagnaIndividuazioneInfo | null; error: any }> => {
  try {
    // Get campagna with related info
    const { data: campagna, error: campagnaError } = await (supabase as any)
      .from('campagne_individuazione')
      .select('campagne_programmazione_id, campagne_programmazione(nome)')
      .eq('id', campagnaId)
      .single()

    if (campagnaError || !campagna) throw campagnaError || new Error('Campagna non trovata')

    // Count individuazioni
    const { count: individuazioni_count, error: countError } = await (supabase as any)
      .from('individuazioni')
      .select('*', { count: 'exact', head: true })
      .eq('campagna_individuazioni_id', campagnaId)

    if (countError) throw countError

    return {
      data: {
        individuazioni_count: individuazioni_count || 0,
        campagne_programmazione_id: (campagna as any).campagne_programmazione_id,
        campagne_programmazione_nome: ((campagna as any).campagne_programmazione as any)?.nome
      },
      error: null
    }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Elimina una campagna individuazione e tutte le individuazioni associate
 * 1. Prima elimina tutte le individuazioni
 * 2. Poi aggiorna lo stato della campagna programmazione (rimuove is_individuated)
 * 3. Infine elimina la campagna individuazione
 */
export const deleteCampagnaIndividuazione = async (
  campagnaId: string,
  onProgress?: (progress: { phase: 'deleting_individuazioni' | 'updating_programmazione' | 'deleting_campagna'; deleted?: number; total?: number }) => void
): Promise<{ data: any; error: any }> => {
  try {
    const { data: info, error: infoError } = await getDeleteCampagnaIndividuazioneInfo(campagnaId)
    if (infoError) {
      console.error('[deleteCampagnaIndividuazione] Error getting info:', infoError)
      throw new Error(`Errore nel recupero info: ${infoError.message || JSON.stringify(infoError)}`)
    }
    if (!info) throw new Error('Campagna non trovata')

    onProgress?.({ phase: 'deleting_individuazioni', deleted: 0, total: info.individuazioni_count })

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) throw new Error('Utente non autenticato')

    const { data, error } = await (supabase as any).rpc('delete_campagna_individuazione_safe', {
      p_campagna_individuazione_id: campagnaId,
      p_user_id: userId,
    })

    if (error) throw error
    if (!data?.success) {
      throw new Error(data?.error || 'Errore eliminazione campagna individuazione')
    }

    onProgress?.({ phase: 'deleting_individuazioni', deleted: info.individuazioni_count, total: info.individuazioni_count })
    onProgress?.({ phase: 'updating_programmazione' })
    onProgress?.({ phase: 'deleting_campagna' })

    return { data, error: null }
  } catch (error: any) {
    console.error('[deleteCampagnaIndividuazione] Caught error:', error)
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
  }
}
