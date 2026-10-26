/**
 * Regole dell'import cast di una singola opera.
 * Il parsing del file sta in `@/shared/lib/tabular-file` (riuso per gli episodi).
 */

export const CAST_TEMPLATE_COLUMNS = ['Nome', 'Cognome', 'IPN', 'Ruolo', 'Stagione', 'Episodio'] as const

export type CastTemplateColumn = (typeof CAST_TEMPLATE_COLUMNS)[number]

export const CAST_IMPORT_ALERTS = {
  headers: 'Il file deve avere esattamente le colonne: Nome, Cognome, IPN, Ruolo, Stagione, Episodio',
  nameRequired: 'Nome e cognome sono obbligatori',
  ruoloMissing: 'Ruolo mancante',
  ruoloUnknown: 'Ruolo non riconosciuto',
  ruoloInactive: 'Ruolo non attivo',
  ruoloAmbiguous: 'Più ruoli attivi hanno lo stesso nome',
  seasonPair: 'Stagione ed episodio vanno indicati insieme',
  seasonNumber: 'Stagione o episodio non è un numero intero',
  episodeMissing: 'Episodio non trovato',
  ipnConflict: 'IPN corrisponde a un altro artista',
  artistAmbiguous: 'Più artisti RASI hanno lo stesso nome, cognome e IPN',
  artistNameAmbiguous: 'Più artisti RASI hanno lo stesso nome e cognome senza IPN',
  duplicateCast: 'Già presente nel cast con lo stesso ruolo',
  duplicateFile: 'Duplicato nel file',
  duplicateManual:
    'Duplicato: questa persona è già nel cast esterno senza ruolo. Di default si aggiorna quella riga con il ruolo del file, senza crearne una seconda.',
  duplicateManualCreate:
    'Duplicato: questa persona è già nel cast esterno senza ruolo. Hai scelto di creare una nuova riga.',
  duplicateManualAmbiguous:
    'Duplicato: più persone del cast esterno senza ruolo hanno questo nome in questo ambito. Scegli quale riga aggiornare.',
  migration: 'Cast esterno non disponibile: applica la migrazione con ruolo_id e codice_ipn prima di importare persone non RASI',
} as const

const ACCENT_FROM = 'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñ'
const ACCENT_TO = 'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'

/** Stessa traduzione accenti di nome_persona_key, senza riordinare i token. */
export function normalizePersonName(value: string | null | undefined): string {
  const raw = value ?? ''
  let folded = ''
  for (const char of raw) {
    const index = ACCENT_FROM.indexOf(char)
    folded += index >= 0 ? ACCENT_TO[index] : char
  }
  return folded
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/ +/g, ' ')
}

export function normalizeIpn(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase()
}

export function cleanCell(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ')
}

export type CastArtist = {
  id: string
  nome: string | null
  cognome: string | null
  codice_ipn: string | null
}

export type CastRuolo = {
  id: string
  nome: string
  attivo: boolean | null
  categoria: string | null
}

export type CastEpisodio = {
  id: string
  numero_stagione: number | null
  numero_episodio: number | null
}

export type CastExistingPartecipazione = {
  artista_id: string
  ruolo_id: string
  episodio_id: string | null
}

export type CastExistingEsterno = {
  id: string
  nome: string
  codice_ipn: string | null
  ruolo_id: string | null
  episodio_id: string | null
  personaggio?: string | null
}

export type CastEsternoCandidato = {
  id: string
  nome: string
  codice_ipn: string | null
  personaggio: string | null
}

export type CastProposta = 'aggiorna' | 'crea'

/** Riga modificata in anteprima. Stagione ed episodio restano testo, come nel file. */
export type CastEditInput = {
  rowNumber: number
  nome: string
  cognome: string
  ipn: string
  ruolo: string
  stagione: string
  episodio: string
  included: boolean
  proposta: CastProposta | null
  castEsternoId: string | null
}

export type CastImportContext = {
  artisti: CastArtist[]
  ruoli: CastRuolo[]
  episodi: CastEpisodio[]
  partecipazioni: CastExistingPartecipazione[]
  castEsterno: CastExistingEsterno[]
  /** False se ruolo_id/codice_ipn non sono ancora nello schema. */
  externalCastReady: boolean
}

