import { supabase } from '@/shared/lib/supabase'

export type DataHealthPreset = 'lineare' | 'svod' | 'tvod' | 'streaming_catalogo' | 'custom'

export type DataHealthFieldStatus = 'required' | 'recommended' | 'optional' | 'not_applicable'

export type DataHealthFieldKey =
  | 'titolo'
  | 'tipo'
  | 'data_trasmissione'
  | 'ora_inizio'
  | 'durata_minuti'
  | 'canale'
  | 'titolo_episodio'
  | 'titolo_episodio_originale'
  | 'numero_stagione'
  | 'numero_episodio'
  | 'anno'
  | 'sales_month'
  | 'views'
  | 'retail_price'
  | 'total_revenue'
  | 'total_net_ad_revenue'

export interface DataHealthPolicy {
  preset: DataHealthPreset
  fields?: Partial<Record<DataHealthFieldKey, DataHealthFieldStatus>>
}

export interface DataHealthFieldDefinition {
  key: DataHealthFieldKey
  label: string
  valueType: 'text' | 'number' | 'date' | 'time'
  description: string
}

export interface ResolvedDataHealthField extends DataHealthFieldDefinition {
  status: DataHealthFieldStatus
}

export interface DataHealthFieldMetric {
  key: DataHealthFieldKey
  label: string
  status: DataHealthFieldStatus
  missing: number
  percent: number
}

export interface DataHealthPolicySummary {
  preset: DataHealthPreset
  presetLabel: string
  fields: ResolvedDataHealthField[]
}

export type ProgrammazioniTableColumnKey =
  | 'processato'
  | DataHealthFieldKey
  | 'fascia_oraria'

export interface ProgrammazioniTableColumn {
  key: ProgrammazioniTableColumnKey
  label: string
}

type ProgrammazioniTablePolicy = DataHealthPolicy | DataHealthPolicySummary

export const DATA_HEALTH_FIELD_DEFINITIONS: Record<DataHealthFieldKey, DataHealthFieldDefinition> = {
  titolo: {
    key: 'titolo',
    label: 'Titolo',
    valueType: 'text',
    description: 'Titolo principale della programmazione o del contenuto.',
  },
  tipo: {
    key: 'tipo',
    label: 'Tipo',
    valueType: 'text',
    description: 'Classificazione del contenuto, ad esempio film o serie.',
  },
  data_trasmissione: {
    key: 'data_trasmissione',
    label: 'Data trasmissione',
    valueType: 'date',
    description: 'Data puntuale della messa in onda o pubblicazione.',
  },
  ora_inizio: {
    key: 'ora_inizio',
    label: 'Ora inizio',
    valueType: 'time',
    description: 'Orario di inizio, tipico dei palinsesti lineari.',
  },
  durata_minuti: {
    key: 'durata_minuti',
    label: 'Durata',
    valueType: 'number',
    description: 'Durata del contenuto in minuti.',
  },
  canale: {
    key: 'canale',
    label: 'Canale',
    valueType: 'text',
    description: 'Canale o servizio sorgente del record.',
  },
  titolo_episodio: {
    key: 'titolo_episodio',
    label: 'Titolo episodio',
    valueType: 'text',
    description: 'Titolo episodio pulito, quando il contenuto è seriale.',
  },
  titolo_episodio_originale: {
    key: 'titolo_episodio_originale',
    label: 'Titolo episodio originale',
    valueType: 'text',
    description: 'Titolo episodio come fornito dalla sorgente.',
  },
  numero_stagione: {
    key: 'numero_stagione',
    label: 'Stagione',
    valueType: 'number',
    description: 'Numero stagione, quando disponibile.',
  },
  numero_episodio: {
    key: 'numero_episodio',
    label: 'Episodio',
    valueType: 'number',
    description: 'Numero episodio, quando disponibile.',
  },
  anno: {
    key: 'anno',
    label: 'Anno',
    valueType: 'number',
    description: 'Anno editoriale o di riferimento del contenuto.',
  },
  sales_month: {
    key: 'sales_month',
    label: 'Sales month',
    valueType: 'date',
    description: 'Mese di vendita/rendicontazione per sorgenti on demand.',
  },
  views: {
    key: 'views',
    label: 'Views',
    valueType: 'number',
    description: 'Numero di visualizzazioni o consumi rendicontati.',
  },
  retail_price: {
    key: 'retail_price',
    label: 'Retail price',
    valueType: 'number',
    description: 'Prezzo unitario per contenuti transazionali.',
  },
  total_revenue: {
    key: 'total_revenue',
    label: 'Ricavi totali',
    valueType: 'number',
    description: 'Ricavo lordo/totale rendicontato.',
  },
  total_net_ad_revenue: {
    key: 'total_net_ad_revenue',
    label: 'Net ad revenue',
    valueType: 'number',
    description: 'Ricavo netto advertising per modelli AVOD/SVOD.',
  },
}

