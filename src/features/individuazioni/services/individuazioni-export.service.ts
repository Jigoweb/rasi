import { supabase } from '@/shared/lib/supabase'

export interface ExportProgress {
  fetched: number
  total: number
  percentage: number
  phase: 'fetching' | 'formatting' | 'generating' | 'done'
  estimatedTimeRemaining?: number
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const getIndividuazioniForExport = async (
  campagnaId: string,
  onProgress?: (progress: ExportProgress) => void,
  signal?: AbortSignal
) => {
  try {
    if (signal?.aborted) {
      throw new Error('Export cancelled')
    }

    const { count: totalCount, error: countError } = await (supabase as any)
      .from('individuazioni')
      .select('*', { count: 'exact', head: true })
      .eq('campagna_individuazioni_id', campagnaId)

    if (countError) {
      return { data: null, error: countError }
    }

    const total = totalCount || 0
    if (total === 0) {
      return { data: [], error: null }
    }

    const batchSize = 500
    const allData: any[] = []
    let lastId: string | null = null
    let hasMore = true
    const startTime = Date.now()

    while (hasMore) {
      if (signal?.aborted) {
        throw new Error('Export cancelled')
      }

      let query = (supabase as any)
        .from('individuazioni')
        .select(`
          id,
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
          punteggio_matching,
          metodo,
          stato,
          artisti(nome, cognome, nome_arte),
          ruoli_tipologie(nome)
        `)
        .eq('campagna_individuazioni_id', campagnaId)
        .order('id', { ascending: true })
        .limit(batchSize)

      if (lastId) {
        query = query.gt('id', lastId)
      }

      const { data, error } = await query

      if (error) {
        return { data: null, error }
      }

      if (data && data.length > 0) {
        allData.push(...data)
        lastId = data[data.length - 1].id
        hasMore = data.length === batchSize

        const elapsed = (Date.now() - startTime) / 1000
        const rate = allData.length / elapsed
        const remaining = total - allData.length
        const estimatedTimeRemaining = rate > 0 ? Math.round(remaining / rate) : undefined
        const fetched = allData.length
        const percentage = total > 0 ? Math.round((fetched / total) * 100) : 0
        onProgress?.({
          fetched,
          total,
          percentage,
          phase: 'fetching',
          estimatedTimeRemaining,
        })

        if (hasMore) {
          await delay(100)
        }
      } else {
        hasMore = false
      }
    }

    return { data: allData, error: null }
  } catch (error) {
    if (error instanceof Error && (error.message === 'Export cancelled' || signal?.aborted)) {
      throw error
    }
    console.error('[getIndividuazioniForExport] Unexpected error:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    }
  }
}

export const formatIndividuazioniForExport = (individuazioni: any[]) => {
  return individuazioni.map(ind => ({
    canale: ind.canale || '',
    emittente: ind.emittente || '',
    tipo: ind.tipo || '',
    titolo: ind.titolo || '',
    titolo_originale: ind.titolo_originale || '',
    numero_episodio: ind.numero_episodio ?? '',
    titolo_episodio: ind.titolo_episodio || '',
    titolo_episodio_originale: ind.titolo_episodio_originale || '',
    numero_stagione: ind.numero_stagione ?? '',
    anno: ind.anno ?? '',
    production: ind.production || '',
    regia: ind.regia || '',
    data_trasmissione: ind.data_trasmissione || '',
    ora_inizio: ind.ora_inizio || '',
    ora_fine: ind.ora_fine || '',
    durata_minuti: ind.durata_minuti ?? '',
    data_inizio: ind.data_inizio || '',
    data_fine: ind.data_fine || '',
    retail_price: ind.retail_price ?? '',
    sales_month: ind.sales_month ?? '',
    track_price_local_currency: ind.track_price_local_currency ?? '',
    views: ind.views ?? '',
    total_net_ad_revenue: ind.total_net_ad_revenue ?? '',
    total_revenue: ind.total_revenue ?? '',
    artista: ind.artisti ? (ind.artisti.nome_arte || `${ind.artisti.nome || ''} ${ind.artisti.cognome || ''}`.trim()) : '',
    ruolo: ind.ruoli_tipologie?.nome || '',
    tasso_matching: ind.punteggio_matching != null ? `${Math.round(ind.punteggio_matching * 100)}%` : '',
    metodo_matching: ind.metodo || '',
    stato: ind.stato || '',
  }))
}
