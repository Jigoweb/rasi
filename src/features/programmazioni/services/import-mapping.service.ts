import { supabase } from '@/shared/lib/supabase'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import {
  coerce,
  normalizeKey,
  TEMPLATE_FIELDS,
  TEMPLATE_FIELDS_SET,
} from '../utils/coercion'
import { normalizeTitle } from '../utils/title-normalize'
import type { ProgrammazionePayload } from './programmazioni.service'

// ============================================
// TIPI
// ============================================

export interface ImportMappingConfig {
  version: 1
  colonne_rilevate: string[]
  ultimo_upload: string | null
  /** Mapping: chiave = nome colonna sorgente nel file, valore = nome campo template */
  mapping: Record<string, string>
}

export interface DetectColumnsResult {
  columns: string[]
  preview: Record<string, any>[]
}

export interface ColumnDiff {
  added: string[]
  removed: string[]
  unchanged: string[]
}

export type UploadDecision =
  | { kind: 'legacy_template'; reason: 'no_config_but_template_headers' }
  | { kind: 'need_wizard'; reason: 'no_config' }
  | { kind: 'apply_existing'; mapping: ImportMappingConfig }
  | {
      kind: 'warn_format_changed'
      mapping: ImportMappingConfig
      diff: ColumnDiff
      mappedRemoved: string[]
    }

// ============================================
// REGISTRY: campi richiesti del template "legacy"
// ============================================

const LEGACY_TEMPLATE_REQUIRED_HEADERS = ['titolo', 'emittente']

export function isLegacyTemplateFile(columns: string[]): boolean {
  const normalized = columns.map(normalizeKey)
  return LEGACY_TEMPLATE_REQUIRED_HEADERS.every(h => normalized.includes(h))
}

// ============================================
// DB: lettura/scrittura mapping
// ============================================

export async function getMappingByEmittente(emittenteId: string): Promise<{
  data: ImportMappingConfig | null
  error: any
}> {
  const { data, error } = await supabase
    .from('emittenti' as any)
    .select('mapping_import')
    .eq('id', emittenteId)
    .single()

  if (error) return { data: null, error }
  return { data: ((data as any)?.mapping_import as ImportMappingConfig) ?? null, error: null }
}

export async function saveMapping(
  emittenteId: string,
  config: ImportMappingConfig
): Promise<{ data: any; error: any }> {
  const payload = { ...config, version: 1 as const }
  const { data, error } = await supabase
    .from('emittenti' as any)
    .update({ mapping_import: payload })
    .eq('id', emittenteId)
    .select()
    .single()

  return { data, error }
}

export async function deleteMapping(emittenteId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('emittenti' as any)
    .update({ mapping_import: null })
    .eq('id', emittenteId)

  return { error }
}

// ============================================
// FILE: lettura colonne e preview
// ============================================

/**
 * Estrae nomi colonna e prime 5 righe da file XLSX o CSV.
 */
export async function detectColumns(file: File): Promise<DetectColumnsResult> {
  const lower = file.name.toLowerCase()
  let rows: Record<string, any>[] = []

  if (lower.endsWith('.csv')) {
    const text = await file.text()
    const result = Papa.parse<Record<string, any>>(text, {
      header: true,
      skipEmptyLines: true,
      preview: 6, // header + 5 righe
    })
    rows = result.data
  } else if (lower.match(/\.xlsx?$/)) {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { raw: false })
  } else {
    throw new Error('Formato file non supportato. Usa CSV o Excel.')
  }

  if (rows.length === 0) return { columns: [], preview: [] }

  const columns = Object.keys(rows[0]).map(c => String(c).trim())
  const preview = rows.slice(0, 5)
  return { columns, preview }
}

/**
 * Legge tutte le righe di un file (XLSX o CSV) senza limite.
 */
export async function readAllRows(file: File): Promise<Record<string, any>[]> {
  const lower = file.name.toLowerCase()

  if (lower.endsWith('.csv')) {
    const text = await file.text()
    return await new Promise<Record<string, any>[]>((resolve, reject) => {
      Papa.parse<Record<string, any>>(text, {
        header: true,
        skipEmptyLines: true,
        complete: result => resolve(result.data),
        error: (err: any) => reject(err),
      })
    })
  }

  if (lower.match(/\.xlsx?$/)) {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    return XLSX.utils.sheet_to_json<Record<string, any>>(ws, { raw: false })
  }

  throw new Error('Formato file non supportato.')
}

// ============================================
// DIFF colonne (per validazione cambio formato)
// ============================================

export function diffColumns(actual: string[], saved: string[]): ColumnDiff {
  const actualSet = new Set(actual.map(c => c.trim()))
  const savedSet = new Set(saved.map(c => c.trim()))

  const added = [...actualSet].filter(c => !savedSet.has(c))
  const removed = [...savedSet].filter(c => !actualSet.has(c))
  const unchanged = [...savedSet].filter(c => actualSet.has(c))

  return { added, removed, unchanged }
}

/**
 * Ritorna solo le colonne `removed` che erano effettivamente mappate
 * (cioè la cui rimozione rompe l'import).
 */