export const DATA_HEALTH_FIELD_ORDER: DataHealthFieldKey[] = [
  'titolo',
  'tipo',
  'data_trasmissione',
  'ora_inizio',
  'durata_minuti',
  'canale',
  'titolo_episodio',
  'titolo_episodio_originale',
  'numero_stagione',
  'numero_episodio',
  'anno',
  'sales_month',
  'views',
  'retail_price',
  'total_revenue',
  'total_net_ad_revenue',
]

export const DATA_HEALTH_PRESET_LABELS: Record<DataHealthPreset, string> = {
  lineare: 'Rete lineare',
  svod: 'SVOD / catalogo',
  tvod: 'TVOD / transactional',
  streaming_catalogo: 'Streaming catalogo',
  custom: 'Personalizzato',
}

const TABLE_COLUMN_LABELS: Record<ProgrammazioniTableColumnKey, string> = {
  processato: 'Stato',
  titolo: 'Titolo',
  tipo: 'Tipo',
  data_trasmissione: 'Data',
  ora_inizio: 'Ora',
  durata_minuti: 'Durata',
  canale: 'Canale',
  titolo_episodio: 'Titolo episodio',
  titolo_episodio_originale: 'Titolo episodio orig.',
  numero_stagione: 'Stagione',
  numero_episodio: 'Episodio',
  anno: 'Anno',
  sales_month: 'Sales month',
  views: 'Views',
  retail_price: 'Retail price',
  total_revenue: 'Ricavi totali',
  total_net_ad_revenue: 'Net ad revenue',
  fascia_oraria: 'Fascia',
}

const ALL_TABLE_COLUMNS: ProgrammazioniTableColumnKey[] = [
  'processato',
  'data_trasmissione',
  'ora_inizio',
  'canale',
  'titolo',
  'tipo',
  'durata_minuti',
  'titolo_episodio',
  'titolo_episodio_originale',
  'numero_stagione',
  'numero_episodio',
  'fascia_oraria',
  'anno',
  'sales_month',
  'views',
  'retail_price',
  'total_revenue',
  'total_net_ad_revenue',
]

const DEFAULT_FIELD_STATUS: Record<DataHealthFieldKey, DataHealthFieldStatus> = {
  titolo: 'required',
  tipo: 'recommended',
  data_trasmissione: 'recommended',
  ora_inizio: 'optional',
  durata_minuti: 'recommended',
  canale: 'optional',
  titolo_episodio: 'optional',
  titolo_episodio_originale: 'optional',
  numero_stagione: 'optional',
  numero_episodio: 'optional',
  anno: 'optional',
  sales_month: 'not_applicable',
  views: 'not_applicable',
  retail_price: 'not_applicable',
  total_revenue: 'not_applicable',
  total_net_ad_revenue: 'not_applicable',
}

export const DATA_HEALTH_PRESETS: Record<DataHealthPreset, Record<DataHealthFieldKey, DataHealthFieldStatus>> = {
  lineare: {
    ...DEFAULT_FIELD_STATUS,
    data_trasmissione: 'required',
    ora_inizio: 'recommended',
    canale: 'recommended',
  },
  svod: {
    ...DEFAULT_FIELD_STATUS,
    data_trasmissione: 'not_applicable',
    ora_inizio: 'not_applicable',
    canale: 'optional',
    anno: 'recommended',
    sales_month: 'optional',
    views: 'recommended',
    total_net_ad_revenue: 'recommended',
    titolo_episodio_originale: 'recommended',
    numero_episodio: 'recommended',
  },
  tvod: {
    ...DEFAULT_FIELD_STATUS,
    data_trasmissione: 'not_applicable',
    ora_inizio: 'not_applicable',
    durata_minuti: 'optional',
    anno: 'recommended',
    sales_month: 'required',
    views: 'recommended',
    retail_price: 'recommended',
    total_revenue: 'required',
  },
  streaming_catalogo: {
    ...DEFAULT_FIELD_STATUS,
    data_trasmissione: 'not_applicable',
    ora_inizio: 'not_applicable',
    durata_minuti: 'optional',
    anno: 'recommended',
  },
  custom: DEFAULT_FIELD_STATUS,
}

const VALID_PRESETS = new Set<DataHealthPreset>(Object.keys(DATA_HEALTH_PRESETS) as DataHealthPreset[])
const VALID_STATUSES = new Set<DataHealthFieldStatus>([
  'required',
  'recommended',
  'optional',
  'not_applicable',
])

