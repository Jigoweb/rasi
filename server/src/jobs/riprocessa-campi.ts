import { supabaseService } from '../supabase.js'
import {
  buildProgrammazioniPayloads,
  computeImportRowUid,
  parseProgrammazioniFile,
  type ProgrammazioneImportPayload,
  type UnparsedValuesCollector,
  type UploadMappingSnapshot,
} from './programmazioni-import-core.js'

/**
 * «Correggi dati dal file»: ricarica lo stesso file di una campagna già caricata
 * e aggiorna solo data, orari e titoli delle programmazioni esistenti.
 *
 * Ogni riga ritrova la sua programmazione tramite import_row_uid, l'hash della
 * riga originale del file (programmazioni-import-core.ts). Per i caricamenti
 * fatti prima delle correzioni del 16/11/2026 l'hash è stato calcolato sulla
 * lettura precedente: si provano entrambe le letture e si usa quella che
 * ritrova più righe. I valori vengono sempre dalla lettura nuova.
 */

const BUCKET = 'programmazioni-uploads'
const CHUNK = 1000
const ISO_DATE_RX = /^\d{4}-\d{2}-\d{2}$/
const TIME_RX = /^\d{2}:\d{2}:\d{2}$/
const TEXT_FIELDS = ['titolo', 'titolo_originale', 'titolo_episodio', 'titolo_episodio_originale', 'regia', 'canale'] as const

export interface RiprocessoRiga {
  import_row_uid: string
  data_trasmissione?: string
  ora_inizio?: string
  ora_fine?: string
  titolo?: string
  titolo_originale?: string
  titolo_episodio?: string
  titolo_episodio_originale?: string
  regia?: string
  canale?: string
}

export interface RiprocessoEsito {
  applicato: boolean
  righe_file: number
  righe_inviate: number
  ritrovate: number
  aggiornate: number
  individuazioni_riallineate: number
  lettura: 'attuale' | 'precedente'
  cambi: { data_trasmissione: number; ora_inizio: number; ora_fine: number; titoli: number }
  esempi: unknown[]
  valori_non_riconosciuti: UnparsedValuesCollector
}

/**
 * Righe da inviare alla RPC: uid della lettura scelta, valori della lettura
 * nuova. Solo date ISO e orari HH:MM:SS validi (un valore non riconosciuto non
 * svuota quello attuale); i testi vuoti non vengono inviati.
 */
export function buildRiprocessoRighe(
  rowsNuove: Record<string, unknown>[],
  rowsPerUid: Record<string, unknown>[],
  snapshot: UploadMappingSnapshot,
  campagnaProgrammazioneId: string,
  emittenteId: string,
  unparsed?: UnparsedValuesCollector
): RiprocessoRiga[] {
  const out: RiprocessoRiga[] = []
  const context = { campagnaProgrammazioneId, emittenteId }
  rowsNuove.forEach((row, index) => {
    const rowIndex = index + 1
    const [payload] = buildProgrammazioniPayloads([row], snapshot, context, rowIndex, unparsed) as Array<
      ProgrammazioneImportPayload | undefined
    >
    if (!payload) return
    const uidRow = rowsPerUid[index] ?? row
    const riga: RiprocessoRiga = {
      import_row_uid: computeImportRowUid(campagnaProgrammazioneId, rowIndex, uidRow),
    }
    if (typeof payload.data_trasmissione === 'string' && ISO_DATE_RX.test(payload.data_trasmissione)) {
      riga.data_trasmissione = payload.data_trasmissione
    }
    if (typeof payload.ora_inizio === 'string' && TIME_RX.test(payload.ora_inizio)) riga.ora_inizio = payload.ora_inizio
    if (typeof payload.ora_fine === 'string' && TIME_RX.test(payload.ora_fine)) riga.ora_fine = payload.ora_fine
    for (const field of TEXT_FIELDS) {
      const value = payload[field]
      if (typeof value === 'string' && value.trim() !== '') riga[field] = value
    }
    out.push(riga)
  })
  return out
}

type RpcRisultato = {
  righe_inviate: number
  ritrovate: number
  aggiornate: number
  cambi: RiprocessoEsito['cambi']
  esempi: unknown[]
}

async function chiamaRpc(campagnaId: string, righe: RiprocessoRiga[], applica: boolean): Promise<RpcRisultato> {
  const { data, error } = await supabaseService.rpc('riprocessa_campi_programmazioni', {
    p_campagna_programmazione_id: campagnaId,
    p_righe: righe,
    p_applica: applica,
  })
  if (error) throw new Error(`riprocessa_campi_programmazioni: ${error.message}`)
  return data as RpcRisultato
}

