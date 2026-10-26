import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildCastImportInserts,
  classifyCastImport,
  classifyCastValues,
  insertWithDuplicateFallback,
  isMissingCastEsternoColumnError,
  summarizeCastRows,
  toPublicCastRows,
  withCommitFailures,
  CAST_IMPORT_ALERTS,
  type CastEditInput,
  type CastExistingEsterno,
  type CastImportContext,
  type CastImportPublicRow,
  type ClassifiedCastRow,
} from '@/features/opere/lib/cast-import'
import { RUOLO_PRIMARIETA_OPTIONS } from '@/features/opere/lib/cast-esterno'
import { activeRuoloNames, buildCastTemplateCsv, buildCastTemplateXlsx } from '@/features/opere/lib/cast-template'
import { parseTabularFile } from '@/shared/lib/tabular-file'
import type { Database } from '@/shared/lib/supabase'

type Client = SupabaseClient<Database>
const PAGE = 1000
const MAX_ARTISTS = 20000

type PageResult<T> = { data: T[] | null; error: { message: string } | null }

async function fetchAll<T>(load: (from: number, to: number) => PromiseLike<PageResult<T>>): Promise<T[]> {
  const all: T[] = []
  for (let page = 0; page < 100; page += 1) {
    const from = page * PAGE
    const { data, error } = await load(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const batch = data ?? []
    all.push(...batch)
    if (batch.length < PAGE) return all
  }
  throw new Error('Lettura interrotta: risultato troppo grande')
}

async function loadArtisti(client: Client): Promise<CastImportContext['artisti']> {
  const artisti = await fetchAll<{ id: string; nome: string | null; cognome: string | null; codice_ipn: string | null }>(
    (from, to) => client.from('artisti').select('id, nome, cognome, codice_ipn').order('id').range(from, to),
  )
  if (artisti.length > MAX_ARTISTS) {
    throw new Error('Anagrafica artisti troppo grande per il confronto completo di nome, cognome e IPN')
  }
  return artisti
}

async function loadCastEsterno(client: Client, operaId: string): Promise<{ externalCastReady: boolean; castEsterno: CastExistingEsterno[] }> {
  const probe = await client.from('cast_esterno').select('ruolo_id').eq('opera_id', operaId).limit(1)
  if (probe.error && isMissingCastEsternoColumnError(probe.error.message)) {
    const rows = await fetchAll<{ id: string; nome: string; episodio_id: string | null }>((from, to) =>
      client.from('cast_esterno').select('id, nome, episodio_id, personaggio').eq('opera_id', operaId).order('id').range(from, to),
    )
    return {
      externalCastReady: false,
      castEsterno: rows.map((row) => ({ ...row, codice_ipn: null, ruolo_id: null })),
    }
  }
  if (probe.error) throw new Error(probe.error.message)
  const rows = await fetchAll<CastExistingEsterno>((from, to) =>
    client.from('cast_esterno').select('id, nome, codice_ipn, ruolo_id, episodio_id, personaggio').eq('opera_id', operaId).order('id').range(from, to),
  )
  return { externalCastReady: true, castEsterno: rows }
}

export async function loadCastImportContext(client: Client, operaId: string): Promise<CastImportContext> {
  const [artisti, ruoli, episodi, partecipazioni, esterno] = await Promise.all([
    loadArtisti(client),
    fetchAll<CastImportContext['ruoli'][number]>((from, to) =>
      client.from('ruoli_tipologie').select('id, nome, attivo, categoria').order('id').range(from, to),
    ),
    fetchAll<CastImportContext['episodi'][number]>((from, to) =>
      client.from('episodi').select('id, numero_stagione, numero_episodio').eq('opera_id', operaId).order('id').range(from, to),
    ),
    fetchAll<CastImportContext['partecipazioni'][number]>((from, to) =>
      client.from('partecipazioni').select('artista_id, ruolo_id, episodio_id').eq('opera_id', operaId).order('id').range(from, to),
    ),
    loadCastEsterno(client, operaId),
  ])
  return { artisti, ruoli, episodi, partecipazioni, ...esterno }
}

function present(context: CastImportContext, classified: ClassifiedCastRow[]) {
  const rows = toPublicCastRows(classified)
  return {
    ok: true as const,
    rows,
    summary: summarizeCastRows(rows),
    ruoli: activeRuoloNames(context.ruoli),
    classified,
  }
}

export async function previewCastFile(client: Client, operaId: string, filename: string, data: Buffer) {
  const parsed = parseTabularFile(filename, data)
  if (!parsed.ok) return { ok: false as const, error: parsed.error }
  const context = await loadCastImportContext(client, operaId)
  const classified = classifyCastImport(parsed.table.headers, parsed.table.rows, context)
  if (!classified.ok) return classified
  return present(context, classified.rows)
}

export async function revalidateCastEdits(client: Client, operaId: string, edits: CastEditInput[]) {
  const context = await loadCastImportContext(client, operaId)
  const classified = classifyCastValues(
    edits.map((edit) => ({
      rowNumber: edit.rowNumber,
      Nome: edit.nome,
      Cognome: edit.cognome,
      IPN: edit.ipn,
      Personaggio: edit.personaggio ?? '',
      Ruolo: edit.ruolo,
      Stagione: edit.stagione,
      Episodio: edit.episodio,
    })),
    context,
    edits,
  )
  return present(context, classified.rows)
}

export async function commitCastEdits(client: Client, operaId: string, edits: CastEditInput[]) {
  const preview = await revalidateCastEdits(client, operaId, edits)
  if (!preview.ok) return preview
  const failures = await insertClassifiedRows(client, operaId, preview.classified)
  const rows = withCommitFailures(preview.rows, failures)
  const summary = summarizeCastRows(rows)
  return {
    ok: true as const,
    rows,
    summary: {
      imported: summary.valid,
      skipped: summary.skipped,
      excluded: summary.excluded,
      partecipazioni: summary.partecipazioni,
      castEsterno: summary.castEsterno,
      aggiornamenti: summary.aggiornamenti,
    },
    ruoli: preview.ruoli,
  }
}

async function insertClassifiedRows(client: Client, operaId: string, rows: ClassifiedCastRow[]) {
  const ordineQuery = await client
    .from('cast_esterno')
    .select('ordine')
    .eq('opera_id', operaId)
    .order('ordine', { ascending: false })
    .limit(1)
  if (ordineQuery.error) throw new Error(ordineQuery.error.message)
  const startOrdine = (ordineQuery.data?.[0]?.ordine ?? -1) + 1
  const inserts = buildCastImportInserts(operaId, rows, startOrdine)

  const partecipazioni = await insertWithDuplicateFallback(
    inserts.partecipazioni,
    async (batch) => {
      const { error } = await client.from('partecipazioni').insert(batch.map(({ rowNumber: _rowNumber, ...payload }) => payload))
      return { error: error ? { code: error.code, message: error.message } : null }
    },
    async (row) => {
      const { rowNumber: _rowNumber, ...payload } = row
      const { error } = await client.from('partecipazioni').insert(payload)
      return { error: error ? { code: error.code, message: error.message } : null }
    },
    CAST_IMPORT_ALERTS.duplicateCast,
  )

  const esterni = await insertWithDuplicateFallback(
    inserts.castEsterno,
    async (batch) => {
      const { error } = await client.from('cast_esterno').insert(batch.map(({ rowNumber: _rowNumber, ...payload }) => payload))
      return { error: error ? { code: error.code, message: error.message } : null }
    },
    async (row) => {
      const { rowNumber: _rowNumber, ...payload } = row
      const { error } = await client.from('cast_esterno').insert(payload)
      return { error: error ? { code: error.code, message: error.message } : null }
    },
    CAST_IMPORT_ALERTS.duplicateCast,
  )

  const aggiornamenti: { rowNumber: number; alert: string }[] = []
  for (const row of inserts.aggiornamenti) {
    const { rowNumber, id, ...patch } = row
    const { error } = await client.from('cast_esterno').update(patch).eq('id', id).eq('opera_id', operaId)
    if (!error) continue
    aggiornamenti.push({
      rowNumber,
      alert: isMissingCastEsternoColumnError(error.message) ? CAST_IMPORT_ALERTS.migration : `Importazione non riuscita: ${error.message}`,
    })
  }

  return [...partecipazioni.failed, ...esterni.failed, ...aggiornamenti]
}

/**
 * Template vuoto per l'inserimento massivo di cast nuovo.
 * Le partecipazioni già in archivio non vengono precompilate: restano poche e si inseriscono a mano.
 * Il cast esterno già salvato non viene riesportato qui (per quello c'è «Scarica cast»).
 * L'import continua ad aggiornare righe esistenti se il file le contiene.
 */
export async function buildOperaCastTemplate(_client: Client, _operaId: string, format: 'xlsx' | 'csv') {
  const roleNames = RUOLO_PRIMARIETA_OPTIONS.map((option) => option.label)
  if (format === 'csv') return { format, body: buildCastTemplateCsv([]), rows: 0 }
  const body = await buildCastTemplateXlsx([], roleNames)
  return { format, body, rows: 0 }
}

export type { CastImportPublicRow }