interface EmittenteHealthConfigRow {
  nome?: string | null
  tipo?: string | null
  configurazione?: unknown
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function isDataHealthPreset(value: unknown): value is DataHealthPreset {
  return typeof value === 'string' && VALID_PRESETS.has(value as DataHealthPreset)
}

function isDataHealthFieldStatus(value: unknown): value is DataHealthFieldStatus {
  return typeof value === 'string' && VALID_STATUSES.has(value as DataHealthFieldStatus)
}

export function inferDataHealthPreset(
  emittenteTipo?: string | null,
  emittenteNome?: string | null
): DataHealthPreset {
  const nome = (emittenteNome ?? '').toLowerCase()
  if (nome.includes('tvod') || nome.includes('transaction')) return 'tvod'
  if (nome.includes('svod')) return 'svod'
  if (emittenteTipo === 'streaming') return 'svod'
  if (emittenteTipo === 'tv_generalista' || emittenteTipo === 'tv_tematica' || emittenteTipo === 'pay_tv') {
    return 'lineare'
  }
  return 'lineare'
}

export function getDataHealthPolicyFromConfig(
  configurazione: unknown,
  emittenteTipo?: string | null,
  emittenteNome?: string | null
): DataHealthPolicy {
  const config = asObject(configurazione)
  const rawPolicy = asObject(config.data_health)
  const rawPreset = rawPolicy.preset
  const preset = isDataHealthPreset(rawPreset) ? rawPreset : inferDataHealthPreset(emittenteTipo, emittenteNome)
  const rawFields = asObject(rawPolicy.fields)
  const fields: Partial<Record<DataHealthFieldKey, DataHealthFieldStatus>> = {}

  for (const key of DATA_HEALTH_FIELD_ORDER) {
    const status = rawFields[key]
    if (isDataHealthFieldStatus(status)) fields[key] = status
  }

  return { preset, fields }
}

export function resolveDataHealthPolicy(policy: DataHealthPolicy): DataHealthPolicySummary {
  const base = DATA_HEALTH_PRESETS[policy.preset] ?? DATA_HEALTH_PRESETS.lineare
  const overrides = policy.fields ?? {}
  const fields = DATA_HEALTH_FIELD_ORDER.map(key => ({
    ...DATA_HEALTH_FIELD_DEFINITIONS[key],
    status: overrides[key] ?? base[key],
  }))

  return {
    preset: policy.preset,
    presetLabel: DATA_HEALTH_PRESET_LABELS[policy.preset] ?? DATA_HEALTH_PRESET_LABELS.lineare,
    fields,
  }
}

export function getFieldsForHealthCounts(policy: DataHealthPolicy): ResolvedDataHealthField[] {
  return resolveDataHealthPolicy(policy).fields.filter(field =>
    field.status === 'required' || field.status === 'recommended'
  )
}

export function getMissingFieldFilter(field: ResolvedDataHealthField): string {
  if (field.valueType === 'text') return `${field.key}.is.null,${field.key}.eq.`
  return `${field.key}.is.null`
}

export function getProgrammazioniTableColumns(
  policy: ProgrammazioniTablePolicy,
  options: { showAll?: boolean } = {}
): ProgrammazioniTableColumn[] {
  const keys = options.showAll
    ? ALL_TABLE_COLUMNS
    : compactTableColumnKeys(policy)

  return keys.map(key => ({
    key,
    label: TABLE_COLUMN_LABELS[key],
  }))
}

function compactTableColumnKeys(policy: ProgrammazioniTablePolicy): ProgrammazioniTableColumnKey[] {
  const fields = 'presetLabel' in policy ? policy.fields : resolveDataHealthPolicy(policy).fields
  const visible = new Set<ProgrammazioniTableColumnKey>(['processato', 'titolo'])
  for (const field of fields) {
    if (field.status === 'required' || field.status === 'recommended') visible.add(field.key)
  }

  return ALL_TABLE_COLUMNS.filter(key => visible.has(key))
}

export async function getDataHealthPolicyByEmittente(emittenteId: string): Promise<{
  data: DataHealthPolicy | null
  error: unknown
}> {
  const { data, error } = await supabase
    .from('emittenti')
    .select('nome,tipo,configurazione')
    .eq('id', emittenteId)
    .single()

  if (error) return { data: null, error }
  const row = data as EmittenteHealthConfigRow | null
  return {
    data: getDataHealthPolicyFromConfig(row?.configurazione, row?.tipo, row?.nome),
    error: null,
  }
}

export async function saveDataHealthPolicy(
  emittenteId: string,
  policy: DataHealthPolicy
): Promise<{ data: unknown; error: unknown }> {
  const { data: current, error: readError } = await supabase
    .from('emittenti')
    .select('configurazione')
    .eq('id', emittenteId)
    .single()

  if (readError) return { data: null, error: readError }

  const configurazione = {
    ...asObject((current as EmittenteHealthConfigRow | null)?.configurazione),
    data_health: {
      preset: policy.preset,
      fields: policy.fields ?? {},
    },
  }

  const { data, error } = await supabase
    .from('emittenti')
    .update({ configurazione })
    .eq('id', emittenteId)
    .select()
    .single()

  return { data, error }
}
