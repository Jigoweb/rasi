/**
 * Recupero contatti artisti: confronto, compilazione dei soli campi vuoti
 * e conflitti da risolvere in anteprima. Nessuna scrittura.
 */

import { normalizePersonName } from '@/features/opere/lib/cast-import'
import { parseTabularFile, type TabularTable } from '@/shared/lib/tabular-file'

export const CONTATTI_IMPORT_COLUMNS = [
  'cognome',
  'nome',
  'email',
  'via',
  'cap',
  'citta',
  'provincia',
  'telefono',
  'codice_fiscale',
  'partita_iva',
  'regime',
  'tassazione',
  'dettagli_regime',
] as const

export const CONTATTI_FILL_FIELDS = [
  'email',
  'telefono',
  'via',
  'cap',
  'citta',
  'provincia',
  'codice_fiscale',
  'partita_iva',
  'regime',
  'tassazione',
  'dettagli_regime',
] as const

export type ContattiColumn = (typeof CONTATTI_IMPORT_COLUMNS)[number]
export type ContattiFieldKey = (typeof CONTATTI_FILL_FIELDS)[number]
export type ContattiMatchType = 'codice_fiscale' | 'solo_nome' | 'manuale'
export type ContattiRowStatus = 'pronto' | 'da_verificare' | 'conflitto' | 'senza_artista' | 'invariato'
export type ContattiFieldDecision = 'tieni' | 'sostituisci'
export type ContattiFieldStato = 'vuoto' | 'uguale' | 'compilare' | 'conflitto'

export const CONTATTI_FIELD_LABELS: Record<ContattiFieldKey, string> = {
  email: 'Email',
  telefono: 'Telefono',
  via: 'Via',
  cap: 'CAP',
  citta: 'Città',
  provincia: 'Provincia',
  codice_fiscale: 'Codice fiscale',
  partita_iva: 'Partita IVA',
  regime: 'Regime',
  tassazione: 'Tassazione',
  dettagli_regime: 'Dettagli regime',
}

export const CONTATTI_STATUS_LABELS: Record<ContattiRowStatus, string> = {
  pronto: 'Pronto',
  da_verificare: 'Da verificare',
  conflitto: 'Conflitto',
  senza_artista: 'Senza artista',
  invariato: 'Già aggiornato',
}

export const CONTATTI_MATCH_LABELS: Record<ContattiMatchType, string> = {
  codice_fiscale: 'Codice fiscale',
  solo_nome: 'Solo nome',
  manuale: 'Manuale',
}

export const CONTATTI_IMPORT_HEADER_ERROR =
  'Il file deve avere le colonne: cognome, nome, email, via, cap, citta, provincia, telefono, codice_fiscale, partita_iva, regime, tassazione, dettagli_regime'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CF_RE = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/

const CF_ODD: Record<string, number> = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21,
  K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14,
  U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
}

const CF_EVEN: Record<string, number> = {}
for (let index = 0; index < 10; index += 1) CF_EVEN[String(index)] = index
for (let index = 0; index < 26; index += 1) CF_EVEN[String.fromCharCode(65 + index)] = index

export type ContattiValues = Record<ContattiColumn, string>

export type ContattiCatalogArtist = {
  id: string
  nome: string
  cognome: string
  codice_fiscale: string | null
}

export type ContattiArtist = {
  id: string
  nome: string
  cognome: string
  codice_fiscale: string | null
  partita_iva: string | null
  contatti: unknown
  indirizzo: unknown
  riservati?: {
    regime: string | null
    tassazione: string | null
    dettagli_regime: string | null
  } | null
}

export type ContattiEdit = {
  rowNumber: number
  values: ContattiValues
  included: boolean
  artistaId: string | null
  /** True solo se l'operatore ha scelto l'artista. L'id assegnato in automatico non diventa un match manuale. */
  sceltaManuale: boolean
  decisions: Partial<Record<ContattiFieldKey, ContattiFieldDecision>>
}

export type ContattiSuggestion = {
  id: string
  label: string
}

