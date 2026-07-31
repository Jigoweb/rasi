import * as XLSX from 'xlsx'
import { supabase } from '@/shared/lib/supabase'

export interface ExportProgress {
  fetched: number
  total: number
  percentage: number
  phase: 'fetching' | 'formatting' | 'generating' | 'done'
  estimatedTimeRemaining?: number
}

export type IndividuazioneExportFormat = 'csv' | 'xlsx'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function buildIndividuazioneExportFileName(campagnaNome: string | null | undefined, campagnaId: string): string {
  const safeName = campagnaNome?.replace(/[^a-z0-9]/gi, '_') || campagnaId
  return `individuazioni_${safeName}_${new Date().toISOString().split('T')[0]}`
}

export function getIndividuazioneExportColumnWidths(formattedData: Record<string, unknown>[]) {
  return Object.keys(formattedData[0] || {}).map(key => ({
    wch: Math.min(50, Math.max(key.length, ...formattedData.map(row => String(row[key] || '').length))),
  }))
}

/**
 * Scarica un singolo file CSV/XLSX per una campagna di individuazione.
 */
export async function downloadCampagnaIndividuazioneExport(
  campagna: { id: string; nome?: string | null },
  format: IndividuazioneExportFormat,
  onProgress?: (progress: ExportProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const { data, error } = await getIndividuazioniForExport(campagna.id, onProgress, signal)

  if (signal?.aborted) throw new Error('Export cancelled')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error(`Nessun dato da esportare per "${campagna.nome || campagna.id}"`)
  }

  onProgress?.({ fetched: data.length, total: data.length, percentage: 90, phase: 'formatting' })
  const formattedData = formatIndividuazioniForExport(data)
  if (signal?.aborted) throw new Error('Export cancelled')

  onProgress?.({ fetched: data.length, total: data.length, percentage: 95, phase: 'generating' })
  const worksheet = XLSX.utils.json_to_sheet(formattedData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Individuazioni')
  worksheet['!cols'] = getIndividuazioneExportColumnWidths(formattedData)

  const fileName = buildIndividuazioneExportFileName(campagna.nome, campagna.id)
  if (signal?.aborted) throw new Error('Export cancelled')
  onProgress?.({ fetched: data.length, total: data.length, percentage: 100, phase: 'done' })

  if (format === 'csv') {
    XLSX.writeFile(workbook, `${fileName}.csv`, { bookType: 'csv' })
  } else {
    XLSX.writeFile(workbook, `${fileName}.xlsx`, { bookType: 'xlsx' })
  }
}

/**
 * Esporta più campagne come file XLSX distinti (uno per campagna), in sequenza.
 */
export async function downloadCampagneIndividuazioneXlsxBatch(
  campagne: Array<{ id: string; nome?: string | null }>,
  onProgress?: (progress: ExportProgress & { campagnaIndex: number; campagneTotal: number; campagnaNome: string }) => void,
  signal?: AbortSignal,
): Promise<{ exported: number; skippedEmpty: number }> {
  let exported = 0
  let skippedEmpty = 0
  const total = campagne.length

  for (let index = 0; index < campagne.length; index++) {
    if (signal?.aborted) throw new Error('Export cancelled')
    const campagna = campagne[index]
    const basePct = Math.round((index / total) * 100)

    try {
      await downloadCampagnaIndividuazioneExport(
        campagna,
        'xlsx',
        progress => {
          const localShare = Math.round(progress.percentage / total)
          onProgress?.({
            ...progress,
            percentage: Math.min(99, basePct + localShare),
            campagnaIndex: index + 1,
            campagneTotal: total,
            campagnaNome: campagna.nome || campagna.id,
          })
        },
        signal,
      )
      exported += 1
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Nessun dato da esportare')) {
        skippedEmpty += 1
        continue
      }
      throw error
    }

    // Piccola pausa tra download multipli così il browser non li blocca.
    if (index < campagne.length - 1) {
      await delay(350)
    }
  }

  onProgress?.({
    fetched: exported,
    total: exported,
    percentage: 100,
    phase: 'done',
    campagnaIndex: total,
    campagneTotal: total,
    campagnaNome: `${exported} file`,
  })

  return { exported, skippedEmpty }
}

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
