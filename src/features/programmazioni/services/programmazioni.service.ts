import { supabase } from '@/shared/lib/supabase'

export interface CampagnaProgrammazionePayload {
  emittente_id: string
  anno: number
  nome: string
  descrizione?: string
  stato?: string
  created_by?: string
}

export interface CampagnaProgrammazione {
  id: string
  emittente_id: string
  anno: number
  nome: string
  descrizione?: string | null
  stato: string
  created_at: string
  created_by: string | null
  processing_by?: string | null
  processing_started_at?: string | null
  emittenti?: {
    nome: string
  }
  programmazioni_count?: number
}

export const getCampagneProgrammazione = async () => {
  try {
    const { data, error } = await (supabase as any).rpc('get_campagne_programmazione_with_counts')
    if (error) {
      console.error('[getCampagneProgrammazione] RPC error:', error)
      return { data: null, error }
    }
    if (!data || data.length === 0) {
      return { data: [], error: null }
    }
    const transformed = (data as any[]).map(row => ({
      ...row,
      emittenti: row.emittente_nome ? { nome: row.emittente_nome } : undefined,
    }))
    return { data: transformed as unknown as CampagnaProgrammazione[], error: null }
  } catch (error: any) {
    console.error('[getCampagneProgrammazione] Unexpected error:', error)
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) }
  }
}

export const createCampagnaProgrammazione = async (payload: CampagnaProgrammazionePayload) => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  const payloadWithUser = {
    ...payload,
    stato: 'bozza',
    created_by: user?.id
  }

  const { data, error } = await supabase
    .from('campagne_programmazione' as any) // Type assertion until schema is updated
    .insert([payloadWithUser])
    .select()
    .single()

  return { data, error }
}

export interface ProgrammazionePayload {
  campagna_programmazione_id: string
  emittente_id: string
  titolo: string
  tipo: string
  data_trasmissione?: string
  ora_inizio?: string
  ora_fine?: string
  durata_minuti?: number
  titolo_originale?: string
  numero_episodio?: number
  titolo_episodio?: string
  titolo_episodio_originale?: string
  numero_stagione?: number
  anno?: number
  production?: string
  regia?: string
  data_inizio?: string
  data_fine?: string
  retail_price?: number
  sales_month?: string | number
  track_price_local_currency?: number
  views?: number
  total_net_ad_revenue?: number
  total_revenue?: number
  canale?: string
  emittente?: string
}

// ============================================
// NORMALIZZAZIONE IMPORT (zero-config, applicata sempre)
// ============================================

/**
 * Converte una stringa in Title Case se rilevata come ALL CAPS.
 * Se meno del 40% delle lettere sono lowercase, applica title case.
 * Conserva la stringa originale altrimenti.
 */