type RowFields = {
  rowNumber: number
  nome: string
  cognome: string
  ipn: string
  ruolo: string
  stagione: number | null
  episodio: number | null
}

type CastDecision = {
  included: boolean
  alert: string | null
  proposta: CastProposta | null
  castEsternoId: string | null
  candidati: CastEsternoCandidato[]
}

export type ClassifiedCastRow =
  | { status: 'ignored'; rowNumber: number }
  | (RowFields & CastDecision & { status: 'skipped' })
  | (RowFields &
      CastDecision & {
        status: 'valid'
        action: 'partecipazione'
        artistaId: string
        ruoloId: string
        episodioId: string | null
        detail: string
      })
  | (RowFields &
      CastDecision & {
        status: 'valid'
        action: 'cast_esterno' | 'update_cast_esterno'
        ruoloId: string
        categoria: string | null
        episodioId: string | null
        detail: string
      })

export type CastImportPublicRow = {
  rowNumber: number
  nome: string
  cognome: string
  ipn: string
  ruolo: string
  stagione: number | null
  episodio: number | null
  status: 'valid' | 'skipped'
  action: 'partecipazione' | 'cast_esterno' | 'update_cast_esterno' | null
  alert: string | null
  detail: string | null
  included: boolean
  proposta: CastProposta | null
  castEsternoId: string | null
  candidati: CastEsternoCandidato[]
  flagged: boolean
}

export type InsertError = { code?: string; message: string } | null

export function isMissingCastEsternoColumnError(message: string): boolean {
  return /ruolo_id|codice_ipn/i.test(message) && /does not exist|schema cache|non esiste/i.test(message)
}

export function validateCastHeaders(headers: string[]): string | null {
  const trimmed = headers.map((header) => header.replace(/^\uFEFF/, '').trim())
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') trimmed.pop()
  if (trimmed.length !== CAST_TEMPLATE_COLUMNS.length || trimmed.some((header, index) => header !== CAST_TEMPLATE_COLUMNS[index])) {
    return CAST_IMPORT_ALERTS.headers
  }
  return null
}

function personKey(nome: string | null | undefined, cognome: string | null | undefined): string {
  return `${normalizePersonName(nome)}\n${normalizePersonName(cognome)}`
}

function externalNameKey(nome: string, cognome: string): string {
  return normalizePersonName(`${nome} ${cognome}`)
}

function scopeKey(episodioId: string | null): string {
  return episodioId ?? ''
}

function parseOptionalInt(value: string): { ok: true; value: number | null } | { ok: false } {
  const text = value.trim()
  if (text === '') return { ok: true, value: null }
  if (!/^\d+$/.test(text)) return { ok: false }
  return { ok: true, value: Number(text) }
}

function resolveRuolo(label: string, ruoli: CastRuolo[]): { ok: true; ruolo: CastRuolo } | { ok: false; alert: string } {
  const key = cleanCell(label).toLowerCase()
  if (!key) return { ok: false, alert: CAST_IMPORT_ALERTS.ruoloMissing }
  const matches = ruoli.filter((ruolo) => cleanCell(ruolo.nome).toLowerCase() === key)
  if (matches.length === 0) return { ok: false, alert: `${CAST_IMPORT_ALERTS.ruoloUnknown}: ${cleanCell(label)}` }
  const active = matches.filter((ruolo) => ruolo.attivo !== false)
  if (active.length > 1) return { ok: false, alert: `${CAST_IMPORT_ALERTS.ruoloAmbiguous}: ${cleanCell(label)}` }
  if (active.length === 1) return { ok: true, ruolo: active[0] }
  return { ok: false, alert: `${CAST_IMPORT_ALERTS.ruoloInactive}: ${cleanCell(label)}` }
}

function blankRow(record: CastValueRow): boolean {
  return CAST_TEMPLATE_COLUMNS.every((column) => cleanCell(record[column] ?? '') === '')
}

