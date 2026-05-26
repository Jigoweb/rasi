import { supabase } from '@/shared/lib/supabase-client'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Fetches all opere with their episodi for full export, using cursor-based pagination.
 * Denormalizes: opere without episodes = 1 row, opere with episodes = N rows (one per episode).
 */
export const getOpereForExport = async (
  onProgress?: (progress: { fetched: number; total: number; percentage: number; phase: 'fetching' | 'formatting' | 'generating' | 'done'; estimatedTimeRemaining?: number }) => void,
  signal?: AbortSignal
) => {
  try {
    if (signal?.aborted) throw new Error('Export cancelled')

    // Count total opere
    const { count: totalOpere, error: countError } = await supabase
      .from('opere')
      .select('*', { count: 'exact', head: true })

    if (countError) return { data: null, error: countError }

    const total = totalOpere || 0
    if (total === 0) return { data: [], error: null }

    // Fetch all opere with cursor-based pagination
    const batchSize = 500
    const allOpere: any[] = []
    let lastId: string | null = null
    let hasMore = true
    const startTime = Date.now()

    while (hasMore) {
      if (signal?.aborted) throw new Error('Export cancelled')

      let query = supabase
        .from('opere')
        .select('id, codice_opera, titolo, titolo_originale, alias_titoli, tipo, has_episodes, anno_produzione, regista, codice_isan, imdb_tconst, stato_validazione, dettagli_serie, created_at, updated_at')
        .order('id', { ascending: true })
        .limit(batchSize)

      if (lastId) {
        query = query.gt('id', lastId)
      }

      const { data, error } = await query
      if (error) return { data: null, error }

      if (data && data.length > 0) {
        allOpere.push(...data)
        lastId = data[data.length - 1].id
        hasMore = data.length === batchSize

        const elapsed = (Date.now() - startTime) / 1000
        const rate = allOpere.length / elapsed
        const remaining = total - allOpere.length
        const estimatedTimeRemaining = rate > 0 ? Math.round(remaining / rate) : undefined

        onProgress?.({
          fetched: allOpere.length,
          total,
          percentage: Math.round((allOpere.length / total) * 70), // 0-70% for opere fetch
          phase: 'fetching',
          estimatedTimeRemaining
        })

        if (hasMore) await delay(100)
      } else {
        hasMore = false
      }
    }

    if (signal?.aborted) throw new Error('Export cancelled')

    // Fetch all episodi for opere that have episodes
    const opereConEpisodi = allOpere.filter(o => o.has_episodes).map(o => o.id)
    const allEpisodi: any[] = []

    if (opereConEpisodi.length > 0) {
      let epLastId: string | null = null
      let epHasMore = true

      while (epHasMore) {
        if (signal?.aborted) throw new Error('Export cancelled')

        let epQuery = supabase
          .from('episodi')
          .select('id, opera_id, numero_stagione, numero_episodio, titolo_episodio, durata_minuti, data_prima_messa_in_onda, codice_isan, imdb_tconst')
          .order('id', { ascending: true })
          .limit(batchSize)

        if (epLastId) {
          epQuery = epQuery.gt('id', epLastId)
        }

        const { data: epData, error: epError } = await epQuery
        if (epError) return { data: null, error: epError }

        if (epData && epData.length > 0) {
          allEpisodi.push(...epData)
          epLastId = epData[epData.length - 1].id
          epHasMore = epData.length === batchSize

          onProgress?.({
            fetched: allOpere.length,
            total,
            percentage: 70 + Math.round((allEpisodi.length / Math.max(allEpisodi.length, 1)) * 10), // 70-80%
            phase: 'fetching'
          })

          if (epHasMore) await delay(100)
        } else {
          epHasMore = false
        }
      }
    }

    // Build episodi lookup by opera_id
    const episodiByOpera = new Map<string, any[]>()
    for (const ep of allEpisodi) {
      const list = episodiByOpera.get(ep.opera_id) || []
      list.push(ep)
      episodiByOpera.set(ep.opera_id, list)
    }

    // Denormalize: opera senza episodi = 1 row, opera con episodi = N rows
    const rows: any[] = []
    for (const opera of allOpere) {
      const episodi = episodiByOpera.get(opera.id)
      if (episodi && episodi.length > 0) {
        // Sort episodes
        episodi.sort((a: any, b: any) =>
          a.numero_stagione !== b.numero_stagione
            ? a.numero_stagione - b.numero_stagione
            : a.numero_episodio - b.numero_episodio
        )
        for (const ep of episodi) {
          rows.push({ ...opera, _episodio: ep })
        }
      } else {
        rows.push({ ...opera, _episodio: null })
      }
    }

    return { data: rows, error: null }
  } catch (error: any) {
    if (error.message === 'Export cancelled' || signal?.aborted) throw error
    console.error('[getOpereForExport] Unexpected error:', error)
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
  }
}