export function toTitleCase(str: string | null | undefined): string | null | undefined {
  if (!str || typeof str !== 'string') return str
  const totalLetters = (str.match(/[a-zA-Z]/g) || []).length
  const lowerCount = (str.match(/[a-z]/g) || []).length
  if (totalLetters > 0 && lowerCount / totalLetters < 0.4) {
    return str.toLowerCase().replace(/(?:^|\s|[-–(])\S/g, c => c.toUpperCase())
  }
  return str
}

/**
 * Rimuove suffissi ridondanti comuni dai titoli (case-insensitive).
 * Es: "Casino (Original)" → "Casino"
 */
const SUFFISSI_DA_RIMUOVERE: RegExp[] = [
  /\s*\(original\)/gi,
  /\s*\(versione italiana\)/gi,
  /\s*\(ov\)/gi,
  /\s*\(sub ita\)/gi,
]

export function stripSuffissi(str: string | null | undefined): string | null | undefined {
  if (!str || typeof str !== 'string') return str
  let result = str
  for (const re of SUFFISSI_DA_RIMUOVERE) {
    result = result.replace(re, '')
  }
  return result.trim()
}

/**
 * Pipeline completa per i campi titolo: title case + rimozione suffissi.
 */
export function normalizzaTitolo(str: string | null | undefined): string | null | undefined {
  if (!str || typeof str !== 'string') return str
  return stripSuffissi(toTitleCase(str))
}

/**
 * Dizionario globale di mapping tipo non canonico → canonico.
 * Output canonico: 'serie', 'film', 'live', 'speciale'.
 */
const TIPO_MAPPING: Record<string, string> = {
  tv: 'serie',
  series: 'serie',
  episode: 'serie',
  episodio: 'serie',
  serie: 'serie',
  movie: 'film',
  film: 'film',
  feature: 'film',
  live: 'live',
  'live tv': 'live',
  special: 'speciale',
  speciale: 'speciale',
}

export function normalizzaTipo(tipo: string | null | undefined): string | null | undefined {
  if (!tipo || typeof tipo !== 'string') return tipo
  const key = tipo.toLowerCase().trim()
  return TIPO_MAPPING[key] ?? key
}

/**
 * Parsa `sales_month` dai possibili formati Excel/CSV e restituisce data ISO YYYY-MM-01.
 * Formati supportati:
 *  - "2024-03" / "2024/03"
 *  - "202403"
 *  - "2024.03"
 *  - Excel serial number (~30000-60000)
 */
export function parseSalesMonth(value: string | number | undefined | null): string | null {
  if (value == null || value === '') return null
  const str = String(value).trim()
  if (!str) return null

  // Formato "YYYY-MM" o "YYYY/MM"
  let m = str.match(/^(\d{4})[-/](\d{1,2})$/)
  if (m) {
    const month = m[2].padStart(2, '0')
    return `${m[1]}-${month}-01`
  }

  // Formato "YYYYMM" (es. 202403)
  m = str.match(/^(\d{4})(\d{2})$/)
  if (m) return `${m[1]}-${m[2]}-01`

  // Formato decimale "YYYY.MM" (es. 2024.03)
  m = str.match(/^(\d{4})\.(\d{1,2})$/)
  if (m) {
    const month = m[2].padStart(2, '0')
    return `${m[1]}-${month}-01`
  }

  // Excel serial date (numero in range plausibile moderno)
  const n = Number(str)
  if (Number.isFinite(n) && n > 30000 && n < 60000) {
    // Excel epoch: 1899-12-30 (compensato il bug 1900-02-29)
    const ms = (n - 25569) * 86400 * 1000
    const d = new Date(ms)
    if (!isNaN(d.getTime())) {
      const y = d.getUTCFullYear()
      const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
      return `${y}-${mo}-01`
    }
  }

  return null
}

/**
 * Determina la `data_trasmissione` con fallback:
 *  1. data_trasmissione esplicita
 *  2. sales_month → primo giorno del mese
 *  3. data_inizio
 */
export function normalizzaData(row: ProgrammazionePayload): string | null {
  if (row.data_trasmissione) return row.data_trasmissione
  const fromSales = parseSalesMonth(row.sales_month)
  if (fromSales) return fromSales
  if (row.data_inizio) return row.data_inizio
  return null
}

/**
 * Normalizza encoding compatto del numero episodio (rilevato su Pluto TV).
 * Es: numero_stagione=17, numero_episodio=1701 → episodio_reale=1
 * Regola: se numero_episodio ∈ [stagione*100+1, stagione*100+99] → sottrai stagione*100
 * Auto-detection non ambigua: numerazione standard non genera mai questo pattern.
 */
export function normalizzaEpisodio(
  numero_episodio: number | null | undefined,
  numero_stagione: number | null | undefined
): number | null | undefined {
  if (numero_episodio == null || numero_stagione == null) return numero_episodio
  if (numero_episodio <= 0 || numero_stagione <= 0) return numero_episodio
  const prefix = numero_stagione * 100
  if (numero_episodio >= prefix + 1 && numero_episodio <= prefix + 99) {
    return numero_episodio - prefix
  }
  return numero_episodio
}

/**
 * Applica tutte le normalizzazioni a una singola riga del payload.
 * Zero-config, applicata sempre, idempotente.
 */
export function normalizzaProgrammazione(row: ProgrammazionePayload): ProgrammazionePayload {
  const titolo = normalizzaTitolo(row.titolo) as string
  const titolo_originale = normalizzaTitolo(row.titolo_originale) as string | undefined
  const titolo_episodio = normalizzaTitolo(row.titolo_episodio) as string | undefined
  const titolo_episodio_originale = normalizzaTitolo(row.titolo_episodio_originale) as
    | string
    | undefined
  const tipo = normalizzaTipo(row.tipo) as string
  const numero_episodio = normalizzaEpisodio(row.numero_episodio, row.numero_stagione) as
    | number
    | undefined
  const data_trasmissione = normalizzaData(row) ?? row.data_trasmissione

  return {
    ...row,
    titolo,
    titolo_originale,
    titolo_episodio,
    titolo_episodio_originale,
    tipo,
    numero_episodio,
    data_trasmissione,
  }
}

export const uploadProgrammazioni = async (programmazioni: ProgrammazionePayload[]) => {
  const normalized = programmazioni.map(normalizzaProgrammazione)
  // No .select() — callers only check `error`. Returning N rows × 13 columns
  // adds 1-2s serialization on large batches and burns network round-trip budget.
  const { error } = await supabase
    .from('programmazioni')
    .insert(normalized as any)

  return { data: null, error }
}

export const updateCampagnaStatus = async (id: string, stato: string) => {
  const { data, error } = await supabase
    .from('campagne_programmazione' as any)
    .update({ stato })
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

// ============================================
// DELETE CAMPAGNA PROGRAMMAZIONE
// ============================================

export type DeleteCampagnaProgrammazioneScenario = 
  | 'empty'           // 1.1 - Nessun record associato
  | 'has_data'        // 1.2 - Ha dati ma nessuna individuazione
  | 'has_individuazione' // 1.3 - Esiste campagna individuazione collegata

export interface DeleteCampagnaProgrammazioneInfo {
  scenario: DeleteCampagnaProgrammazioneScenario
  programmazioni_count: number
  campagna_individuazione_id?: string
  campagna_individuazione_nome?: string
  individuazioni_count?: number
}

/**
 * Verifica lo scenario di cancellazione per una campagna programmazione
 */
export const getDeleteCampagnaProgrammazioneInfo = async (campagnaId: string): Promise<{ data: DeleteCampagnaProgrammazioneInfo | null; error: any }> => {
  try {
    // Count programmazioni associate
    const { count: programmazioni_count, error: progError } = await supabase
      .from('programmazioni')
      .select('*', { count: 'exact', head: true })
      .eq('campagna_programmazione_id', campagnaId)

    if (progError) throw progError

    // Check if campagna individuazione exists
    const { data: campagnaIndividuazione, error: ciError } = await (supabase as any)
      .from('campagne_individuazione')
      .select('id, nome')
      .eq('campagne_programmazione_id', campagnaId)
      .maybeSingle()

    if (ciError) throw ciError

    let individuazioni_count = 0
    if (campagnaIndividuazione) {
      const { count, error: indError } = await (supabase as any)
        .from('individuazioni')
        .select('*', { count: 'exact', head: true })
        .eq('campagna_individuazioni_id', campagnaIndividuazione.id)

      if (indError) throw indError
      individuazioni_count = count || 0
    }

    const scenario: DeleteCampagnaProgrammazioneScenario = 
      campagnaIndividuazione ? 'has_individuazione' :
      (programmazioni_count || 0) > 0 ? 'has_data' : 'empty'

    return {
      data: {
        scenario,
        programmazioni_count: programmazioni_count || 0,
        campagna_individuazione_id: campagnaIndividuazione?.id,
        campagna_individuazione_nome: campagnaIndividuazione?.nome,
        individuazioni_count
      },
      error: null
    }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Elimina una campagna programmazione
 * - Scenario 'empty' o 'has_data': cancella direttamente (programmazioni hanno CASCADE)
 * - Scenario 'has_individuazione': ritorna errore - deve prima cancellare la campagna individuazione
 */
export const deleteCampagnaProgrammazione = async (campagnaId: string): Promise<{ data: any; error: any; blocked?: boolean; blockReason?: string }> => {
  // Prima verifica lo scenario
  const { data: info, error: infoError } = await getDeleteCampagnaProgrammazioneInfo(campagnaId)
  
  if (infoError) {
    return { data: null, error: infoError }
  }

  if (!info) {
    return { data: null, error: new Error('Campagna non trovata') }
  }

  // Scenario 1.3: Blocca se esiste campagna individuazione
  if (info.scenario === 'has_individuazione') {
    return {
      data: null,
      error: null,
      blocked: true,
      blockReason: `Esiste una campagna di individuazione collegata ("${info.campagna_individuazione_nome}") con ${info.individuazioni_count?.toLocaleString()} individuazioni. Devi prima eliminarla dalla pagina Individuazioni.`
    }
  }

  // Scenario 1.1 e 1.2: Procedi con la cancellazione
  // Le programmazioni verranno cancellate in CASCADE
  const { data, error } = await supabase
    .from('campagne_programmazione' as any)
    .delete()
    .eq('id', campagnaId)
    .select()

  return { data, error }
}

export const getCampagnaProgrammazioneById = async (id: string) => {
  const { data, error } = await supabase
    .from('campagne_programmazione' as any)
    .select('*, emittenti(nome)')
    .eq('id', id)
    .single()

  return { data: (data as unknown) as CampagnaProgrammazione, error }
}

export interface ProcessingProgress {
  campagna_individuazione_id?: string
  programmazioni_processate: number
  programmazioni_totali: number
  individuazioni_create: number
  percentuale: number
  processing_by?: string | null
  processing_started_at?: string | null
  last_activity_at?: string | null  // Timestamp of last individuazione created
  activity_source?: ProcessingActivitySource
  job_id?: string | null
  job_stato?: ProcessingJobState | null
  job_updated_at?: string | null
}

/** Minutes of inactivity after which an in-progress process is considered stale ("bloccato"). */
export const PROCESSING_STALE_THRESHOLD_MIN = 10

export type ProcessingActivitySource = 'campaign_jobs' | 'individuazioni' | 'unknown'

export type ProcessingJobState = 'queued' | 'running' | 'error' | 'completed' | 'cancelled'

type ProcessingActivityProgress = Pick<ProcessingProgress, 'last_activity_at'>

type ProcessingActivityJob = {
  id?: string | null
  stato?: ProcessingJobState | null
  updated_at?: string | null
}

const PROCESSING_ACTIVITY_JOB_STATES: ProcessingJobState[] = ['queued', 'running', 'error']

export function isProcessingActivityJobEligible(
  job: ProcessingActivityJob | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!job?.stato) return false
  if (job.stato === 'queued' || job.stato === 'running') return true
  if (job.stato !== 'error' || !job.updated_at) return false

  const minutesSinceJobUpdate = minutesSinceProcessingActivity(
    { last_activity_at: job.updated_at },
    now,
  )
  return minutesSinceJobUpdate !== null && minutesSinceJobUpdate <= PROCESSING_STALE_THRESHOLD_MIN
}

export function resolveProcessingActivity(
  progress: ProcessingActivityProgress | null | undefined,
  job: ProcessingActivityJob | null | undefined,
  now: number = Date.now(),
): { last_activity_at: string | null; activity_source: ProcessingActivitySource } {
  if (isProcessingActivityJobEligible(job, now)) {
    return {
      last_activity_at: job?.updated_at ?? null,
      activity_source: 'campaign_jobs',
    }
  }

  if (progress?.last_activity_at) {
    return {
      last_activity_at: progress.last_activity_at,
      activity_source: 'individuazioni',
    }
  }

  return {
    last_activity_at: null,
    activity_source: 'unknown',
  }
}

/**
 * Minutes elapsed since the last processing activity, or null when unknown
 * (no progress record / no last_activity_at). `now` is injectable for testing.
 */
export function minutesSinceProcessingActivity(
  progress: Pick<ProcessingProgress, 'last_activity_at'> | null | undefined,
  now: number = Date.now(),
): number | null {
  const ts = progress?.last_activity_at
  if (!ts) return null
  return Math.floor((now - new Date(ts).getTime()) / 1000 / 60)
}

/**
 * True when an `in_corso` process has shown no activity for longer than the
 * stale threshold — i.e. the UI should surface it as "Bloccato" rather than
 * "Processamento...". Unknown activity (null) is treated as NOT stale.
 */
export function isProcessingStale(
  progress: Pick<ProcessingProgress, 'last_activity_at'> | null | undefined,
  now: number = Date.now(),
): boolean {
  const m = minutesSinceProcessingActivity(progress, now)
  return m !== null && m > PROCESSING_STALE_THRESHOLD_MIN
}

async function getLatestProcessingActivityJob(
  campagnaId: string,
  now: number = Date.now(),
): Promise<ProcessingActivityJob | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) return null

    const { data, error } = await (supabase as any)
      .from('campaign_jobs')
      .select('id, stato, updated_at')
      .eq('campagne_programmazione_id', campagnaId)
      .eq('created_by', userId)
      .in('stato', PROCESSING_ACTIVITY_JOB_STATES)
      .order('updated_at', { ascending: false })
      .limit(10)

    if (error) {
      console.warn('[getProcessingProgress] campaign_jobs activity query failed:', error)
      return null
    }

    return ((data as ProcessingActivityJob[] | null) ?? [])
      .find(job => isProcessingActivityJobEligible(job, now)) ?? null
  } catch (error) {
    console.warn('[getProcessingProgress] campaign_jobs activity lookup failed:', error)
    return null
  }
}