type ArtistMatch =
  | { kind: 'rasi'; artist: CastArtist }
  | { kind: 'esterno' }
  | { kind: 'ipn-conflict' }
  | { kind: 'ambiguous' }
  | { kind: 'ambiguous-name' }

function matchArtist(nome: string, cognome: string, ipn: string, artisti: CastArtist[]): ArtistMatch {
  const ipnKey = normalizeIpn(ipn)
  const nameKey = personKey(nome, cognome)
  const sameName = (artist: CastArtist) => personKey(artist.nome, artist.cognome) === nameKey

  if (ipnKey) {
    const byIpn = artisti.filter((artist) => normalizeIpn(artist.codice_ipn) === ipnKey)
    if (byIpn.length === 0) return { kind: 'esterno' }
    if (byIpn.length > 1) {
      const full = byIpn.filter(sameName)
      if (full.length === byIpn.length) return { kind: 'ambiguous' }
      return { kind: 'ipn-conflict' }
    }
    return sameName(byIpn[0]) ? { kind: 'rasi', artist: byIpn[0] } : { kind: 'ipn-conflict' }
  }

  const byName = artisti.filter((artist) => sameName(artist) && !normalizeIpn(artist.codice_ipn))
  if (byName.length === 1) return { kind: 'rasi', artist: byName[0] }
  if (byName.length > 1) return { kind: 'ambiguous-name' }
  return { kind: 'esterno' }
}

function rejected(fields: RowFields, alert: string): ClassifiedCastRow {
  return { status: 'skipped', alert, included: false, proposta: null, castEsternoId: null, candidati: [], ...fields }
}

export function externalCandidateLabel(candidate: CastEsternoCandidato, index: number): string {
  const ipn = cleanCell(candidate.codice_ipn)
  const personaggio = cleanCell(candidate.personaggio)
  const parts = [cleanCell(candidate.nome) || 'Senza nome']
  if (personaggio) parts.push(personaggio)
  parts.push(ipn ? `IPN ${ipn}` : 'senza IPN')
  parts.push(String(index + 1))
  return parts.join(' · ')
}

function toCandidato(row: CastExistingEsterno): CastEsternoCandidato {
  return {
    id: row.id,
    nome: row.nome,
    codice_ipn: row.codice_ipn,
    personaggio: row.personaggio ?? null,
  }
}

export type CastValueRow = { rowNumber: number } & Record<CastTemplateColumn, string>

export function classifyCastImport(
  headers: string[],
  rows: Record<string, string>[],
  context: CastImportContext,
  edits?: CastEditInput[],
): { ok: true; rows: ClassifiedCastRow[] } | { ok: false; error: string } {
  const headerError = validateCastHeaders(headers)
  if (headerError) return { ok: false, error: headerError }
  return {
    ok: true,
    rows: classifyCastValues(
      rows.map((record, index) => ({
        rowNumber: index + 2,
        Nome: record.Nome ?? '',
        Cognome: record.Cognome ?? '',
        IPN: record.IPN ?? '',
        Ruolo: record.Ruolo ?? '',
        Stagione: record.Stagione ?? '',
        Episodio: record.Episodio ?? '',
      })),
      context,
      edits,
    ).rows,
  }
}

function editFor(edits: CastEditInput[] | undefined, rowNumber: number): CastEditInput | undefined {
  return edits?.find((edit) => edit.rowNumber === rowNumber)
}

function manualWithoutRole(
  nome: string,
  cognome: string,
  episodioId: string | null,
  context: CastImportContext,
): CastExistingEsterno[] {
  const name = externalNameKey(nome, cognome)
  const scope = scopeKey(episodioId)
  return context.castEsterno.filter(
    (row) => !row.ruolo_id && normalizePersonName(row.nome) === name && scopeKey(row.episodio_id) === scope,
  )
}

