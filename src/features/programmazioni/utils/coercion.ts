/**
 * Utility di coercion per i campi del template programmazione.
 * Estratto da page.tsx per condividere la logica con import-mapping.service.
 */

/**
 * Normalizza una chiave colonna (lowercase + trim).
 */
export function normalizeKey(k: string): string {
  return String(k).toLowerCase().trim()
}

/**
 * Set di campi template accettati come destinazione di mapping/import.
 */
export const TEMPLATE_FIELDS: ReadonlyArray<string> = [
  'canale',
  'emittente',
  'tipo',
  'titolo',
  'titolo_originale',
  'numero_episodio',
  'titolo_episodio',
  'titolo_episodio_originale',
  'numero_stagione',
  'anno',
  'production',
  'regia',
  'data_trasmissione',
  'ora_inizio',
  'ora_fine',
  'durata_minuti',
  'data_inizio',
  'data_fine',
  'retail_price',
  'sales_month',
  'track_price_local_currency',
  'views',
  'total_net_ad_revenue',
  'total_revenue',
]

export const TEMPLATE_FIELDS_SET: ReadonlySet<string> = new Set(TEMPLATE_FIELDS)

const TEMPLATE_FIELD_LABELS: Partial<Record<string, string>> = {
  anno: 'Anno rilascio',
}

export function templateFieldLabel(field: string): string {
  return TEMPLATE_FIELD_LABELS[field] ?? field
}

/**
 * Valida un valore orario in formato HH:MM o HH:MM:SS.
 * Restituisce HH:MM:SS normalizzato, o la stringa originale se non parsabile.
 */
export function validateTime(timeStr: any): string | undefined {
  if (!timeStr) return undefined
  const str = String(timeStr).trim()
  const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return str
  let hours = parseInt(match[1])
  const minutes = parseInt(match[2])
  const seconds = match[3] ? parseInt(match[3]) : 0
  if (hours >= 24) hours = hours % 24
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Valida una data in formati comuni (ISO, DD/MM/YY, DD/MM/YYYY, DD-MM-YY, DD-MM-YYYY)
 * e la normalizza a YYYY-MM-DD. Anni <=50 → 2000+, >50 → 1900+.
 */
export function validateDate(dateStr: any): string | undefined {
  if (!dateStr) return undefined
  const str = String(dateStr).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0')
    const month = slashMatch[2].padStart(2, '0')
    let year = slashMatch[3]
    if (year.length === 2) {
      const yearNum = parseInt(year)
      year = yearNum > 50 ? `19${year}` : `20${year}`
    }
    return `${year}-${month}-${day}`
  }

  const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/)
  if (dashMatch) {
    const day = dashMatch[1].padStart(2, '0')
    const month = dashMatch[2].padStart(2, '0')
    let year = dashMatch[3]
    if (year.length === 2) {
      const yearNum = parseInt(year)
      year = yearNum > 50 ? `19${year}` : `20${year}`
    }
    return `${year}-${month}-${day}`
  }

  return str
}

/**
 * Coerce un valore al tipo corretto in base alla chiave del campo template.
 * - Interi: numero_episodio, numero_stagione, anno, views, durata_minuti
 * - Decimali: retail_price, track_price_local_currency, total_net_ad_revenue, total_revenue
 * - sales_month: passato as-is (string|number) → gestito poi da parseSalesMonth nella pipeline adattiva
 * - Orari: ora_inizio, ora_fine
 * - Date: data_trasmissione, data_inizio, data_fine
 * - Altri: as-is
 */
export function coerce(key: string, value: any): any {
  if (value === undefined || value === null || value === '') return undefined
  switch (key) {
    case 'numero_episodio':
    case 'numero_stagione':
    case 'anno':
    case 'views':
    case 'durata_minuti': {
      const n = parseInt(String(value))
      return Number.isFinite(n) ? n : undefined
    }
    case 'sales_month': {
      // DB column type: integer (YYYYMM). Normalizza vari formati:
      //   "2024-03" → 202403
      //   "2024/03" → 202403
      //   "2024.03" → 202403
      //   "202403"  → 202403
      //   202403    → 202403
      if (typeof value === 'number' && Number.isFinite(value)) return value
      const str = String(value).trim()
      let m = str.match(/^(\d{4})[-/.](\d{1,2})$/)
      if (m) return parseInt(m[1] + m[2].padStart(2, '0'))
      m = str.match(/^(\d{6})$/)
      if (m) return parseInt(m[1])
      const n = parseInt(str)
      return Number.isFinite(n) ? n : undefined
    }
    case 'retail_price':
    case 'track_price_local_currency':
    case 'total_net_ad_revenue':
    case 'total_revenue': {
      const n = parseFloat(String(value).replace(',', '.'))
      return Number.isFinite(n) ? n : undefined
    }
    case 'ora_inizio':
    case 'ora_fine':
      return validateTime(value)
    case 'data_trasmissione':
    case 'data_inizio':
    case 'data_fine':
      return validateDate(value)
    default:
      return value
  }
}