/**
 * Get the processing progress for a campaign that is currently being processed
 */
export const getProcessingProgress = async (campagnaId: string): Promise<{ data: ProcessingProgress | null; error: any }> => {
  try {
    const { data: raw, error } = await (supabase as any).rpc('get_processing_progress', {
      p_campagna_id: campagnaId,
    })
    if (error) throw error
    if (!raw) return { data: null, error: null }
    const programmazioni_totali = Number(raw.programmazioni_totali) || 0
    const programmazioni_processate = Number(raw.programmazioni_processate) || 0
    const percentuale = programmazioni_totali > 0
      ? Math.round((programmazioni_processate / programmazioni_totali) * 100) : 0
    const job = await getLatestProcessingActivityJob(campagnaId)
    const activity = resolveProcessingActivity(
      { last_activity_at: raw.last_activity_at ?? null },
      job,
    )

    return {
      data: {
        campagna_individuazione_id: raw.campagna_individuazione_id ?? undefined,
        programmazioni_processate,
        programmazioni_totali,
        individuazioni_create: Number(raw.individuazioni_create) || 0,
        percentuale,
        processing_by: raw.processing_by ?? undefined,
        processing_started_at: raw.processing_started_at ?? undefined,
        last_activity_at: activity.last_activity_at,
        activity_source: activity.activity_source,
        job_id: job?.id ?? null,
        job_stato: job?.stato ?? null,
        job_updated_at: job?.updated_at ?? null,
      },
      error: null,
    }
  } catch (error) {
    return { data: null, error }
  }
}

