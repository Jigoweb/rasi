import { supabase } from '@/shared/lib/supabase-client'

export const getOpere = async (filters?: { search?: string; tipo?: string }) => {
  let query = supabase
    .from('opere')
    .select('*')
    .order('anno_produzione', { ascending: false })

  if (filters?.search) {
    const s = filters.search.trim()
    if (s) {
      query = query.or(`titolo.ilike.%${s}%,codice_opera.ilike.%${s}%,titolo_originale.ilike.%${s}%`)
    }
  }

  if (filters?.tipo && filters.tipo !== 'all') {
    query = query.eq('tipo', filters.tipo)
  }

  const { data, error } = await query
  return { data, error }
}

export const getOperaById = async (id: string) => {
  const { data, error } = await supabase
    .from('opere')
    .select('*')
    .eq('id', id)
    .single()

  return { data, error }
}

export const createOpera = async (
  payload: import('@/shared/lib/supabase').Database['public']['Tables']['opere']['Insert']
) => {
  const { data, error } = await supabase
    .from('opere')
    .insert<import('@/shared/lib/supabase').Database['public']['Tables']['opere']['Insert']>(payload)
    .select('*')
    .single()

  return { data, error }
}

export const updateOpera = async (
  id: string,
  payload: import('@/shared/lib/supabase').Database['public']['Tables']['opere']['Update']
) => {
  const { data, error } = await supabase
    .from('opere')
    .update<import('@/shared/lib/supabase').Database['public']['Tables']['opere']['Update']>(payload)
    .eq('id', id)
    .select('*')
    .single()

  return { data, error }
}

export const getPartecipazioniByOperaId = async (operaId: string) => {
  const { data, error } = await supabase
    .from('partecipazioni')
    .select(`
      id,
      personaggio,
      note,
      stato_validazione,
      created_at,
      artisti ( id, nome, cognome, nome_arte ),
      ruoli_tipologie ( id, nome, descrizione ),
      episodi ( id, numero_stagione, numero_episodio, titolo_episodio )
    `)
    .eq('opera_id', operaId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export const getEpisodiByOperaId = async (operaId: string) => {
  const { data, error } = await supabase
    .from('episodi')
    .select('id, numero_stagione, numero_episodio, titolo_episodio, descrizione, data_prima_messa_in_onda, durata_minuti, metadati')
    .eq('opera_id', operaId)
    .order('numero_stagione', { ascending: true })
    .order('numero_episodio', { ascending: true })

  return { data, error }
}

export const createEpisodio = async (
  payload: import('@/shared/lib/supabase').Database['public']['Tables']['episodi']['Insert']
) => {
  const { data, error } = await supabase
    .from('episodi')
    .insert(payload)
    .select('*')
    .single()

  return { data, error }
}

export const updateEpisodio = async (
  id: string,
  payload: import('@/shared/lib/supabase').Database['public']['Tables']['episodi']['Update']
) => {
  const { data, error } = await supabase
    .from('episodi')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  return { data, error }
}

// Upsert batch di episodi - trova per opera_id + numero_stagione + numero_episodio
export const upsertEpisodi = async (
  operaId: string,
  episodi: Array<{
    numero_stagione: number
    numero_episodio: number
    titolo_episodio?: string | null
    descrizione?: string | null
    durata_minuti?: number | null
    data_prima_messa_in_onda?: string | null
    metadati?: Record<string, any> | null
  }>
) => {
  // Per ogni episodio, cerca se esiste già e aggiorna o crea
  const results: { created: number; updated: number; errors: string[] } = {
    created: 0,
    updated: 0,
    errors: [],
  }

  for (const ep of episodi) {
    try {
      // Cerca episodio esistente
      const { data: existing } = await supabase
        .from('episodi')
        .select('id')
        .eq('opera_id', operaId)
        .eq('numero_stagione', ep.numero_stagione)
        .eq('numero_episodio', ep.numero_episodio)
        .single()

      if (existing) {
        // Aggiorna
        const { error } = await supabase
          .from('episodi')
          .update({
            titolo_episodio: ep.titolo_episodio,
            descrizione: ep.descrizione,
            durata_minuti: ep.durata_minuti,
            data_prima_messa_in_onda: ep.data_prima_messa_in_onda,
            metadati: ep.metadati,
          })
          .eq('id', existing.id)

        if (error) {
          results.errors.push(`S${ep.numero_stagione}E${ep.numero_episodio}: ${error.message}`)
        } else {
          results.updated++
        }
      } else {
        // Crea
        const { error } = await supabase
          .from('episodi')
          .insert({
            opera_id: operaId,
            numero_stagione: ep.numero_stagione,
            numero_episodio: ep.numero_episodio,
            titolo_episodio: ep.titolo_episodio,
            descrizione: ep.descrizione,
            durata_minuti: ep.durata_minuti,
            data_prima_messa_in_onda: ep.data_prima_messa_in_onda,
            metadati: ep.metadati,
          })

        if (error) {
          results.errors.push(`S${ep.numero_stagione}E${ep.numero_episodio}: ${error.message}`)
        } else {
          results.created++
        }
      }
    } catch (e: any) {
      results.errors.push(`S${ep.numero_stagione}E${ep.numero_episodio}: ${e.message}`)
    }
  }

  return results
}