export function classifyCastValues(
  values: CastValueRow[],
  context: CastImportContext,
  edits?: CastEditInput[],
): { ok: true; rows: ClassifiedCastRow[] } {
  const partecipazioneKeys = new Set(
    context.partecipazioni.map((row) => `${row.artista_id}|${row.ruolo_id}|${scopeKey(row.episodio_id)}`),
  )
  const esternoKeys = new Set(
    context.castEsterno
      .filter((row) => row.ruolo_id)
      .map(
        (row) =>
          `${normalizePersonName(row.nome)}|${normalizeIpn(row.codice_ipn)}|${row.ruolo_id}|${scopeKey(row.episodio_id)}`,
      ),
  )
  const seenPartecipazioni = new Set<string>()
  const seenEsterni = new Set<string>()
  const seenManual = new Set<string>()
  const classified: ClassifiedCastRow[] = []

  for (const record of values) {
    const rowNumber = record.rowNumber
    if (blankRow(record)) {
      classified.push({ status: 'ignored', rowNumber })
      continue
    }

    const nome = cleanCell(record.Nome)
    const cognome = cleanCell(record.Cognome)
    const ipn = cleanCell(record.IPN)
    const ruoloLabel = cleanCell(record.Ruolo)
    const stagioneRaw = record.Stagione ?? ''
    const episodioRaw = record.Episodio ?? ''
    const stagioneParsed = parseOptionalInt(stagioneRaw)
    const episodioParsed = parseOptionalInt(episodioRaw)
    const fields: RowFields = {
      rowNumber,
      nome,
      cognome,
      ipn,
      ruolo: ruoloLabel,
      stagione: stagioneParsed.ok ? stagioneParsed.value : null,
      episodio: episodioParsed.ok ? episodioParsed.value : null,
    }
    const choice = editFor(edits, rowNumber)
    const wantsInclude = choice ? choice.included : true

    if (!normalizePersonName(nome) || !normalizePersonName(cognome)) {
      classified.push(rejected(fields, CAST_IMPORT_ALERTS.nameRequired))
      continue
    }
    const ruolo = resolveRuolo(ruoloLabel, context.ruoli)
    if (!ruolo.ok) {
      classified.push(rejected(fields, ruolo.alert))
      continue
    }
    if (!stagioneParsed.ok || !episodioParsed.ok) {
      classified.push(rejected(fields, CAST_IMPORT_ALERTS.seasonNumber))
      continue
    }
    const stagione = stagioneParsed.value
    const episodio = episodioParsed.value
    if ((stagione == null) !== (episodio == null)) {
      classified.push(rejected(fields, CAST_IMPORT_ALERTS.seasonPair))
      continue
    }

    let episodioId: string | null = null
    if (stagione != null && episodio != null) {
      const found = context.episodi.filter(
        (item) => item.numero_stagione === stagione && item.numero_episodio === episodio,
      )
      if (found.length !== 1) {
        classified.push(rejected(fields, `${CAST_IMPORT_ALERTS.episodeMissing} (stagione ${stagione}, episodio ${episodio})`))
        continue
      }
      episodioId = found[0].id
    }

    const artist = matchArtist(nome, cognome, ipn, context.artisti)
    if (artist.kind === 'ipn-conflict') {
      classified.push(rejected(fields, CAST_IMPORT_ALERTS.ipnConflict))
      continue
    }
    if (artist.kind === 'ambiguous') {
      classified.push(rejected(fields, CAST_IMPORT_ALERTS.artistAmbiguous))
      continue
    }
    if (artist.kind === 'ambiguous-name') {
      classified.push(rejected(fields, CAST_IMPORT_ALERTS.artistNameAmbiguous))
      continue
    }

    if (artist.kind === 'rasi') {
      const key = `${artist.artist.id}|${ruolo.ruolo.id}|${scopeKey(episodioId)}`
      if (partecipazioneKeys.has(key)) {
        classified.push(rejected(fields, CAST_IMPORT_ALERTS.duplicateCast))
        continue
      }
      if (wantsInclude && seenPartecipazioni.has(key)) {
        classified.push(rejected(fields, CAST_IMPORT_ALERTS.duplicateFile))
        continue
      }
      if (wantsInclude) seenPartecipazioni.add(key)
      classified.push({
        status: 'valid',
        action: 'partecipazione',
        included: wantsInclude,
        alert: null,
        proposta: null,
        castEsternoId: null,
        candidati: [],
        ...fields,
        artistaId: artist.artist.id,
        ruoloId: ruolo.ruolo.id,
        episodioId,
        detail: 'Artista RASI',
      })
      continue
    }

    if (!context.externalCastReady) {
      classified.push(rejected(fields, CAST_IMPORT_ALERTS.migration))
      continue
    }

    const manuals = manualWithoutRole(nome, cognome, episodioId, context)
    const candidati = manuals.map(toCandidato)
    const createAnyway = manuals.length > 0 && choice?.proposta === 'crea'
    if (manuals.length > 0 && !createAnyway) {
      const manual = manuals.find((row) => row.id === choice?.castEsternoId) ?? manuals[0]
      if (wantsInclude && seenManual.has(manual.id)) {
        classified.push(rejected(fields, CAST_IMPORT_ALERTS.duplicateFile))
        continue
      }
      if (wantsInclude) seenManual.add(manual.id)
      const many = manuals.length > 1
      classified.push({
        status: 'valid',
        action: 'update_cast_esterno',
        included: wantsInclude,
        alert: many ? CAST_IMPORT_ALERTS.duplicateManualAmbiguous : CAST_IMPORT_ALERTS.duplicateManual,
        proposta: 'aggiorna',
        castEsternoId: manual.id,
        candidati,
        ...fields,
        ruoloId: ruolo.ruolo.id,
        categoria: ruolo.ruolo.categoria,
        episodioId,
        detail: many
          ? 'Aggiorna la persona scelta tra gli omonimi già inseriti a mano'
          : 'Aggiorna la persona già inserita a mano, senza creare una seconda riga',
      })
      continue
    }

    const externalKey = `${externalNameKey(nome, cognome)}|${normalizeIpn(ipn)}|${ruolo.ruolo.id}|${scopeKey(episodioId)}`
    if (esternoKeys.has(externalKey)) {
      classified.push(rejected(fields, CAST_IMPORT_ALERTS.duplicateCast))
      continue
    }
    if (wantsInclude && seenEsterni.has(externalKey)) {
      classified.push(rejected(fields, CAST_IMPORT_ALERTS.duplicateFile))
      continue
    }
    if (wantsInclude) seenEsterni.add(externalKey)
    classified.push({
      status: 'valid',
      action: 'cast_esterno',
      included: wantsInclude,
      alert: createAnyway ? CAST_IMPORT_ALERTS.duplicateManualCreate : null,
      proposta: createAnyway ? 'crea' : null,
      castEsternoId: null,
      candidati: createAnyway ? candidati : [],
      ...fields,
      ruoloId: ruolo.ruolo.id,
      categoria: ruolo.ruolo.categoria,
      episodioId,
      detail: createAnyway
        ? 'Nuova riga di cast esterno, la persona già presente resta com\'è'
        : 'Nessun artista RASI con questo nome, cognome e IPN: va nel cast esterno',
    })
  }

  return { ok: true, rows: classified }
}