export function mappedRemovedColumns(
  removed: string[],
  mapping: Record<string, string>
): string[] {
  return removed.filter(c => Object.prototype.hasOwnProperty.call(mapping, c))
}

// ============================================
// DECISIONE upload
// ============================================

export async function decideUploadPath(
  emittenteId: string,
  columns: string[]
): Promise<UploadDecision> {
  const { data: config } = await getMappingByEmittente(emittenteId)

  if (!config) {
    if (isLegacyTemplateFile(columns)) {
      return { kind: 'legacy_template', reason: 'no_config_but_template_headers' }
    }
    return { kind: 'need_wizard', reason: 'no_config' }
  }

  const diff = diffColumns(columns, config.colonne_rilevate)
  const mappedRemoved = mappedRemovedColumns(diff.removed, config.mapping)

  if (mappedRemoved.length > 0) {
    return { kind: 'warn_format_changed', mapping: config, diff, mappedRemoved }
  }

  return { kind: 'apply_existing', mapping: config }
}

// ============================================
// APPLY mapping
// ============================================

export interface ApplyMappingContext {
  campagnaProgrammazioneId: string
  emittenteId: string
}

/**
 * Applica un mapping alle righe sorgente per costruire array di payload
 * pronti per `uploadProgrammazioni`.
 *
 * - I FK obbligatori (`campagna_programmazione_id`, `emittente_id`) sono iniettati dal context.
 * - Campi template non mappati restano `undefined` (omessi dal payload).
 * - Valori sono coerciti via `coerce()` in base al tipo target.
 * - Le normalizzazioni semantiche (title case, mapping tipo, encoding episodio Pluto, ecc.)
 *   sono applicate poi da `normalizzaProgrammazione` dentro `uploadProgrammazioni`.
 */
export function applyMapping(
  rows: Record<string, any>[],
  mapping: Record<string, string>,
  context: ApplyMappingContext
): ProgrammazionePayload[] {
  // Mappa inversa: campo template → colonna sorgente (l'ultima vince in caso di duplicati)
  const reverseMap: Record<string, string> = {}
  for (const [source, target] of Object.entries(mapping)) {
    if (target && TEMPLATE_FIELDS_SET.has(target)) {
      reverseMap[target] = source
    }
  }

  const result: ProgrammazionePayload[] = []
  for (const row of rows) {
    const payload: any = {
      campagna_programmazione_id: context.campagnaProgrammazioneId,
      emittente_id: context.emittenteId,
    }

    for (const field of TEMPLATE_FIELDS) {
      const sourceCol = reverseMap[field]
      if (!sourceCol) continue
      // Trova il valore tollerando varianti di capitalizzazione/spaziatura
      const rawValue =
        row[sourceCol] ??
        row[sourceCol.trim()] ??
        row[normalizeKey(sourceCol)]
      const coerced = coerce(field, rawValue)
      if (coerced !== undefined) {
        payload[field] = coerced
      }
    }

    // Normalize title-like fields after coercion
    for (const f of ['titolo', 'titolo_originale', 'titolo_episodio', 'titolo_episodio_originale'] as const) {
      if (typeof payload[f] === 'string') {
        const normalized = normalizeTitle(payload[f])
        if (normalized) payload[f] = normalized
        else delete payload[f]
      }
    }

    // Validazione minima: titolo deve essere presente
    if (!payload.titolo) continue
    // Default tipo se non mappato
    if (!payload.tipo) payload.tipo = ''

    result.push(payload as ProgrammazionePayload)
  }

  return result
}

/**
 * Costruisce un payload identico a quello del flusso legacy (template canonico),
 * usato quando il file ha già le intestazioni del template e non c'è config.
 */
export function buildLegacyPayload(
  rows: Record<string, any>[],
  context: ApplyMappingContext
): ProgrammazionePayload[] {
  const result: ProgrammazionePayload[] = []
  for (const row of rows) {
    const payload: any = {
      campagna_programmazione_id: context.campagnaProgrammazioneId,
      emittente_id: context.emittenteId,
    }

    for (const key of Object.keys(row)) {
      const nk = normalizeKey(key)
      if (TEMPLATE_FIELDS_SET.has(nk)) {
        const coerced = coerce(nk, row[key])
        if (coerced !== undefined) payload[nk] = coerced
      }
    }

    // Obbligatori (compat fallback per "Titolo" / "Type" maiuscoli)
    if (!payload.titolo) payload.titolo = (row as any).titolo ?? (row as any)['Titolo'] ?? ''
    if (!payload.tipo) payload.tipo = (row as any).tipo ?? (row as any)['type'] ?? (row as any)['Type'] ?? ''

    // Normalize title-like fields after coercion
    for (const f of ['titolo', 'titolo_originale', 'titolo_episodio', 'titolo_episodio_originale'] as const) {
      if (typeof payload[f] === 'string') {
        const normalized = normalizeTitle(payload[f])
        if (normalized) payload[f] = normalized
        else delete payload[f]
      }
    }

    if (!payload.titolo) continue
    result.push(payload as ProgrammazionePayload)
  }
  return result
}
