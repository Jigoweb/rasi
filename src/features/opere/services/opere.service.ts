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
    .select('id, numero_stagione, numero_episodio, titolo_episodio, data_prima_messa_in_onda, durata_minuti')
    .eq('opera_id', operaId)
    .order('numero_stagione', { ascending: true })
    .order('numero_episodio', { ascending: true })

  return { data, error }
}
