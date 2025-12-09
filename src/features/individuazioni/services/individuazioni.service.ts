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
  const { data, error } = await supabase
    .from('campagne_individuazione')
    .select(`
      *,
      emittenti(nome),
      campagne_programmazione(nome),
      individuazioni_count:individuazioni(count)
    `)
    .order('created_at', { ascending: false })

  return { 
    data: (data as unknown) as CampagnaIndividuazione[], 
    error 
  }
}

export const getCampagnaIndividuazione = async (id: string) => {
  const { data, error } = await supabase
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
  }
) => {
  const page = options?.page || 1
  const pageSize = options?.pageSize || 50
  const offset = (page - 1) * pageSize
  const searchField = options?.searchField || 'titolo'

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
    `, { count: 'exact' })
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

// ============================================
// EXPORT
// ============================================

export const getIndividuazioniForExport = async (campagnaId: string) => {
  // Fetch all records without pagination for export
  const { data, error } = await (supabase as any)
    .from('individuazioni')
    .select(`
      canale,
      emittente,
      tipo,
      titolo,
      titolo_originale,
      numero_episodio,
      titolo_episodio,
      titolo_episodio_originale,
      numero_stagione,
      anno,
      production,
      regia,
      data_trasmissione,
      ora_inizio,
      ora_fine,
      durata_minuti,
      data_inizio,
      data_fine,
      retail_price,
      sales_month,
      track_price_local_currency,
      views,
      total_net_ad_revenue,
      total_revenue,
      artisti(nome, cognome, nome_arte),
      ruoli_tipologie(nome)
    `)
    .eq('campagna_individuazioni_id', campagnaId)
    .order('data_trasmissione', { ascending: true })

  return { data, error }
}

export const formatIndividuazioniForExport = (individuazioni: any[]) => {
  return individuazioni.map(ind => ({
    'canale': ind.canale || '',
    'emittente': ind.emittente || '',
    'tipo': ind.tipo || '',
    'titolo': ind.titolo || '',
    'titolo_originale': ind.titolo_originale || '',
    'numero_episodio': ind.numero_episodio ?? '',
    'titolo_episodio': ind.titolo_episodio || '',
    'titolo_episodio_originale': ind.titolo_episodio_originale || '',
    'numero_stagione': ind.numero_stagione ?? '',
    'anno': ind.anno ?? '',
    'production': ind.production || '',
    'regia': ind.regia || '',
    'data_trasmissione': ind.data_trasmissione || '',
    'ora_inizio': ind.ora_inizio || '',
    'ora_fine': ind.ora_fine || '',
    'durata_minuti': ind.durata_minuti ?? '',
    'data_inizio': ind.data_inizio || '',
    'data_fine': ind.data_fine || '',
    'retail_price': ind.retail_price ?? '',
    'sales_month': ind.sales_month ?? '',
    'track_price_local_currency': ind.track_price_local_currency ?? '',
    'views': ind.views ?? '',
    'total_net_ad_revenue': ind.total_net_ad_revenue ?? '',
    'total_revenue': ind.total_revenue ?? '',
    'artista': ind.artisti ? (ind.artisti.nome_arte || `${ind.artisti.nome || ''} ${ind.artisti.cognome || ''}`.trim()) : '',
    'ruolo': ind.ruoli_tipologie?.nome || ''
  }))
}

// ============================================
// STATISTICS
// ============================================

export const getCampagnaStatistiche = async (campagnaId: string) => {
  const { data, error } = await supabase
    .from('campagne_individuazione')
    .select('statistiche')
    .eq('id', campagnaId)
    .single()

  return { data: (data as any)?.statistiche, error }
}

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
    const { data: campagna, error: campagnaError } = await supabase
      .from('campagne_individuazione')
      .select('campagne_programmazione_id, campagne_programmazione(nome)')
      .eq('id', campagnaId)
      .single()

    if (campagnaError) throw campagnaError

    // Count individuazioni
    const { count: individuazioni_count, error: countError } = await (supabase as any)
      .from('individuazioni')
      .select('*', { count: 'exact', head: true })
      .eq('campagna_individuazioni_id', campagnaId)

    if (countError) throw countError

    return {
      data: {
        individuazioni_count: individuazioni_count || 0,
        campagne_programmazione_id: campagna.campagne_programmazione_id,
        campagne_programmazione_nome: (campagna.campagne_programmazione as any)?.nome
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
    // Get info first
    const { data: info, error: infoError } = await getDeleteCampagnaIndividuazioneInfo(campagnaId)
    if (infoError) {
      console.error('[deleteCampagnaIndividuazione] Error getting info:', infoError)
      throw new Error(`Errore nel recupero info: ${infoError.message || JSON.stringify(infoError)}`)
    }
    if (!info) throw new Error('Campagna non trovata')

    console.log('[deleteCampagnaIndividuazione] Starting delete for campagna:', campagnaId, 'with', info.individuazioni_count, 'individuazioni')

    // 1. Delete all individuazioni directly with eq filter (more efficient than batching with IN)
    onProgress?.({ phase: 'deleting_individuazioni', deleted: 0, total: info.individuazioni_count })
    
    // Delete directly - Supabase handles large deletes
    const { error: deleteIndError } = await (supabase as any)
      .from('individuazioni')
      .delete()
      .eq('campagna_individuazioni_id', campagnaId)

    if (deleteIndError) {
      console.error('[deleteCampagnaIndividuazione] Error deleting individuazioni:', deleteIndError)
      throw new Error(`Errore eliminazione individuazioni: ${deleteIndError.message || JSON.stringify(deleteIndError)}`)
    }

    console.log('[deleteCampagnaIndividuazione] Individuazioni deleted successfully')
    onProgress?.({ phase: 'deleting_individuazioni', deleted: info.individuazioni_count, total: info.individuazioni_count })

    // 2. Update campagna_programmazione to remove 'individuata' status
    onProgress?.({ phase: 'updating_programmazione' })
    
    const { error: updateProgError } = await supabase
      .from('campagne_programmazione' as any)
      .update({ stato: 'in_review', is_individuated: false })
      .eq('id', info.campagne_programmazione_id)

    if (updateProgError) {
      console.error('[deleteCampagnaIndividuazione] Error updating campagna_programmazione:', updateProgError)
      throw new Error(`Errore aggiornamento campagna programmazione: ${updateProgError.message || JSON.stringify(updateProgError)}`)
    }

    console.log('[deleteCampagnaIndividuazione] Campagna programmazione updated')

    // 3. Delete campagna_individuazione
    onProgress?.({ phase: 'deleting_campagna' })
    
    const { data, error } = await supabase
      .from('campagne_individuazione')
      .delete()
      .eq('id', campagnaId)
      .select()

    if (error) {
      console.error('[deleteCampagnaIndividuazione] Error deleting campagna_individuazione:', error)
      throw new Error(`Errore eliminazione campagna: ${error.message || JSON.stringify(error)}`)
    }

    console.log('[deleteCampagnaIndividuazione] Campagna individuazione deleted successfully')

    return { data, error: null }
  } catch (error: any) {
    console.error('[deleteCampagnaIndividuazione] Caught error:', error)
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
  }
}
