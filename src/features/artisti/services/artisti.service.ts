import { supabase } from '@/shared/lib/supabase-client'

/**
 * Fetches a list of artists with optional filtering.
 * @param filters - Optional filters for search and status.
 * @returns An object with data and error properties.
 */
export const getArtisti = async (filters?: { search?: string; stato?: string }) => {
  let query = supabase
    .from('artisti')
    .select('*')
    .order('cognome', { ascending: true })

  // Apply status filter
  if (filters?.stato && filters.stato !== 'all') {
    query = query.eq('stato', filters.stato)
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
        numero_episodio
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
