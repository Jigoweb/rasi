import {
  listProgrammazioniByCampagnaKeyset,
  type ProgrammazioneRow,
  type ProgrammazioniCursor,
} from './programmazioni.service'

/** Righe lette per richiesta: abbastanza piccole da stare sotto lo statement timeout. */
export const PROGRAMMAZIONI_EXPORT_PAGE_SIZE = 1000

export type ProgrammazioneExportRow = Record<string, string | number>

function text(value: unknown): string {
  if (value == null) return ''
  return String(value)
}

function num(value: number | null | undefined): number | '' {
  return typeof value === 'number' && Number.isFinite(value) ? value : ''
}

function formatErrori(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * Programmazione «sistemata» così come è in piattaforma (dopo mappatura,
 * normalizzazione e correzioni), una riga per trasmissione.
 */
export function formatProgrammazioniForExport(rows: ProgrammazioneRow[]): ProgrammazioneExportRow[] {
  return rows.map(row => ({
    data_trasmissione: text(row.data_trasmissione),
    ora_inizio: text(row.ora_inizio),
    ora_fine: text(row.ora_fine),
    durata_minuti: num(row.durata_minuti),
    canale: text(row.canale),
    emittente: text(row.emittente),
    titolo: text(row.titolo),
    titolo_originale: text(row.titolo_originale),
    numero_stagione: num(row.numero_stagione),
    numero_episodio: num(row.numero_episodio),
    titolo_episodio: text(row.titolo_episodio),
    titolo_episodio_originale: text(row.titolo_episodio_originale),
    tipo: text(row.tipo_trasmissione || row.tipo),
    fascia_oraria: text(row.fascia_oraria),
    anno_rilascio: num(row.anno_rilascio ?? row.anno),
    anno_rilascio_fine: num(row.anno_rilascio_fine ?? row.anno_fine),
    anno_produzione: num(row.anno_produzione),
    anno_produzione_fine: num(row.anno_produzione_fine),
    regia: text(row.regia),
    descrizione: text(row.descrizione),
    sales_month: text(row.sales_month),
    views: num(row.views),
    retail_price: num(row.retail_price),
    total_revenue: num(row.total_revenue),
    total_net_ad_revenue: num(row.total_net_ad_revenue),
    processato: row.processato ? 'si' : 'no',
    errori_processamento: formatErrori(row.errori_processamento),
  }))
}

/**
 * Legge tutte le programmazioni della campagna a pagine (keyset), come la
 * tabella del dettaglio.
 */
export async function fetchAllProgrammazioniForExport(
  campagnaId: string,
  options?: {
    onProgress?: (fetched: number) => void
    signal?: AbortSignal
    pageSize?: number
  }
): Promise<{ data: ProgrammazioneRow[]; error: unknown }> {
  const pageSize = options?.pageSize ?? PROGRAMMAZIONI_EXPORT_PAGE_SIZE
  const all: ProgrammazioneRow[] = []
  let cursor: ProgrammazioniCursor | undefined

  do {
    if (options?.signal?.aborted) return { data: all, error: new Error('Export annullato') }
    const { data, nextCursor, error } = await listProgrammazioniByCampagnaKeyset(campagnaId, pageSize, cursor)
    if (error) return { data: all, error }
    all.push(...(data ?? []))
    options?.onProgress?.(all.length)
    cursor = nextCursor
  } while (cursor)

  // La tabella legge dal più recente: nel file si va in ordine di messa in onda.
  all.sort((a, b) => {
    const da = `${a.data_trasmissione ?? ''} ${a.ora_inizio ?? ''}`
    const db = `${b.data_trasmissione ?? ''} ${b.ora_inizio ?? ''}`
    return da.localeCompare(db)
  })

  return { data: all, error: null }
}

export function buildProgrammazioniExportFileName(nomeCampagna: string | null | undefined, date = new Date()): string {
  const safe = (nomeCampagna || 'programmazione')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
  return `programmazione_${safe || 'campagna'}_${date.toISOString().split('T')[0]}`
}