export function toPublicCastRows(rows: ClassifiedCastRow[]): CastImportPublicRow[] {
  const result: CastImportPublicRow[] = []
  for (const row of rows) {
    if (row.status === 'ignored') continue
    const common = {
      rowNumber: row.rowNumber,
      nome: row.nome,
      cognome: row.cognome,
      ipn: row.ipn,
      ruolo: row.ruolo,
      stagione: row.stagione,
      episodio: row.episodio,
      alert: row.alert,
      included: row.status === 'valid' && row.included,
      proposta: row.proposta,
      castEsternoId: row.castEsternoId,
      candidati: row.candidati,
      flagged: Boolean(row.alert),
    }
    if (row.status === 'skipped') {
      result.push({
        ...common,
        status: 'skipped',
        action: null,
        detail: null,
        included: false,
      })
      continue
    }
    result.push({
      ...common,
      status: 'valid',
      action: row.action,
      detail: row.detail,
    })
  }
  return result
}

export function summarizeCastRows(rows: CastImportPublicRow[]): {
  valid: number
  excluded: number
  skipped: number
  partecipazioni: number
  castEsterno: number
  aggiornamenti: number
} {
  const included = (row: CastImportPublicRow) => row.status === 'valid' && row.included
  return {
    valid: rows.filter(included).length,
    excluded: rows.filter((row) => row.status === 'valid' && !row.included).length,
    skipped: rows.filter((row) => row.status === 'skipped').length,
    partecipazioni: rows.filter((row) => included(row) && row.action === 'partecipazione').length,
    castEsterno: rows.filter((row) => included(row) && row.action === 'cast_esterno').length,
    aggiornamenti: rows.filter((row) => included(row) && row.action === 'update_cast_esterno').length,
  }
}