export interface ProgrammazioneRow {
  id: string
  campagna_programmazione_id: string
  emittente_id: string
  data_trasmissione: string
  ora_inizio: string
  ora_fine?: string | null
  durata_minuti?: number | null
  titolo: string
  descrizione?: string | null
  fascia_oraria?: string | null
  tipo_trasmissione?: string | null
  tipo?: string | null
  canale?: string | null
  emittente?: string | null
  processato: boolean
  errori_processamento?: any | null
  created_at: string
}

export interface ListProgrammazioniOptions {
  q?: string
  processato?: boolean
  fromDate?: string
  toDate?: string
}

export interface ProgrammazioniCursor {
  created_at: string
  id: string
}

export const listProgrammazioniByCampagnaKeyset = async (
  campagnaId: string,
  limit = 200,
  cursor?: ProgrammazioniCursor,
  options?: ListProgrammazioniOptions
) => {
  let query = supabase
    .from('programmazioni' as any)
    .select('*')
    .eq('campagna_programmazione_id', campagnaId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)

  if (cursor?.created_at) {
    // Compound cursor: (created_at < X) OR (created_at = X AND id < Y)
    // Handles batches where many rows share the same created_at timestamp
    query = (query as any).or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
    )
  }

  if (options?.q) {
    query = query.ilike('titolo', `%${options.q}%`)
  }

  if (typeof options?.processato === 'boolean') {
    query = query.eq('processato', options.processato)
  }

  if (options?.fromDate) {
    query = query.gte('data_trasmissione', options.fromDate)
  }
  if (options?.toDate) {
    query = query.lte('data_trasmissione', options.toDate)
  }

  const { data, error } = await query

  const rows = (data as unknown) as ProgrammazioneRow[]
  const nextCursor = rows && rows.length > 0 ? { created_at: rows[rows.length - 1].created_at, id: rows[rows.length - 1].id } : undefined
  return { data: rows, nextCursor, error }
}

