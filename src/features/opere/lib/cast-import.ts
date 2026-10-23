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
  nome: string
  codice_ipn: string | null
  ruolo_id: string | null
  episodio_id: string | null
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

export type ClassifiedCastRow =
  | { status: 'ignored'; rowNumber: number }
  | (RowFields & { status: 'skipped'; alert: string })
  | (RowFields & {
      status: 'valid'
      action: 'partecipazione'
      artistaId: string
      ruoloId: string
      episodioId: string | null
      detail: string
    })
  | (RowFields & {
      status: 'valid'
      action: 'cast_esterno'
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
  action: 'partecipazione' | 'cast_esterno' | null
  alert: string | null
  detail: string | null
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

function blankRow(record: Record<string, string>): boolean {
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

function skipped(fields: RowFields, alert: string): ClassifiedCastRow {
  return { status: 'skipped', alert, ...fields }
}

export function classifyCastImport(
  headers: string[],
  rows: Record<string, string>[],
  context: CastImportContext,
): { ok: true; rows: ClassifiedCastRow[] } | { ok: false; error: string } {
  const headerError = validateCastHeaders(headers)
  if (headerError) return { ok: false, error: headerError }

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
  const classified: ClassifiedCastRow[] = []

  rows.forEach((record, index) => {
    const rowNumber = index + 2
    if (blankRow(record)) {
      classified.push({ status: 'ignored', rowNumber })
      return
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

    if (!normalizePersonName(nome) || !normalizePersonName(cognome)) {
      classified.push(skipped(fields, CAST_IMPORT_ALERTS.nameRequired))
      return
    }
    const ruolo = resolveRuolo(ruoloLabel, context.ruoli)
    if (!ruolo.ok) {
      classified.push(skipped(fields, ruolo.alert))
      return
    }
    if (!stagioneParsed.ok || !episodioParsed.ok) {
      classified.push(skipped(fields, CAST_IMPORT_ALERTS.seasonNumber))
      return
    }
    const stagione = stagioneParsed.value
    const episodio = episodioParsed.value
    if ((stagione == null) !== (episodio == null)) {
      classified.push(skipped(fields, CAST_IMPORT_ALERTS.seasonPair))
      return
    }

    let episodioId: string | null = null
    if (stagione != null && episodio != null) {
      const found = context.episodi.filter(
        (item) => item.numero_stagione === stagione && item.numero_episodio === episodio,
      )
      if (found.length !== 1) {
        classified.push(skipped(fields, `${CAST_IMPORT_ALERTS.episodeMissing} (stagione ${stagione}, episodio ${episodio})`))
        return
      }
      episodioId = found[0].id
    }

    const artist = matchArtist(nome, cognome, ipn, context.artisti)
    if (artist.kind === 'ipn-conflict') {
      classified.push(skipped(fields, CAST_IMPORT_ALERTS.ipnConflict))
      return
    }
    if (artist.kind === 'ambiguous') {
      classified.push(skipped(fields, CAST_IMPORT_ALERTS.artistAmbiguous))
      return
    }
    if (artist.kind === 'ambiguous-name') {
      classified.push(skipped(fields, CAST_IMPORT_ALERTS.artistNameAmbiguous))
      return
    }

    if (artist.kind === 'rasi') {
      const key = `${artist.artist.id}|${ruolo.ruolo.id}|${scopeKey(episodioId)}`
      if (partecipazioneKeys.has(key)) {
        classified.push(skipped(fields, CAST_IMPORT_ALERTS.duplicateCast))
        return
      }
      if (seenPartecipazioni.has(key)) {
        classified.push(skipped(fields, CAST_IMPORT_ALERTS.duplicateFile))
        return
      }
      seenPartecipazioni.add(key)
      classified.push({
        status: 'valid',
        action: 'partecipazione',
        ...fields,
        artistaId: artist.artist.id,
        ruoloId: ruolo.ruolo.id,
        episodioId,
        detail: 'Artista RASI',
      })
      return
    }

    if (!context.externalCastReady) {
      classified.push(skipped(fields, CAST_IMPORT_ALERTS.migration))
      return
    }

    const externalKey = `${externalNameKey(nome, cognome)}|${normalizeIpn(ipn)}|${ruolo.ruolo.id}|${scopeKey(episodioId)}`
    if (esternoKeys.has(externalKey)) {
      classified.push(skipped(fields, CAST_IMPORT_ALERTS.duplicateCast))
      return
    }
    if (seenEsterni.has(externalKey)) {
      classified.push(skipped(fields, CAST_IMPORT_ALERTS.duplicateFile))
      return
    }
    seenEsterni.add(externalKey)
    classified.push({
      status: 'valid',
      action: 'cast_esterno',
      ...fields,
      ruoloId: ruolo.ruolo.id,
      categoria: ruolo.ruolo.categoria,
      episodioId,
      detail: 'Nessun artista RASI con questo nome, cognome e IPN: va nel cast esterno',
    })
  })

  return { ok: true, rows: classified }
}

export function toPublicCastRows(rows: ClassifiedCastRow[]): CastImportPublicRow[] {
  const result: CastImportPublicRow[] = []
  for (const row of rows) {
    if (row.status === 'ignored') continue
    if (row.status === 'skipped') {
      result.push({
        rowNumber: row.rowNumber,
        nome: row.nome,
        cognome: row.cognome,
        ipn: row.ipn,
        ruolo: row.ruolo,
        stagione: row.stagione,
        episodio: row.episodio,
        status: 'skipped',
        action: null,
        alert: row.alert,
        detail: null,
      })
      continue
    }
    result.push({
      rowNumber: row.rowNumber,
      nome: row.nome,
      cognome: row.cognome,
      ipn: row.ipn,
      ruolo: row.ruolo,
      stagione: row.stagione,
      episodio: row.episodio,
      status: 'valid',
      action: row.action,
      alert: null,
      detail: row.detail,
    })
  }
  return result
}

export function summarizeCastRows(rows: CastImportPublicRow[]): {
  valid: number
  skipped: number
  partecipazioni: number
  castEsterno: number
} {
  return {
    valid: rows.filter((row) => row.status === 'valid').length,
    skipped: rows.filter((row) => row.status === 'skipped').length,
    partecipazioni: rows.filter((row) => row.status === 'valid' && row.action === 'partecipazione').length,
    castEsterno: rows.filter((row) => row.status === 'valid' && row.action === 'cast_esterno').length,
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
    return { ...row, status: 'skipped', action: null, alert, detail: null }
  })
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

export function buildCastImportInserts(
  operaId: string,
  rows: ClassifiedCastRow[],
  startOrdine: number,
): { partecipazioni: (PartecipazioneInsert & { rowNumber: number })[]; castEsterno: (CastEsternoInsert & { rowNumber: number })[] } {
  const partecipazioni: (PartecipazioneInsert & { rowNumber: number })[] = []
  const castEsterno: (CastEsternoInsert & { rowNumber: number })[] = []
  let ordine = startOrdine
  for (const row of rows) {
    if (row.status !== 'valid') continue
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
  return { partecipazioni, castEsterno }
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