export function withCommitFailures(
  rows: CastImportPublicRow[],
  failures: { rowNumber: number; alert: string }[],
): CastImportPublicRow[] {
  const byRow = new Map(failures.map((failure) => [failure.rowNumber, failure.alert]))
  return rows.map((row) => {
    const alert = byRow.get(row.rowNumber)
    if (!alert || row.status !== 'valid') return row
    return {
      ...row,
      status: 'skipped',
      action: null,
      alert,
      detail: null,
      included: false,
      flagged: true,
      proposta: null,
    }
  })
}

function cellText(value: unknown): string | null {
  if (value == null) return ''
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string') return value
  return null
}

export function parseCastEdits(value: unknown): { ok: true; edits: CastEditInput[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: 'Righe mancanti' }
  if (value.length > 5000) return { ok: false, error: 'Troppe righe (massimo 5000)' }
  const edits: CastEditInput[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return { ok: false, error: 'Riga non valida' }
    const row = item as Record<string, unknown>
    const rowNumber = row.rowNumber
    if (typeof rowNumber !== 'number' || !Number.isInteger(rowNumber) || rowNumber < 2) {
      return { ok: false, error: 'Numero riga non valido' }
    }
    const nome = cellText(row.nome)
    const cognome = cellText(row.cognome)
    const ipn = cellText(row.ipn)
    const ruolo = cellText(row.ruolo)
    const stagione = cellText(row.stagione)
    const episodio = cellText(row.episodio)
    if (nome == null || cognome == null || ipn == null || ruolo == null || stagione == null || episodio == null) {
      return { ok: false, error: 'Valori riga non validi' }
    }
    if (typeof row.included !== 'boolean') return { ok: false, error: 'Inclusione riga non valida' }
    if (row.proposta !== null && row.proposta !== 'aggiorna' && row.proposta !== 'crea') {
      return { ok: false, error: 'Azione riga non valida' }
    }
    let castEsternoId: string | null = null
    if (row.castEsternoId != null) {
      if (typeof row.castEsternoId !== 'string' || row.castEsternoId.trim() === '') {
        return { ok: false, error: 'Persona da aggiornare non valida' }
      }
      castEsternoId = row.castEsternoId
    }
    edits.push({
      rowNumber,
      nome,
      cognome,
      ipn,
      ruolo,
      stagione,
      episodio,
      included: row.included,
      proposta: row.proposta,
      castEsternoId,
    })
  }
  return { ok: true, edits }
}

/** Valori obbligatori di cast_esterno.ruolo/primarieta. Il ruolo vero è ruolo_id. */
export function legacyCastFields(categoria: string | null, ruoloNome: string): {
  ruolo: 'attore' | 'doppiatore'
  primarieta: 'primario' | 'comprimario'
} {
  const ruolo = categoria === 'doppiaggio' || /doppi/i.test(ruoloNome) ? 'doppiatore' : 'attore'
  const primarieta = /comprimari/i.test(ruoloNome) ? 'comprimario' : /primari/i.test(ruoloNome) ? 'primario' : 'comprimario'
  return { ruolo, primarieta }
}

export type PartecipazioneInsert = {
  artista_id: string
  opera_id: string
  episodio_id: string | null
  ruolo_id: string
  personaggio: null
  note: null
}

