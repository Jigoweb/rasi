/**
 * Alert sulla scheda artista. Stesse soglie di `get_alert_scadenze` (SQL):
 * documento entro 60 giorni, 18 anni entro un mese, 80 anni compiuti.
 */

export const GIORNI_PREAVVISO_DOCUMENTO = 60

export type ArtistaAlertTipo =
  | 'documento_scaduto'
  | 'documento_in_scadenza'
  | 'maggiore_eta'
  | 'minorenne_da_aggiornare'
  | 'over_80'

export type ArtistaAlert = {
  tipo: ArtistaAlertTipo
  severita: 'high' | 'medium' | 'low'
  label: string
  data: string
}

export type ArtistaAlertInput = {
  stato?: string | null
  data_nascita?: string | null
  documento_data_scadenza?: string | null
}

type Ymd = { y: number; m: number; d: number }

function parseYmd(value: string | null | undefined): Ymd | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

function toUtc({ y, m, d }: Ymd): number {
  return Date.UTC(y, m - 1, d)
}

function formatYmd({ y, m, d }: Ymd): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Come `date + interval 'n years'` in Postgres: il 29/2 diventa 28/2. */
export function addYears(value: string, years: number): string | null {
  const parsed = parseYmd(value)
  if (!parsed) return null
  const y = parsed.y + years
  const lastDay = new Date(Date.UTC(y, parsed.m, 0)).getUTCDate()
  return formatYmd({ y, m: parsed.m, d: Math.min(parsed.d, lastDay) })
}

function addMonths(day: Ymd, months: number): Ymd {
  const total = day.m - 1 + months
  const y = day.y + Math.floor(total / 12)
  const m = (total % 12) + 1
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { y, m, d: Math.min(day.d, lastDay) }
}

export function todayYmd(now: Date = new Date()): string {
  return formatYmd({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() })
}

export function etaAnni(dataNascita: string | null | undefined, oggi: string = todayYmd()): number | null {
  const nascita = parseYmd(dataNascita)
  const today = parseYmd(oggi)
  if (!nascita || !today) return null
  let eta = today.y - nascita.y
  if (today.m < nascita.m || (today.m === nascita.m && today.d < nascita.d)) eta -= 1
  return eta
}

export function formatDataIt(value: string): string {
  const parsed = parseYmd(value)
  if (!parsed) return value
  return `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${parsed.y}`
}

export function computeArtistaAlerts(artista: ArtistaAlertInput, oggi: string = todayYmd()): ArtistaAlert[] {
  const today = parseYmd(oggi)
  if (!today) return []
  if (artista.stato === 'deceduto' || artista.stato === 'cessato') return []

  const alerts: ArtistaAlert[] = []
  const todayMs = toUtc(today)

  const scadenza = parseYmd(artista.documento_data_scadenza)
  if (scadenza) {
    const scadenzaMs = toUtc(scadenza)
    const limiteMs = todayMs + GIORNI_PREAVVISO_DOCUMENTO * 86_400_000
    const data = formatYmd(scadenza)
    if (scadenzaMs < todayMs) {
      alerts.push({ tipo: 'documento_scaduto', severita: 'high', label: `Documento scaduto il ${formatDataIt(data)}`, data })
    } else if (scadenzaMs <= limiteMs) {
      alerts.push({ tipo: 'documento_in_scadenza', severita: 'medium', label: `Documento in scadenza il ${formatDataIt(data)}`, data })
    }
  }

  if (artista.data_nascita) {
    const compie18 = addYears(artista.data_nascita, 18)
    const compie80 = addYears(artista.data_nascita, 80)
    const compie18Ymd = parseYmd(compie18)
    if (compie18 && compie18Ymd) {
      const ms = toUtc(compie18Ymd)
      const fraUnMese = toUtc(addMonths(today, 1))
      if (ms >= todayMs && ms <= fraUnMese) {
        alerts.push({ tipo: 'maggiore_eta', severita: 'medium', label: `Compie 18 anni il ${formatDataIt(compie18)}`, data: compie18 })
      } else if (ms < todayMs && artista.stato === 'minorenne') {
        alerts.push({
          tipo: 'minorenne_da_aggiornare',
          severita: 'high',
          label: `Maggiorenne dal ${formatDataIt(compie18)}: aggiornare lo stato`,
          data: compie18,
        })
      }
    }
    const compie80Ymd = parseYmd(compie80)
    if (compie80 && compie80Ymd && toUtc(compie80Ymd) <= todayMs) {
      alerts.push({ tipo: 'over_80', severita: 'low', label: `${etaAnni(artista.data_nascita, oggi)} anni`, data: compie80 })
    }
  }

  return alerts
}
