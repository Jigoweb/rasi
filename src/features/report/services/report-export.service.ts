import { supabase } from '@/shared/lib/supabase-client'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export interface ExportProgress {
  fetched: number
  total: number
  percentage: number
  phase: 'fetching' | 'formatting' | 'generating' | 'done'
  estimatedTimeRemaining?: number
}

/**
 * Export completo della banca dati: partecipazioni con opere, episodi, artisti e ruoli.
 * Ogni riga = 1 partecipazione (artista + opera + eventuale episodio + ruolo).
 * Usa cursor-based pagination per gestire grandi dataset.
 */
export const getFullDatabaseExport = async (
  onProgress?: (progress: ExportProgress) => void,
  signal?: AbortSignal
) => {
  try {
    if (signal?.aborted) throw new Error('Export cancelled')

    // Count totale partecipazioni
    const { count: totalCount, error: countError } = await supabase
      .from('partecipazioni')
      .select('*', { count: 'exact', head: true })

    if (countError) return { data: null, error: countError }

    const total = totalCount || 0
    if (total === 0) return { data: [], error: null }

    const batchSize = 500
    const allData: any[] = []
    let lastId: string | null = null
    let hasMore = true
    const startTime = Date.now()

    while (hasMore) {
      if (signal?.aborted) throw new Error('Export cancelled')

      let query = supabase
        .from('partecipazioni')
        .select(`
          id,
          personaggio,
          note,
          opera_id,
          episodio_id,
          opere (
            codice_opera,
            titolo,
            titolo_originale,
            alias_titoli,
            tipo,
            has_episodes,
            anno_produzione,
            regista,
            codice_isan,
            imdb_tconst,
            stato_validazione,
            dettagli_serie
          ),
          episodi (
            numero_stagione,
            numero_episodio,
            titolo_episodio,
            durata_minuti,
            data_prima_messa_in_onda,
            codice_isan,
            imdb_tconst
          ),
          artisti (
            codice_ipn,
            nome,
            cognome,
            nome_arte,
            ragione_sociale,
            codice_fiscale,
            partita_iva,
            forma_giuridica,
            data_nascita,
            luogo_nascita,
            stato,
            is_rasi,
            codice_paese,
            territorio,
            tipologia,
            data_inizio_mandato,
            data_fine_mandato,
            imdb_nconst,
            contatti,
            indirizzo,
            diritti_attivi,
            codici_esterni,
            componente_stabile_gruppo_orchestra
          ),
          ruoli_tipologie (
            codice,
            nome,
            categoria
          )
        `)
        .order('id', { ascending: true })
        .limit(batchSize)

      if (lastId) {
        query = query.gt('id', lastId)
      }

      const { data, error } = await query

      if (error) return { data: null, error }

      if (data && data.length > 0) {
        allData.push(...data)
        lastId = data[data.length - 1].id
        hasMore = data.length === batchSize

        const elapsed = (Date.now() - startTime) / 1000
        const rate = allData.length / elapsed
        const remaining = total - allData.length
        const estimatedTimeRemaining = rate > 0 ? Math.round(remaining / rate) : undefined

        onProgress?.({
          fetched: allData.length,
          total,
          percentage: Math.round((allData.length / total) * 85),
          phase: 'fetching',
          estimatedTimeRemaining
        })

        if (hasMore) await delay(100)
      } else {
        hasMore = false
      }
    }

    return { data: allData, error: null }
  } catch (error: any) {
    if (error.message === 'Export cancelled' || signal?.aborted) throw error
    console.error('[getFullDatabaseExport] Unexpected error:', error)
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
  }
}

export const formatFullDatabaseExport = (rows: any[]) => {
  return rows.map(row => {
    const opera = row.opere as any
    const ep = row.episodi as any
    const artista = row.artisti as any
    const ruolo = row.ruoli_tipologie as any

    return {
      // Opera
      'Codice Opera': opera?.codice_opera || '',
      'Titolo': opera?.titolo || '',
      'Titolo Originale': opera?.titolo_originale || '',
      'Alias Titoli': Array.isArray(opera?.alias_titoli) ? opera.alias_titoli.join('; ') : '',
      'Tipo': opera?.tipo || '',
      'Anno Produzione': opera?.anno_produzione ?? '',
      'Regia': Array.isArray(opera?.regista) ? opera.regista.join(', ') : '',
      'ISAN Opera': opera?.codice_isan || '',
      'IMDB Opera': opera?.imdb_tconst || '',
      'Stato Validazione': opera?.stato_validazione || '',
      // Episodio
      'Stagione': ep?.numero_stagione ?? '',
      'Episodio': ep?.numero_episodio ?? '',
      'Titolo Episodio': ep?.titolo_episodio || '',
      'Durata Episodio (min)': ep?.durata_minuti ?? '',
      'Data Prima Messa in Onda': ep?.data_prima_messa_in_onda || '',
      'ISAN Episodio': ep?.codice_isan || '',
      'IMDB Episodio': ep?.imdb_tconst || '',
      // Artista — anagrafica
      'Codice IPN': artista?.codice_ipn || '',
      'Nome': artista?.nome || '',
      'Cognome': artista?.cognome || '',
      'Nome Arte': artista?.nome_arte || '',
      'Ragione Sociale': artista?.ragione_sociale || '',
      'Codice Fiscale': artista?.codice_fiscale || '',
      'Partita IVA': artista?.partita_iva ?? '',
      'Forma Giuridica': artista?.forma_giuridica || '',
      'RASI': artista?.is_rasi ? 'Sì' : 'No',
      'Tipologia': artista?.tipologia || '',
      'Stato Artista': artista?.stato || '',
      'Data Nascita': artista?.data_nascita || '',
      'Luogo Nascita': artista?.luogo_nascita || '',
      'Paese': artista?.codice_paese || '',
      'Territorio': artista?.territorio || '',
      'Inizio Mandato': artista?.data_inizio_mandato || '',
      'Fine Mandato': artista?.data_fine_mandato || '',
      'IMDB NConst': artista?.imdb_nconst || '',
      // Contatti
      'Email Artista': (artista?.contatti as any)?.email || '',
      'Telefono Artista': (artista?.contatti as any)?.telefono || (artista?.contatti as any)?.number || '',
      // Indirizzo
      'Via': (artista?.indirizzo as any)?.via || '',
      'Civico': (artista?.indirizzo as any)?.civico || '',
      'CAP': (artista?.indirizzo as any)?.cap || '',
      'Città': (artista?.indirizzo as any)?.citta || '',
      'Provincia': (artista?.indirizzo as any)?.provincia || '',
      // Diritti e extra
      'Diritti Attivi': Array.isArray(artista?.diritti_attivi)
        ? (artista.diritti_attivi as string[]).join('; ')
        : '',
      'Componente Gruppo/Orchestra': artista?.componente_stabile_gruppo_orchestra || '',
      'Codici Esterni': artista?.codici_esterni && typeof artista.codici_esterni === 'object'
        ? Object.entries(artista.codici_esterni as Record<string, unknown>)
            .map(([k, v]) => `${k}:${v}`)
            .join('; ')
        : '',
      // Ruolo e partecipazione
      'Codice Ruolo': ruolo?.codice || '',
      'Ruolo': ruolo?.nome || '',
      'Categoria Ruolo': ruolo?.categoria || '',
      'Personaggio': row.personaggio || '',
      'Note': row.note || '',
    }
  })
}
