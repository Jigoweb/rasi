import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { supabase } from '@/shared/lib/supabase'
import { formatMatchPercent } from '@/features/individuazioni/utils/individuazioni-detail'
import {
  MATCHING_SIGNAL_CATALOG,
  extractMatchingSignalFlags,
  formatSignalFlag,
} from '@/features/individuazioni/utils/matching-signal-codes'

export interface ExportProgress {
  fetched: number
  total: number
  percentage: number
  phase: 'fetching' | 'formatting' | 'generating' | 'done'
  estimatedTimeRemaining?: number
}

export type IndividuazioneExportFormat = 'csv' | 'xlsx'

export type BulkXlsxExportProgress = ExportProgress & {
  campagnaIndex: number
  campagneTotal: number
  campagnaNome: string
}

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

export function buildIndividuazioneWorkbook(formattedData: Record<string, unknown>[]) {
  const worksheet = XLSX.utils.json_to_sheet(formattedData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Individuazioni')
  worksheet['!cols'] = getIndividuazioneExportColumnWidths(formattedData)
  return workbook
}

export function workbookToXlsxBytes(workbook: XLSX.WorkBook): Uint8Array {
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  return new Uint8Array(buffer)
}

/** Evita collisioni di nome file dentro lo ZIP. */
export function uniqueZipEntryName(baseName: string, usedNames: Set<string>): string {
  const withExt = baseName.endsWith('.xlsx') ? baseName : `${baseName}.xlsx`
  if (!usedNames.has(withExt)) {
    usedNames.add(withExt)
    return withExt
  }

  const stem = withExt.replace(/\.xlsx$/i, '')
  let index = 2
  let candidate = `${stem}_${index}.xlsx`
  while (usedNames.has(candidate)) {
    index += 1
    candidate = `${stem}_${index}.xlsx`
  }
  usedNames.add(candidate)
  return candidate
}

export function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function bytesToBlob(bytes: Uint8Array, type: string): Blob {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy.buffer], { type })
}