export const formatOpereForExport = (rows: any[]) => {
  return rows.map(row => {
    const ep = row._episodio
    return {
      'Codice Opera': row.codice_opera || '',
      'Titolo': row.titolo || '',
      'Titolo Originale': row.titolo_originale || '',
      'Alias Titoli': Array.isArray(row.alias_titoli) ? row.alias_titoli.join('; ') : '',
      'Tipo': row.tipo || '',
      'Ha Episodi': row.has_episodes ? 'Sì' : 'No',
      'Anno Produzione': row.anno_produzione ?? '',
      'Regia': Array.isArray(row.regista) ? row.regista.join(', ') : '',
      'Codice ISAN': row.codice_isan || '',
      'IMDB ID': row.imdb_tconst || '',
      'Stato Validazione': row.stato_validazione || '',
      'Dettagli Serie': row.dettagli_serie ? JSON.stringify(row.dettagli_serie) : '',
      'Stagione': ep?.numero_stagione ?? '',
      'Episodio': ep?.numero_episodio ?? '',
      'Titolo Episodio': ep?.titolo_episodio || '',
      'Durata Episodio (min)': ep?.durata_minuti ?? '',
      'Data Prima Messa in Onda': ep?.data_prima_messa_in_onda || '',
      'ISAN Episodio': ep?.codice_isan || '',
      'IMDB Episodio': ep?.imdb_tconst || '',
      'Data Creazione': row.created_at ? new Date(row.created_at).toLocaleDateString('it-IT') : '',
      'Ultimo Aggiornamento': row.updated_at ? new Date(row.updated_at).toLocaleDateString('it-IT') : '',
    }
  })
}

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

export const getUserEmailById = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase.rpc('get_user_email_by_id', { user_id: userId })
  if (error) {
    console.error('Error fetching user email:', error)
    return null
  }
  return data as string | null
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
 * Note: This will fail if the opera has associated participations or individuazioni due to FK constraints.
 */
export const deleteOpera = async (id: string) => {
  const { error } = await supabase
    .from('opere')
    .delete()
    .eq('id', id)

  return { error }
}

/** Individuazione info per opera (campagne in cui è usata) */
export interface IndividuazionePerOpera {
  id: string
  campagna_individuazioni_id: string
  campagne_individuazione?: { nome: string } | null
}

/**
 * Recupera le individuazioni collegate a un'opera, con i nomi delle campagne.
 * Usato per avvisare l'utente prima della cancellazione.
 * Restituisce solo le individuazioni "orfane" (partecipazione_id NULL) che
 * impediscono la cancellazione ma non sono più visibili nell'interfaccia.
 */
export const getIndividuazioniByOperaId = async (operaId: string) => {
  const { data, error } = await supabase
    .from('individuazioni')
    .select(`
      id,
      campagna_individuazioni_id,
      campagne_individuazione(nome)
    `)
    .eq('opera_id', operaId)

  return { data: data as IndividuazionePerOpera[] | null, error }
}

/**
 * Elimina tutte le individuazioni collegate a un'opera.
 * Va chiamato prima di deleteOpera quando esistono individuazioni (FK opera_id RESTRICT).
 */
export const deleteIndividuazioniByOperaId = async (operaId: string) => {
  const { error } = await supabase
    .from('individuazioni')
    .delete()
    .eq('opera_id', operaId)

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