export type ContattiFieldView = {
  key: ContattiFieldKey
  label: string
  incoming: string
  current: string
  stato: ContattiFieldStato
  decision: ContattiFieldDecision
}

export type ContattiImportRow = {
  rowNumber: number
  values: ContattiValues
  status: ContattiRowStatus
  matchType: ContattiMatchType | null
  artistaId: string | null
  artistaLabel: string | null
  motivo: string | null
  included: boolean
  includibile: boolean
  suggerimenti: ContattiSuggestion[]
  fields: ContattiFieldView[]
}

export type ContattiPreviewSummary = {
  righe: number
  pronti: number
  daVerificare: number
  conflitti: number
  senzaArtista: number
  invariati: number
  selezionati: number
}

export type ContattiCommitSummary = {
  artistiAggiornati: number
  campiCompilati: number
  conflittiSostituiti: number
  conflittiMantenuti: number
  saltati: number
  invariati: number
}

export type ContattiReserved = {
  regime: string | null
  tassazione: string | null
  dettagli_regime: string | null
}

export type ArtistPatch = {
  artista_id: string
  contatti?: Record<string, unknown>
  indirizzo?: Record<string, unknown>
  codice_fiscale?: string
  partita_iva?: string
  riservati?: ContattiReserved
  campiCompilati: ContattiFieldKey[]
  conflittiSostituiti: ContattiFieldKey[]
  conflittiMantenuti: ContattiFieldKey[]
}