async function buildCampagnaXlsxBytes(
  campagna: { id: string; nome?: string | null },
  onProgress?: (progress: ExportProgress) => void,
  signal?: AbortSignal,
): Promise<{ fileName: string; bytes: Uint8Array; rowCount: number }> {
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
  const workbook = buildIndividuazioneWorkbook(formattedData)
  const bytes = workbookToXlsxBytes(workbook)
  const fileName = buildIndividuazioneExportFileName(campagna.nome, campagna.id)

  if (signal?.aborted) throw new Error('Export cancelled')
  onProgress?.({ fetched: data.length, total: data.length, percentage: 100, phase: 'done' })

  return { fileName, bytes, rowCount: data.length }
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
  if (format === 'xlsx') {
    const { fileName, bytes } = await buildCampagnaXlsxBytes(campagna, onProgress, signal)
    triggerBrowserDownload(
      bytesToBlob(bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      `${fileName}.xlsx`,
    )
    return
  }

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
  const workbook = buildIndividuazioneWorkbook(formattedData)
  const fileName = buildIndividuazioneExportFileName(campagna.nome, campagna.id)
  if (signal?.aborted) throw new Error('Export cancelled')
  onProgress?.({ fetched: data.length, total: data.length, percentage: 100, phase: 'done' })
  XLSX.writeFile(workbook, `${fileName}.csv`, { bookType: 'csv' })
}

/**
 * Esporta più campagne come XLSX: un file se ce n'è uno solo, altrimenti uno ZIP
 * con un foglio Excel per campagna.
 */
export async function downloadCampagneIndividuazioneXlsxBatch(
  campagne: Array<{ id: string; nome?: string | null }>,
  onProgress?: (progress: BulkXlsxExportProgress) => void,
  signal?: AbortSignal,
): Promise<{ exported: number; skippedEmpty: number; archiveKind: 'xlsx' | 'zip' }> {
  const files: Array<{ name: string; bytes: Uint8Array }> = []
  const usedNames = new Set<string>()
  let skippedEmpty = 0
  const total = campagne.length

  for (let index = 0; index < campagne.length; index++) {
    if (signal?.aborted) throw new Error('Export cancelled')
    const campagna = campagne[index]
    const basePct = Math.round((index / Math.max(total, 1)) * 90)

    try {
      const built = await buildCampagnaXlsxBytes(
        campagna,
        progress => {
          const localShare = Math.round((progress.percentage / 100) * (90 / Math.max(total, 1)))
          onProgress?.({
            ...progress,
            percentage: Math.min(90, basePct + localShare),
            campagnaIndex: index + 1,
            campagneTotal: total,
            campagnaNome: campagna.nome || campagna.id,
          })
        },
        signal,
      )
      files.push({
        name: uniqueZipEntryName(built.fileName, usedNames),
        bytes: built.bytes,
      })
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Nessun dato da esportare')) {
        skippedEmpty += 1
        continue
      }
      throw error
    }
  }

  if (files.length === 0) {
    return { exported: 0, skippedEmpty, archiveKind: 'xlsx' }
  }

  if (signal?.aborted) throw new Error('Export cancelled')

  if (files.length === 1) {
    onProgress?.({
      fetched: files.length,
      total: files.length,
      percentage: 100,
      phase: 'done',
      campagnaIndex: total,
      campagneTotal: total,
      campagnaNome: files[0].name,
    })
    triggerBrowserDownload(
      bytesToBlob(files[0].bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      files[0].name,
    )
    return { exported: 1, skippedEmpty, archiveKind: 'xlsx' }
  }

  onProgress?.({
    fetched: files.length,
    total: files.length,
    percentage: 95,
    phase: 'generating',
    campagnaIndex: total,
    campagneTotal: total,
    campagnaNome: `ZIP (${files.length} file)`,
  })

  const zip = new JSZip()
  for (const file of files) {
    zip.file(file.name, file.bytes)
  }

  const zipBlob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    metadata => {
      const zipPct = 95 + Math.round((metadata.percent / 100) * 5)
      onProgress?.({
        fetched: files.length,
        total: files.length,
        percentage: Math.min(99, zipPct),
        phase: 'generating',
        campagnaIndex: total,
        campagneTotal: total,
        campagnaNome: `ZIP (${files.length} file)`,
      })
    },
  )

  if (signal?.aborted) throw new Error('Export cancelled')

  const zipName = `individuazioni_export_${new Date().toISOString().split('T')[0]}.zip`
  triggerBrowserDownload(zipBlob, zipName)

  onProgress?.({
    fetched: files.length,
    total: files.length,
    percentage: 100,
    phase: 'done',
    campagnaIndex: total,
    campagneTotal: total,
    campagnaNome: zipName,
  })

  return { exported: files.length, skippedEmpty, archiveKind: 'zip' }
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
          opera_id,
          dettagli_matching,
          artisti(nome, cognome, nome_arte),
          opere(codice_opera, titolo, titolo_originale),
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
  return individuazioni.map(ind => {
    const signalFlags = extractMatchingSignalFlags(ind.dettagli_matching, {
      numero_episodio: ind.numero_episodio,
      numero_stagione: ind.numero_stagione,
    })
    const signalColumns = Object.fromEntries(
      MATCHING_SIGNAL_CATALOG.map(item => [item.label, formatSignalFlag(signalFlags[item.code])]),
    )

    return {
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
      opera_matchata: ind.opere?.titolo || '',
      opera_titolo_originale: ind.opere?.titolo_originale || '',
      codice_opera: ind.opere?.codice_opera || '',
      ruolo: ind.ruoli_tipologie?.nome || '',
      tasso_matching: formatMatchPercent(ind.punteggio_matching),
      metodo_matching: ind.metodo || '',
      stato: ind.stato || '',
      ...signalColumns,
    }
  })
}
