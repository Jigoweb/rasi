import { supabase } from '@/shared/lib/supabase-client'

export type ArtistaFieldFilter =
  | { field: 'nome_arte' | 'codice_fiscale' | 'imdb_nconst' | 'data_nascita' | 'luogo_nascita' | 'territorio'; hasValue: boolean }
  | { field: 'stato'; value: 'attivo' | 'sospeso' | 'cessato' }
  | { field: 'tipologia'; value: 'AIE' | 'PRODUTTORE' }

/**
 * Fetches a list of artists with optional filtering.
 * @param filters - Optional filters for search, is_rasi (tipologia), and field filters.
 * @returns An object with data and error properties.
 */
export const getArtisti = async (filters?: {
  search?: string
  is_rasi?: boolean | 'all'
  fieldFilters?: ArtistaFieldFilter[]
}) => {
  let query = supabase
    .from('artisti')
    .select('*')
    .order('cognome', { ascending: true })

  // Apply is_rasi (tipologia RASI/Esterni) filter
  if (filters?.is_rasi !== undefined && filters.is_rasi !== 'all') {
    query = query.eq('is_rasi', filters.is_rasi === true)
  }

  // Apply field filters
  if (filters?.fieldFilters?.length) {
    for (const f of filters.fieldFilters) {
      if (f.field === 'stato' && 'value' in f) {
        query = query.eq('stato', f.value)
      } else if (f.field === 'tipologia' && 'value' in f) {
        query = query.eq('tipologia', f.value)
      } else if ('hasValue' in f) {
        const hasValue = f.hasValue
        switch (f.field) {
          case 'nome_arte':
            if (hasValue) query = query.not('nome_arte', 'is', null).neq('nome_arte', '')
            else query = query.or('nome_arte.is.null,nome_arte.eq.')
            break
          case 'codice_fiscale':
            if (hasValue) query = query.not('codice_fiscale', 'is', null).neq('codice_fiscale', '')
            else query = query.or('codice_fiscale.is.null,codice_fiscale.eq.')
            break
          case 'imdb_nconst':
            if (hasValue) query = query.not('imdb_nconst', 'is', null).neq('imdb_nconst', '')
            else query = query.or('imdb_nconst.is.null,imdb_nconst.eq.')
            break
          case 'data_nascita':
            if (hasValue) query = query.not('data_nascita', 'is', null)
            else query = query.is('data_nascita', null)
            break
          case 'luogo_nascita':
            if (hasValue) query = query.not('luogo_nascita', 'is', null).neq('luogo_nascita', '')
            else query = query.or('luogo_nascita.is.null,luogo_nascita.eq.')
            break
          case 'territorio':
            if (hasValue) query = query.not('territorio', 'is', null)
            else query = query.is('territorio', null)
            break
        }
      }
    }
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
        has_episodes,
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
export { 
  updatePartecipazione, 
  deletePartecipazione, 
  deletePartecipazioniMultiple,
  createPartecipazione,
  createPartecipazioniMultiple,
  checkPartecipazioniDuplicate
} from '@/features/opere/services/opere.service'