const EMPTY_VALUES: ContattiValues = {
  cognome: '',
  nome: '',
  email: '',
  via: '',
  cap: '',
  citta: '',
  provincia: '',
  telefono: '',
  codice_fiscale: '',
  partita_iva: '',
  regime: '',
  tassazione: '',
  dettagli_regime: '',
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  return {}
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function normalizeLoose(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('it-IT')
}

export function normalizePhone(value: string): string {
  return value.trim().replace(/[\s.\-()/]/g, '')
}

function nameKey(nome: string, cognome: string): string | null {
  const left = normalizePersonName(nome)
  const right = normalizePersonName(cognome)
  if (!left || !right) return null
  return `${left}\u0000${right}`
}

function cfChecksum(code: string): boolean {
  let sum = 0
  for (let index = 0; index < 15; index += 1) {
    const char = code[index]
    const weight = index % 2 === 0 ? CF_ODD[char] : CF_EVEN[char]
    if (weight == null) return false
    sum += weight
  }
  return String.fromCharCode(65 + (sum % 26)) === code[15]
}

/** Codice fiscale italiano, omocodia compresa. Vuoto o segnaposto → null. */
export function normalizeCodiceFiscale(value: string | null | undefined): string | null {
  const compact = (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!CF_RE.test(compact) || !cfChecksum(compact)) return null
  return compact
}

function pivaChecksum(digits: string): boolean {
  let sum = 0
  for (let index = 0; index < 10; index += 1) {
    let digit = Number(digits[index])
    if (index % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return (10 - (sum % 10)) % 10 === Number(digits[10])
}

/** Partita IVA di 11 cifre, con eventuale prefisso IT. Lo zero iniziale resta. Segnaposto → null. */
export function normalizePartitaIva(value: string | null | undefined): string | null {
  const compact = (value ?? '').trim().toUpperCase().replace(/[\s.-]/g, '')
  const digits = compact.startsWith('IT') ? compact.slice(2) : compact
  if (!/^\d{11}$/.test(digits) || !pivaChecksum(digits)) return null
  return digits
}

function readPartitaIva(value: string | null | undefined): string | null {
  return normalizePartitaIva(value)
}

function artistLabel(artist: ContattiArtist): string {
  const cf = textOf(artist.codice_fiscale)
  const name = `${artist.cognome} ${artist.nome}`.trim()
  return cf ? `${name} · ${cf}` : name
}

function currentPhone(contatti: Record<string, unknown>): string {
  return textOf(contatti.number) || textOf(contatti.telefono)
}

function blankValues(): ContattiValues {
  return { ...EMPTY_VALUES }
}

function cleanValues(values: Partial<ContattiValues> | ContattiValues): ContattiValues {
  const next = blankValues()
  for (const column of CONTATTI_IMPORT_COLUMNS) {
    next[column] = textOf(values[column]).replace(/\s+/g, ' ').trim()
  }
  return next
}

function decisionFor(
  decisions: Partial<Record<ContattiFieldKey, ContattiFieldDecision>>,
  key: ContattiFieldKey,
): ContattiFieldDecision {
  return decisions[key] === 'sostituisci' ? 'sostituisci' : 'tieni'
}

function fieldView(
  key: ContattiFieldKey,
  incoming: string,
  current: string,
  stato: ContattiFieldStato,
  decision: ContattiFieldDecision,
): ContattiFieldView {
  return {
    key,
    label: CONTATTI_FIELD_LABELS[key],
    incoming,
    current,
    stato,
    decision,
  }
}

function comparePlain(current: string, incoming: string, same: (left: string, right: string) => boolean): ContattiFieldStato {
  if (!incoming) return 'vuoto'
  if (!current) return 'compilare'
  return same(current, incoming) ? 'uguale' : 'conflitto'
}

function buildFields(artist: ContattiArtist, values: ContattiValues, decisions: ContattiEdit['decisions']): ContattiFieldView[] {
  const contatti = asRecord(artist.contatti)
  const indirizzo = asRecord(artist.indirizzo)
  const reserved = artist.riservati ?? { regime: null, tassazione: null, dettagli_regime: null }
  const cfIncoming = normalizeCodiceFiscale(values.codice_fiscale)
  const cfCurrent = normalizeCodiceFiscale(artist.codice_fiscale)
  const pivaIncoming = normalizePartitaIva(values.partita_iva)
  const pivaCurrent = readPartitaIva(artist.partita_iva)

  const plain = (key: ContattiFieldKey, current: string, incoming: string, same = (left: string, right: string) => normalizeLoose(left) === normalizeLoose(right)) =>
    fieldView(key, incoming, current, comparePlain(current, incoming, same), decisionFor(decisions, key))

  let cfStato: ContattiFieldStato = 'vuoto'
  if (cfIncoming) {
    if (!cfCurrent) cfStato = 'compilare'
    else if (cfCurrent === cfIncoming) cfStato = 'uguale'
    else cfStato = 'conflitto'
  }

  let pivaStato: ContattiFieldStato = 'vuoto'
  if (pivaIncoming) {
    if (!pivaCurrent) pivaStato = 'compilare'
    else if (pivaCurrent === pivaIncoming) pivaStato = 'uguale'
    else pivaStato = 'conflitto'
  }

  return [
    plain('email', textOf(contatti.email), values.email, (left, right) => normalizeLoose(left) === normalizeLoose(right)),
    plain('telefono', currentPhone(contatti), values.telefono, (left, right) => normalizePhone(left) === normalizePhone(right)),
    plain('via', textOf(indirizzo.via), values.via),
    plain('cap', textOf(indirizzo.cap), values.cap),
    plain('citta', textOf(indirizzo.citta), values.citta),
    plain('provincia', textOf(indirizzo.provincia), values.provincia),
    fieldView(
      'codice_fiscale',
      cfIncoming ?? values.codice_fiscale,
      cfCurrent ?? '',
      cfStato,
      decisionFor(decisions, 'codice_fiscale'),
    ),
    fieldView(
      'partita_iva',
      pivaIncoming ?? values.partita_iva,
      pivaCurrent ?? '',
      pivaStato,
      decisionFor(decisions, 'partita_iva'),
    ),
    plain('regime', textOf(reserved.regime), values.regime),
    plain('tassazione', textOf(reserved.tassazione), values.tassazione),
    plain('dettagli_regime', textOf(reserved.dettagli_regime), values.dettagli_regime),
  ]
}

function suggestionsOf(artists: ContattiArtist[]): ContattiSuggestion[] {
  const result: ContattiSuggestion[] = []
  const seen = new Set<string>()
  for (const artist of artists) {
    if (seen.has(artist.id)) continue
    seen.add(artist.id)
    result.push({ id: artist.id, label: artistLabel(artist) })
    if (result.length === 8) break
  }
  return result
}

function statusFromFields(fields: ContattiFieldView[]): ContattiRowStatus {
  if (fields.some((field) => field.stato === 'conflitto')) return 'conflitto'
  if (fields.some((field) => field.stato === 'compilare')) return 'pronto'
  return 'invariato'
}

type Match = { artist: ContattiArtist; type: ContattiMatchType }

function rowFromMatch(
  edit: ContattiEdit,
  values: ContattiValues,
  match: Match | null,
  status: ContattiRowStatus,
  motivo: string | null,
  suggerimenti: ContattiSuggestion[],
  keepIncluded: boolean,
): ContattiImportRow {
  const subject = match?.artist ?? {
    id: '',
    nome: '',
    cognome: '',
    codice_fiscale: null,
    partita_iva: null,
    contatti: null,
    indirizzo: null,
    riservati: null,
  }
  const fields = buildFields(subject, values, edit.decisions)
  const resolvedStatus = match ? statusFromFields(fields) : status
  const includibile = resolvedStatus === 'pronto' || resolvedStatus === 'conflitto'
  const included = includibile && (keepIncluded ? edit.included : true)
  return {
    rowNumber: edit.rowNumber,
    values,
    status: resolvedStatus,
    matchType: match?.type ?? null,
    artistaId: match?.artist.id ?? null,
    artistaLabel: match ? artistLabel(match.artist) : null,
    motivo,
    included,
    includibile,
    suggerimenti,
    fields,
  }
}

function claimArtists(rows: ContattiImportRow[]): ContattiImportRow[] {
  const seen = new Set<string>()
  return rows.map((row) => {
    if (!row.included || !row.artistaId) return row
    if (seen.has(row.artistaId)) {
      return {
        ...row,
        included: false,
        includibile: false,
        motivo: 'Questo artista è già scelto in un\'altra riga del file',
      }
    }
    seen.add(row.artistaId)
    return row
  })
}

export function classifyContattiImport(
  artists: ContattiArtist[],
  edits: ContattiEdit[],
  options?: { keepIncluded?: boolean },
): { ok: true; rows: ContattiImportRow[] } | { ok: false; error: string } {
  const seenRows = new Set<number>()
  for (const edit of edits) {
    if (seenRows.has(edit.rowNumber)) return { ok: false, error: 'Numeri di riga duplicati' }
    seenRows.add(edit.rowNumber)
  }

  const keepIncluded = options?.keepIncluded === true
  const byId = new Map(artists.map((artist) => [artist.id, artist]))
  const byCf = new Map<string, ContattiArtist[]>()
  const byName = new Map<string, ContattiArtist[]>()
  for (const artist of artists) {
    const cf = normalizeCodiceFiscale(artist.codice_fiscale)
    if (cf) {
      const list = byCf.get(cf) ?? []
      list.push(artist)
      byCf.set(cf, list)
    }
    const key = nameKey(artist.nome, artist.cognome)
    if (key) {
      const list = byName.get(key) ?? []
      list.push(artist)
      byName.set(key, list)
    }
  }

  const prepared = edits.map((edit) => ({ edit, values: cleanValues(edit.values) }))
  const fileCfCount = new Map<string, number>()
  const fileNameCount = new Map<string, number>()
  for (const item of prepared) {
    const cf = normalizeCodiceFiscale(item.values.codice_fiscale)
    if (cf) fileCfCount.set(cf, (fileCfCount.get(cf) ?? 0) + 1)
    const key = nameKey(item.values.nome, item.values.cognome)
    if (key) fileNameCount.set(key, (fileNameCount.get(key) ?? 0) + 1)
  }

  const rows = prepared.map(({ edit, values }) => {
    const cf = normalizeCodiceFiscale(values.codice_fiscale)
    const key = nameKey(values.nome, values.cognome)
    const cfRepeated = cf != null && (fileCfCount.get(cf) ?? 0) > 1
    const nameRepeated = key != null && (fileNameCount.get(key) ?? 0) > 1
    let match: Match | null = null
    let status: ContattiRowStatus | null = null
    let motivo: string | null = null
    let suggerimenti: ContattiSuggestion[] = []

    if (edit.sceltaManuale && edit.artistaId) {
      const chosen = byId.get(edit.artistaId)
      if (!chosen) {
        status = 'da_verificare'
        motivo = 'Artista selezionato non trovato'
      } else {
        match = { artist: chosen, type: 'manuale' }
      }
    } else if (cf && cfRepeated) {
      status = 'da_verificare'
      motivo = 'Codice fiscale ripetuto nel file'
      suggerimenti = suggestionsOf(byCf.get(cf) ?? [])
    } else if (cf) {
      const hits = byCf.get(cf) ?? []
      if (hits.length === 1 && key && nameKey(hits[0].nome, hits[0].cognome) === key) {
        match = { artist: hits[0], type: 'codice_fiscale' }
      } else if (hits.length === 1) {
        status = 'da_verificare'
        motivo = 'Il codice fiscale corrisponde a un artista con nome diverso'
        suggerimenti = suggestionsOf(hits)
      } else if (hits.length > 1) {
        status = 'da_verificare'
        motivo = 'Il codice fiscale è presente su più artisti'
        suggerimenti = suggestionsOf(hits)
      }
    }

    if (!match && !status) {
      const hits = key ? byName.get(key) ?? [] : []
      if (!key) {
        status = 'senza_artista'
        motivo = 'Nome e cognome sono obbligatori per il confronto. La riga non crea un nuovo artista.'
      } else if (nameRepeated || hits.length > 1) {
        status = 'da_verificare'
        motivo = hits.length > 1
          ? 'Più artisti hanno lo stesso nome e cognome'
          : 'Nome e cognome ripetuti nel file'
        suggerimenti = suggestionsOf(hits)
      } else if (hits.length === 1) {
        const dbCf = normalizeCodiceFiscale(hits[0].codice_fiscale)
        if (cf && dbCf && cf !== dbCf) {
          status = 'da_verificare'
          motivo = 'Il nome corrisponde ma il codice fiscale è diverso'
          suggerimenti = suggestionsOf(hits)
        } else {
          match = { artist: hits[0], type: 'solo_nome' }
        }
      } else {
        status = 'senza_artista'
        motivo = 'Nessun artista corrispondente: la riga non crea un nuovo artista.'
      }
    }

    return rowFromMatch(edit, values, match, status ?? 'senza_artista', motivo, suggerimenti, keepIncluded)
  })

  return { ok: true, rows: claimArtists(rows) }
}

export function buildArtistPatch(artist: ContattiArtist, row: ContattiImportRow): ArtistPatch | null {
  if (!row.artistaId || row.artistaId !== artist.id) return null
  const writes = new Map<ContattiFieldKey, string>()
  const campiCompilati: ContattiFieldKey[] = []
  const conflittiSostituiti: ContattiFieldKey[] = []
  const conflittiMantenuti: ContattiFieldKey[] = []

  for (const field of row.fields) {
    if (field.stato === 'compilare') {
      writes.set(field.key, field.incoming)
      campiCompilati.push(field.key)
    } else if (field.stato === 'conflitto' && field.decision === 'sostituisci') {
      writes.set(field.key, field.incoming)
      conflittiSostituiti.push(field.key)
    } else if (field.stato === 'conflitto') {
      conflittiMantenuti.push(field.key)
    }
  }

  if (writes.size === 0) return null

  const patch: ArtistPatch = {
    artista_id: artist.id,
    campiCompilati,
    conflittiSostituiti,
    conflittiMantenuti,
  }

  const contatti = { ...asRecord(artist.contatti) }
  let contattiChanged = false
  if (writes.has('email')) {
    contatti.email = writes.get('email')
    contattiChanged = true
  }
  if (writes.has('telefono')) {
    const phone = writes.get('telefono') ?? ''
    contatti.number = phone
    contatti.telefono = phone
    contattiChanged = true
  }
  if (contattiChanged) patch.contatti = contatti

  const indirizzo = { ...asRecord(artist.indirizzo) }
  let indirizzoChanged = false
  for (const key of ['via', 'cap', 'citta', 'provincia'] as const) {
    if (!writes.has(key)) continue
    indirizzo[key] = writes.get(key)
    indirizzoChanged = true
  }
  if (indirizzoChanged) patch.indirizzo = indirizzo

  if (writes.has('codice_fiscale')) {
    const cf = normalizeCodiceFiscale(writes.get('codice_fiscale'))
    if (cf) patch.codice_fiscale = cf
  }
  if (writes.has('partita_iva')) {
    const piva = normalizePartitaIva(writes.get('partita_iva'))
    if (piva) patch.partita_iva = piva
  }

  const reservedKeys = ['regime', 'tassazione', 'dettagli_regime'] as const
  if (reservedKeys.some((key) => writes.has(key))) {
    const current = artist.riservati ?? { regime: null, tassazione: null, dettagli_regime: null }
    patch.riservati = {
      regime: writes.has('regime') ? writes.get('regime') || null : current.regime,
      tassazione: writes.has('tassazione') ? writes.get('tassazione') || null : current.tassazione,
      dettagli_regime: writes.has('dettagli_regime') ? writes.get('dettagli_regime') || null : current.dettagli_regime,
    }
  }

  return patch
}

export function patchHasWrite(patch: ArtistPatch): boolean {
  return Boolean(
    patch.contatti
    || patch.indirizzo
    || patch.codice_fiscale
    || patch.partita_iva != null
    || patch.riservati,
  )
}

export function summarizeContattiRows(rows: ContattiImportRow[]): ContattiPreviewSummary {
  return {
    righe: rows.length,
    pronti: rows.filter((row) => row.status === 'pronto').length,
    daVerificare: rows.filter((row) => row.status === 'da_verificare').length,
    conflitti: rows.filter((row) => row.status === 'conflitto').length,
    senzaArtista: rows.filter((row) => row.status === 'senza_artista').length,
    invariati: rows.filter((row) => row.status === 'invariato').length,
    selezionati: rows.filter((row) => row.included).length,
  }
}

export function summarizeContattiCommit(rows: ContattiImportRow[]): ContattiCommitSummary {
  const summary: ContattiCommitSummary = {
    artistiAggiornati: 0,
    campiCompilati: 0,
    conflittiSostituiti: 0,
    conflittiMantenuti: 0,
    saltati: 0,
    invariati: 0,
  }
  for (const row of rows) {
    if (!row.included) {
      summary.saltati += 1
      continue
    }
    const fills = row.fields.filter((field) => field.stato === 'compilare').length
    const replaced = row.fields.filter((field) => field.stato === 'conflitto' && field.decision === 'sostituisci').length
    const kept = row.fields.filter((field) => field.stato === 'conflitto' && field.decision !== 'sostituisci').length
    summary.campiCompilati += fills
    summary.conflittiSostituiti += replaced
    summary.conflittiMantenuti += kept
    if (fills + replaced > 0) summary.artistiAggiornati += 1
    else summary.invariati += 1
  }
  return summary
}

export function rowsToEdits(rows: ContattiImportRow[]): ContattiEdit[] {
  return rows.map((row) => ({
    rowNumber: row.rowNumber,
    values: row.values,
    included: row.included,
    artistaId: row.matchType === 'manuale' ? row.artistaId : null,
    sceltaManuale: row.matchType === 'manuale',
    decisions: Object.fromEntries(row.fields.map((field) => [field.key, field.decision])),
  }))
}

function headerKey(value: string): string {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase()
}

export function editsFromTable(table: TabularTable): { ok: true; edits: ContattiEdit[] } | { ok: false; error: string } {
  const headerMap = new Map<string, string>()
  for (const header of table.headers) {
    const key = headerKey(header)
    if (!key) return { ok: false, error: CONTATTI_IMPORT_HEADER_ERROR }
    if (headerMap.has(key)) return { ok: false, error: CONTATTI_IMPORT_HEADER_ERROR }
    headerMap.set(key, header)
  }
  for (const column of CONTATTI_IMPORT_COLUMNS) {
    if (!headerMap.has(column)) return { ok: false, error: CONTATTI_IMPORT_HEADER_ERROR }
  }
  if (headerMap.size !== CONTATTI_IMPORT_COLUMNS.length) {
    return { ok: false, error: CONTATTI_IMPORT_HEADER_ERROR }
  }

  const edits: ContattiEdit[] = []
  table.rows.forEach((row, index) => {
    const values = blankValues()
    for (const column of CONTATTI_IMPORT_COLUMNS) {
      values[column] = textOf(row[headerMap.get(column) ?? ''])
    }
    if (CONTATTI_IMPORT_COLUMNS.every((column) => values[column] === '')) return
    edits.push({
      rowNumber: index + 2,
      values,
      included: true,
      artistaId: null,
      sceltaManuale: false,
      decisions: {},
    })
  })
  if (edits.length === 0) return { ok: false, error: 'Il file non contiene righe da importare' }
  return { ok: true, edits }
}

export function parseContattiImportFile(
  filename: string,
  data: Buffer | Uint8Array,
): { ok: true; edits: ContattiEdit[] } | { ok: false; error: string } {
  const parsed = parseTabularFile(filename, data)
  if (!parsed.ok) return parsed
  return editsFromTable(parsed.table)
}

function asCell(value: unknown): string | null {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

export function parseContattiEdits(value: unknown): { ok: true; edits: ContattiEdit[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: 'Righe mancanti' }
  if (value.length > 5000) return { ok: false, error: 'Troppe righe (massimo 5000)' }
  const edits: ContattiEdit[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return { ok: false, error: 'Riga non valida' }
    const row = item as Record<string, unknown>
    const rowNumber = row.rowNumber
    if (typeof rowNumber !== 'number' || !Number.isInteger(rowNumber) || rowNumber < 2) {
      return { ok: false, error: 'Numero riga non valido' }
    }
    const rawValues = row.values
    if (rawValues != null && (typeof rawValues !== 'object' || Array.isArray(rawValues))) {
      return { ok: false, error: 'Valori di riga non validi' }
    }
    const source = (rawValues ?? {}) as Record<string, unknown>
    const values = blankValues()
    for (const column of CONTATTI_IMPORT_COLUMNS) {
      if (!(column in source)) continue
      const cell = asCell(source[column])
      if (cell == null) return { ok: false, error: 'Valori di riga non validi' }
      values[column] = cell
    }
    let artistaId: string | null = null
    if (row.artistaId != null && row.artistaId !== '') {
      if (typeof row.artistaId !== 'string' || !UUID_RE.test(row.artistaId)) {
        return { ok: false, error: 'Artista non valido' }
      }
      artistaId = row.artistaId
    }
    const decisions: ContattiEdit['decisions'] = {}
    if (row.decisions != null) {
      if (typeof row.decisions !== 'object' || Array.isArray(row.decisions)) {
        return { ok: false, error: 'Scelte non valide' }
      }
      for (const [key, decision] of Object.entries(row.decisions as Record<string, unknown>)) {
        if (!CONTATTI_FILL_FIELDS.includes(key as ContattiFieldKey)) {
          return { ok: false, error: 'Scelte non valide' }
        }
        if (decision !== 'tieni' && decision !== 'sostituisci') {
          return { ok: false, error: 'Scelte non valide' }
        }
        decisions[key as ContattiFieldKey] = decision
      }
    }
    edits.push({
      rowNumber,
      values,
      included: row.included === true,
      artistaId,
      sceltaManuale: row.sceltaManuale === true,
      decisions,
    })
  }
  return { ok: true, edits }
}