export interface ProgrammazioniHealth {
  total: number
  processed: number
  unprocessed: number
  missing_title: number
  missing_duration: number
  errors_count: number
  date_min?: string
  date_max?: string
}

export const getProgrammazioniHealth = async (campagnaId: string) => {
  try {
    // Execute all count queries in parallel for better performance
    const [
      totalRes,
      processedRes,
      unprocessedRes,
      missingTitleRes,
      missingDurationRes,
      errorsRes,
      rangeRes
    ] = await Promise.all([
      supabase
    .from('programmazioni' as any)
    .select('*', { count: 'exact', head: true })
        .eq('campagna_programmazione_id', campagnaId),
      supabase
    .from('programmazioni' as any)
    .select('*', { count: 'exact', head: true })
    .eq('campagna_programmazione_id', campagnaId)
        .eq('processato', true),
      supabase
    .from('programmazioni' as any)
    .select('*', { count: 'exact', head: true })
    .eq('campagna_programmazione_id', campagnaId)
        .eq('processato', false),
      supabase
    .from('programmazioni' as any)
    .select('*', { count: 'exact', head: true })
    .eq('campagna_programmazione_id', campagnaId)
        .is('titolo', null),
      supabase
    .from('programmazioni' as any)
    .select('*', { count: 'exact', head: true })
    .eq('campagna_programmazione_id', campagnaId)
        .is('durata_minuti', null),
      supabase
    .from('programmazioni' as any)
    .select('*', { count: 'exact', head: true })
    .eq('campagna_programmazione_id', campagnaId)
        .not('errori_processamento', 'is', null),
      supabase
        .from('programmazioni' as any)
        .select('data_trasmissione')
        .eq('campagna_programmazione_id', campagnaId)
        .order('data_trasmissione', { ascending: true })
        .limit(1)
    ])

    // Check for errors
    const errors = [
      totalRes.error,
      processedRes.error,
      unprocessedRes.error,
      missingTitleRes.error,
      missingDurationRes.error,
      errorsRes.error,
      rangeRes.error
    ].filter(Boolean)

    if (errors.length > 0) {
      console.error('[getProgrammazioniHealth] Query errors:', errors)
      return { data: null, error: errors[0] }
    }

    // Get date range from first and last records
    let date_min: string | undefined = undefined
    let date_max: string | undefined = undefined

    if (rangeRes.data && rangeRes.data.length > 0) {
      const firstRecord = rangeRes.data[0] as any
      date_min = firstRecord.data_trasmissione
      
      // Get max date
      const maxRes = await supabase
    .from('programmazioni' as any)
        .select('data_trasmissione')
    .eq('campagna_programmazione_id', campagnaId)
        .order('data_trasmissione', { ascending: false })
    .limit(1)

      if (maxRes.data && maxRes.data.length > 0) {
        const lastRecord = maxRes.data[0] as any
        date_max = lastRecord.data_trasmissione
      }
    }

  const health: ProgrammazioniHealth = {
    total: totalRes.count || 0,
    processed: processedRes.count || 0,
    unprocessed: unprocessedRes.count || 0,
    missing_title: missingTitleRes.count || 0,
    missing_duration: missingDurationRes.count || 0,
    errors_count: errorsRes.count || 0,
      date_min,
      date_max,
  }

    return { data: health, error: null }
  } catch (error: any) {
    console.error('[getProgrammazioniHealth] Unexpected error:', error)
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error(String(error))
    }
  }
}