export async function loadRiprocessoContext(campagnaId: string): Promise<{
  emittenteId: string
  snapshot: UploadMappingSnapshot
}> {
  const { data: campagna, error: campagnaError } = await supabaseService
    .from('campagne_programmazione')
    .select('emittente_id')
    .eq('id', campagnaId)
    .maybeSingle()
  if (campagnaError) throw new Error(campagnaError.message)
  if (!campagna?.emittente_id) throw new Error('Campagna non trovata')

  // Il mapping usato al caricamento: con lo stesso mapping i valori sono quelli
  // che l'upload avrebbe dovuto produrre.
  const { data: job, error: jobError } = await supabaseService
    .from('upload_jobs')
    .select('mapping_snapshot')
    .eq('campagna_programmazione_id', campagnaId)
    .eq('stato', 'completed')
    .neq('fase', 'riprocesso')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (jobError) throw new Error(jobError.message)
  if (!job?.mapping_snapshot) throw new Error('Nessun caricamento completato per questa campagna')

  return { emittenteId: campagna.emittente_id as string, snapshot: job.mapping_snapshot as UploadMappingSnapshot }
}

export async function runRiprocessoCampi(params: {
  campagnaProgrammazioneId: string
  storagePath: string
  fileName: string
  applica: boolean
  userId: string
}): Promise<RiprocessoEsito> {
  const { campagnaProgrammazioneId: campagnaId, storagePath, fileName, applica } = params
  const { emittenteId, snapshot } = await loadRiprocessoContext(campagnaId)

  const { data: fileData, error: downloadError } = await supabaseService.storage.from(BUCKET).download(storagePath)
  if (downloadError) throw new Error(`download file: ${downloadError.message}`)
  const buffer = Buffer.from(await fileData.arrayBuffer())

  const rowsNuove = parseProgrammazioniFile(buffer, fileName)
  const rowsPrecedenti = parseProgrammazioniFile(buffer, fileName, { legacyDates: true })

  // Quale lettura ritrova le righe? Prova sul primo blocco.
  const campione = (rows: Record<string, unknown>[]) =>
    buildRiprocessoRighe(rowsNuove.slice(0, CHUNK), rows.slice(0, CHUNK), snapshot, campagnaId, emittenteId)
  const [provaAttuale, provaPrecedente] = await Promise.all([
    chiamaRpc(campagnaId, campione(rowsNuove), false),
    chiamaRpc(campagnaId, campione(rowsPrecedenti), false),
  ])
  const lettura: RiprocessoEsito['lettura'] =
    provaPrecedente.ritrovate > provaAttuale.ritrovate ? 'precedente' : 'attuale'

  const unparsed: UnparsedValuesCollector = {}
  const righe = buildRiprocessoRighe(
    rowsNuove,
    lettura === 'precedente' ? rowsPrecedenti : rowsNuove,
    snapshot,
    campagnaId,
    emittenteId,
    unparsed
  )

  const esito: RiprocessoEsito = {
    applicato: applica,
    righe_file: rowsNuove.length,
    righe_inviate: 0,
    ritrovate: 0,
    aggiornate: 0,
    individuazioni_riallineate: 0,
    lettura,
    cambi: { data_trasmissione: 0, ora_inizio: 0, ora_fine: 0, titoli: 0 },
    esempi: [],
    valori_non_riconosciuti: unparsed,
  }

  for (let offset = 0; offset < righe.length; offset += CHUNK) {
    const risultato = await chiamaRpc(campagnaId, righe.slice(offset, offset + CHUNK), applica)
    esito.righe_inviate += risultato.righe_inviate
    esito.ritrovate += risultato.ritrovate
    esito.aggiornate += risultato.aggiornate ?? 0
    for (const key of Object.keys(esito.cambi) as Array<keyof RiprocessoEsito['cambi']>) {
      esito.cambi[key] += risultato.cambi?.[key] ?? 0
    }
    if (esito.esempi.length < 5) esito.esempi.push(...(risultato.esempi ?? []).slice(0, 5 - esito.esempi.length))
  }

  if (applica) {
    const { data: riallineate, error } = await supabaseService.rpc('riallinea_individuazioni_da_programmazioni', {
      p_campagna_programmazione_id: campagnaId,
    })
    if (error) throw new Error(`riallinea_individuazioni_da_programmazioni: ${error.message}`)
    esito.individuazioni_riallineate = Number(riallineate) || 0

    // Traccia dell'operazione tra i job di upload della campagna.
    const { error: logError } = await supabaseService.from('upload_jobs').insert({
      campagna_programmazione_id: campagnaId,
      storage_path: storagePath,
      file_name: fileName,
      file_type: fileName.toLowerCase().endsWith('.csv') ? 'text/csv' : 'application/vnd.ms-excel',
      mapping_snapshot: snapshot,
      chunk_size: CHUNK,
      created_by: params.userId,
      stato: 'completed',
      fase: 'riprocesso',
      righe_totali: esito.righe_file,
      righe_processate: esito.righe_inviate,
      righe_inserite: esito.aggiornate,
      quality_report: { riprocesso: esito },
    })
    if (logError) console.warn(`[riprocessa-campi] registrazione job fallita: ${logError.message}`)
  }

  return esito
}
