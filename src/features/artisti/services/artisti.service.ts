import { supabase } from '@/shared/lib/supabase-client'

/**
 * Fetches a list of artists with optional filtering.
 * @param filters - Optional filters for search, status, and is_rasi.
 * @returns An object with data and error properties.
 */
export const getArtisti = async (filters?: { search?: string; stato?: string; is_rasi?: boolean | 'all' }) => {
  let query = supabase
    .from('artisti')
    .select('*')
    .order('cognome', { ascending: true })

  // Apply status filter
  if (filters?.stato && filters.stato !== 'all') {
    query = query.eq('stato', filters.stato)
  }

  // Apply is_rasi filter
  if (filters?.is_rasi !== undefined && filters.is_rasi !== 'all') {
    query = query.eq('is_rasi', filters.is_rasi === true)
  }

  // Apply search filter using pure ILIKE approach
  // This replaces the complex FTS (Vector) logic to provide more predictable results for names.
  // Logic: Split input into terms. Each term must appear in AT LEAST one of the fields (nome, cognome, codici).
  // This effectively creates: (nome ILIKE %t1% OR cognome ILIKE %t1%) AND (nome ILIKE %t2% OR cognome ILIKE %t2%)
  if (filters?.search) {
    const cleanSearch = filters.search.trim()
    
    // Split by spaces to handle multiple terms (e.g., "David Ma")
    const searchTerms = cleanSearch.split(/\s+/).filter(Boolean)

    searchTerms.forEach(term => {
      // For each term, add an OR group. 
      // Since PostgREST/Supabase chains filters with AND by default, 
      // calling .or() multiple times results in: (Group1) AND (Group2) AND ...
      query = query.or(`nome.ilike.%${term}%,cognome.ilike.%${term}%,codice_ipn.ilike.%${term}%,codice_fiscale.ilike.%${term}%`)
    })
  }

  const { data, error } = await query

  return { data, error }
}

/**
 * Fetches a single artist by their ID.
 * @param id - The ID of the artist to fetch.
 * @returns An object with data and error properties.
 */
export const getArtistaById = async (id: string) => {
  const { data, error } = await supabase
    .from('artisti')
    .select('*')
    .eq('id', id)
    .single()

  return { data, error }
}

/**
 * Fetches all participations for a given artist, including related work, role, and episode details.
 * @param artistaId - The ID of the artist.
 * @returns An object with data and error properties.
 */
export const getPartecipazioniByArtistaId = async (artistaId: string) => {
  const { data, error } = await supabase
    .from('partecipazioni')
    .select(`
      id,
      personaggio,
      note,
      stato_validazione,
      created_at,
      artista_id,
      opera_id,
      episodio_id,
      ruolo_id,
      opere (
        id,
        codice_opera,
        titolo,
        titolo_originale,
        tipo,
        anno_produzione
      ),
      ruoli_tipologie (
        id,
        nome,
        descrizione
      ),
      episodi (
        id,
        titolo_episodio,
        numero_episodio,
        numero_stagione
      )
    `)
    .eq('artista_id', artistaId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export const createArtista = async (
  payload: import('@/shared/lib/supabase').Database['public']['Tables']['artisti']['Insert']
) => {
  const { data, error } = await supabase
    .from('artisti')
    .insert<import('@/shared/lib/supabase').Database['public']['Tables']['artisti']['Insert']>(payload)
    .select('*')
    .single()

  return { data, error }
}

export const updateArtista = async (
  id: string,
  payload: import('@/shared/lib/supabase').Database['public']['Tables']['artisti']['Update']
) => {
  const { data, error } = await supabase
    .from('artisti')
    .update<import('@/shared/lib/supabase').Database['public']['Tables']['artisti']['Update']>(payload)
    .eq('id', id)
    .select('*')
    .single()

  return { data, error }
}

/**
 * Counts the number of participations for a given artist.
 * Used to check if an artist can be deleted.
 */
export const getPartecipazioniCountByArtistaId = async (artistaId: string) => {
  const { count, error } = await supabase
    .from('partecipazioni')
    .select('*', { count: 'exact', head: true })
    .eq('artista_id', artistaId)

  return { count: count ?? 0, error }
}

/**
 * Deletes an artist by ID.
 * Note: This will fail if the artist has associated participations due to FK constraints.
 */
export const deleteArtista = async (id: string) => {
  const { error } = await supabase
    .from('artisti')
    .delete()
    .eq('id', id)

  return { error }
}

// Re-export partecipazioni functions from opere service for convenience
export { updatePartecipazione, deletePartecipazione, deletePartecipazioniMultiple } from '@/features/opere/services/opere.service'