export type CastEsternoInsert = {
  opera_id: string
  episodio_id: string | null
  nome: string
  personaggio: null
  primarieta: 'primario' | 'comprimario'
  ruolo: 'attore' | 'doppiatore'
  ruolo_id: string
  codice_ipn: string | null
  imdb_nconst: null
  fonte: 'manuale'
  ordine: number
}

export type CastEsternoUpdate = {
  id: string
  nome: string
  codice_ipn: string | null
  ruolo_id: string
  ruolo: 'attore' | 'doppiatore'
  primarieta: 'primario' | 'comprimario'
}

export function buildCastImportInserts(
  operaId: string,
  rows: ClassifiedCastRow[],
  startOrdine: number,
): {
  partecipazioni: (PartecipazioneInsert & { rowNumber: number })[]
  castEsterno: (CastEsternoInsert & { rowNumber: number })[]
  aggiornamenti: (CastEsternoUpdate & { rowNumber: number })[]
} {
  const partecipazioni: (PartecipazioneInsert & { rowNumber: number })[] = []
  const castEsterno: (CastEsternoInsert & { rowNumber: number })[] = []
  const aggiornamenti: (CastEsternoUpdate & { rowNumber: number })[] = []
  let ordine = startOrdine
  for (const row of rows) {
    if (row.status !== 'valid' || !row.included) continue
    if (row.action === 'partecipazione') {
      partecipazioni.push({
        rowNumber: row.rowNumber,
        artista_id: row.artistaId,
        opera_id: operaId,
        episodio_id: row.episodioId,
        ruolo_id: row.ruoloId,
        personaggio: null,
        note: null,
      })
      continue
    }
    const legacy = legacyCastFields(row.categoria, row.ruolo)
    if (row.action === 'update_cast_esterno') {
      if (!row.castEsternoId) continue
      aggiornamenti.push({
        rowNumber: row.rowNumber,
        id: row.castEsternoId,
        nome: `${row.nome} ${row.cognome}`.trim(),
        codice_ipn: cleanCell(row.ipn) || null,
        ruolo_id: row.ruoloId,
        ruolo: legacy.ruolo,
        primarieta: legacy.primarieta,
      })
      continue
    }
    castEsterno.push({
      rowNumber: row.rowNumber,
      opera_id: operaId,
      episodio_id: row.episodioId,
      nome: `${row.nome} ${row.cognome}`.trim(),
      personaggio: null,
      primarieta: legacy.primarieta,
      ruolo: legacy.ruolo,
      ruolo_id: row.ruoloId,
      codice_ipn: cleanCell(row.ipn) || null,
      imdb_nconst: null,
      fonte: 'manuale',
      ordine,
    })
    ordine += 1
  }
  return { partecipazioni, castEsterno, aggiornamenti }
}

export async function insertWithDuplicateFallback<T extends { rowNumber: number }>(
  rows: T[],
  insertMany: (rows: T[]) => Promise<{ error: InsertError }>,
  insertOne: (row: T) => Promise<{ error: InsertError }>,
  duplicateAlert: string,
): Promise<{ inserted: number; failed: { rowNumber: number; alert: string }[] }> {
  if (rows.length === 0) return { inserted: 0, failed: [] }
  const batch = await insertMany(rows)
  if (!batch.error) return { inserted: rows.length, failed: [] }

  const alertFor = (error: InsertError) => {
    if (error?.code === '23505') return duplicateAlert
    if (error && isMissingCastEsternoColumnError(error.message)) return CAST_IMPORT_ALERTS.migration
    return `Importazione non riuscita: ${error?.message || 'errore sconosciuto'}`
  }

  if (batch.error.code !== '23505') {
    const alert = alertFor(batch.error)
    return { inserted: 0, failed: rows.map((row) => ({ rowNumber: row.rowNumber, alert })) }
  }

  let inserted = 0
  const failed: { rowNumber: number; alert: string }[] = []
  for (const row of rows) {
    const result = await insertOne(row)
    if (!result.error) {
      inserted += 1
      continue
    }
    failed.push({ rowNumber: row.rowNumber, alert: alertFor(result.error) })
  }
  return { inserted, failed }
}
