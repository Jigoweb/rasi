import { supabase } from '@/shared/lib/supabase-client'

export const getRuoliTipologie = async () => {
  const { data, error } = await supabase
    .from('ruoli_tipologie')
    .select('id, nome, descrizione, categoria')
    .order('nome', { ascending: true })

  return { data, error }
}

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
    query = query.eq('tipo', filters.tipo as 'film' | 'serie_tv' | 'animazione')
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

/**
 * Counts the number of participations for a given opera.
 * Used to check if an opera can be deleted.
 */
export const getPartecipazioniCountByOperaId = async (operaId: string) => {
  const { count, error } = await supabase
    .from('partecipazioni')
    .select('*', { count: 'exact', head: true })
    .eq('opera_id', operaId)

  return { count: count ?? 0, error }
}

/**
 * Deletes an opera by ID.
 * Note: This will fail if the opera has associated participations due to FK constraints.
 */
export const deleteOpera = async (id: string) => {
  const { error } = await supabase
    .from('opere')
    .delete()
    .eq('id', id)

  return { error }
}

export const getPartecipazioniByOperaId = async (operaId: string) => {
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
      artisti ( id, nome, cognome, nome_arte ),
      ruoli_tipologie ( id, nome, descrizione ),
      episodi ( id, numero_stagione, numero_episodio, titolo_episodio )
    `)
    .eq('opera_id', operaId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export const updatePartecipazione = async (
  id: string,
  payload: {
    ruolo_id?: string
    personaggio?: string | null
    note?: string | null
    episodio_id?: string | null
  }
) => {
  const { data, error } = await supabase
    .from('partecipazioni')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  return { data, error }
}

export const deletePartecipazione = async (id: string) => {
  const { error } = await supabase
    .from('partecipazioni')
    .delete()
    .eq('id', id)

  return { error }
}

/** Individuazione info per partecipazione (campagne in cui è usata) */
export interface IndividuazionePerPartecipazione {
  id: string
  campagna_individuazioni_id: string
  campagne_individuazione?: { nome: string } | null
}

/**
 * Recupera le individuazioni collegate a una partecipazione, con i nomi delle campagne.
 * Usato per avvisare l'utente prima della cancellazione.
 */
export const getIndividuazioniByPartecipazioneId = async (partecipazioneId: string) => {
  const { data, error } = await supabase
    .from('individuazioni')
    .select(`
      id,
      campagna_individuazioni_id,
      campagne_individuazione(nome)
    `)
    .eq('partecipazione_id', partecipazioneId)

  return { data: data as IndividuazionePerPartecipazione[] | null, error }
}

/**
 * Elimina tutte le individuazioni collegate a una partecipazione.
 * Va chiamato prima di deletePartecipazione quando esistono individuazioni (FK RESTRICT).
 */
export const deleteIndividuazioniByPartecipazioneId = async (partecipazioneId: string) => {
  const { error } = await supabase
    .from('individuazioni')
    .delete()
    .eq('partecipazione_id', partecipazioneId)

  return { error }
}

/** Individuazione con partecipazione_id per bulk fetch */
export interface IndividuazionePerPartecipazioneBulk extends IndividuazionePerPartecipazione {
  partecipazione_id: string
}

/**
 * Recupera le individuazioni collegate a più partecipazioni (per bulk delete).
 * Restituisce un array con partecipazione_id per raggruppare.
 */
export const getIndividuazioniByPartecipazioneIds = async (partecipazioneIds: string[]) => {
  if (partecipazioneIds.length === 0) return { data: [] as IndividuazionePerPartecipazioneBulk[], error: null }
  const { data, error } = await supabase
    .from('individuazioni')
    .select(`
      id,
      partecipazione_id,
      campagna_individuazioni_id,
      campagne_individuazione(nome)
    `)
    .in('partecipazione_id', partecipazioneIds)

  return { data: (data || []) as IndividuazionePerPartecipazioneBulk[], error }
}

/**
 * Elimina tutte le individuazioni collegate a più partecipazioni.
 */
export const deleteIndividuazioniByPartecipazioneIds = async (partecipazioneIds: string[]) => {
  if (partecipazioneIds.length === 0) return { error: null }
  const { error } = await supabase
    .from('individuazioni')
    .delete()
    .in('partecipazione_id', partecipazioneIds)

  return { error }
}

export const deletePartecipazioniMultiple = async (ids: string[]) => {
  const { error } = await supabase
    .from('partecipazioni')
    .delete()
    .in('id', ids)

  return { error }
}

/**
 * Crea una singola partecipazione
 */
export const createPartecipazione = async (payload: {
  artista_id: string
  opera_id: string
  episodio_id?: string | null
  ruolo_id: string
  personaggio?: string | null
  note?: string | null
}) => {
  const { data, error } = await supabase
    .from('partecipazioni')
    .insert(payload)
    .select('*')
    .single()

  return { data, error }
}

/**
 * Crea multiple partecipazioni in batch
 * Gestisce automaticamente i duplicati (ignora quelli che violano il constraint UNIQUE)
 */
export const createPartecipazioniMultiple = async (
  partecipazioni: Array<{
    artista_id: string
    opera_id: string
    episodio_id?: string | null
    ruolo_id: string
    personaggio?: string | null
    note?: string | null
  }>
) => {
  if (partecipazioni.length === 0) {
    return { data: [], error: null, duplicates: [] }
  }

  // Tentativo di inserimento batch
  const { data, error } = await supabase
    .from('partecipazioni')
    .insert(partecipazioni)
    .select('*')

  // Se c'è un errore di constraint unique, proviamo a inserire una alla volta
  // per identificare quali sono i duplicati
  if (error && error.code === '23505') {
    const results: any[] = []
    const duplicates: Array<{ index: number; partecipazione: typeof partecipazioni[0] }> = []
    
    for (let i = 0; i < partecipazioni.length; i++) {
      const { data: singleData, error: singleError } = await supabase
        .from('partecipazioni')
        .insert(partecipazioni[i])
        .select('*')
        .single()
      
      if (singleError) {
        if (singleError.code === '23505') {
          duplicates.push({ index: i, partecipazione: partecipazioni[i] })
        } else {
          // Altro errore, lo restituiamo
          return { data: results, error: singleError, duplicates }
        }
      } else if (singleData) {
        results.push(singleData)
      }
    }
    
    return { data: results, error: duplicates.length > 0 ? null : error, duplicates }
  }

  return { data: data || [], error, duplicates: [] }
}

/**
 * Verifica se esistono già partecipazioni duplicate
 * Restituisce gli indici delle partecipazioni che sono duplicate
 */
export const checkPartecipazioniDuplicate = async (
  partecipazioni: Array<{
    artista_id: string
    opera_id: string
    episodio_id?: string | null
    ruolo_id: string
  }>
) => {
  if (partecipazioni.length === 0) {
    return []
  }

  const duplicateIndices: number[] = []

  // Per ogni partecipazione, verifichiamo se esiste già
  // Questo approccio è più semplice e affidabile con PostgREST
  for (let i = 0; i < partecipazioni.length; i++) {
    const p = partecipazioni[i]
    
    let query = supabase
      .from('partecipazioni')
      .select('id')
      .eq('artista_id', p.artista_id)
      .eq('opera_id', p.opera_id)
      .eq('ruolo_id', p.ruolo_id)
    
    if (p.episodio_id) {
      query = query.eq('episodio_id', p.episodio_id)
    } else {
      query = query.is('episodio_id', null)
    }

    const { data, error } = await query.limit(1)

    if (!error && data && data.length > 0) {
      duplicateIndices.push(i)
    }
  }

  return duplicateIndices
}

export const getEpisodiByOperaId = async (operaId: string) => {
  const { data, error } = await supabase
    .from('episodi')
    .select('id, numero_stagione, numero_episodio, titolo_episodio, descrizione, data_prima_messa_in_onda, durata_minuti, imdb_tconst, codice_isan, metadati')
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

export const deleteEpisodio = async (id: string) => {
  const { error } = await supabase
    .from('episodi')
    .delete()
    .eq('id', id)

  return { error }
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
    imdb_tconst?: string | null
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
            imdb_tconst: ep.imdb_tconst,
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
            imdb_tconst: ep.imdb_tconst,
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
