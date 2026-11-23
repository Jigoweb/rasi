/**
 * Calcolo di una campagna di ripartizione nel worker.
 *
 * Legge le individuazioni delle campagne incluse (a blocchi), applica il
 * motore (src/ripartizione/engine.ts), riscrive righe e totali per artista e
 * porta la campagna a «calcolata». Il calcolo è ripetibile: ogni esecuzione
 * cancella e riscrive i risultati precedenti, finché la campagna non è approvata.
 */
import { supabaseService } from '../supabase.js'
import { calcolaRipartizione, RipartizioneError, type RigaCalcolata } from '../ripartizione/engine.js'
import {
  COLONNE_INDIVIDUAZIONE,
  canaliGeneralistiDa,
  categoriaRuolo,
  isModalita,
  modalitaProposta,
  parametriDaConfigurazione,
  ricaviDa,
  totaliPerArtista,
  utilizzazioniDaIndividuazioni,
  type IndividuazioneSorgente,
} from '../ripartizione/preparazione.js'
import type { CategoriaRipartizione } from '../ripartizione/parametri.js'

const PAGINA = 1000
const BLOCCO_SCRITTURA = 1000

type Patch = Record<string, unknown>

async function patchJob(jobId: string, patch: Patch) {
  const { error } = await supabaseService
    .from('ripartizione_jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', jobId)
  if (error) console.error('[ripartizione] aggiornamento job non riuscito', error)
}

function errore(messaggio: string, cause?: unknown): Error {
  const e = new Error(messaggio)
  if (cause) (e as Error & { cause?: unknown }).cause = cause
  return e
}

export class RipartizioneJobError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

/** Crea il job; 409 se un calcolo è già in corso sulla stessa campagna. */
export async function creaJobRipartizione(campagnaId: string, userId: string): Promise<string> {
  const { data: campagna, error: errCampagna } = await supabaseService
    .from('campagne_ripartizione')
    .select('id, stato')
    .eq('id', campagnaId)
    .maybeSingle()
  if (errCampagna) throw errore('Lettura campagna non riuscita', errCampagna)
  if (!campagna) throw new RipartizioneJobError('Campagna di ripartizione non trovata', 404)
  if (campagna.stato === 'approvata' || campagna.stato === 'distribuita') {
    throw new RipartizioneJobError('La campagna è già approvata: per ricalcolare va prima revocata l’approvazione', 409)
  }
  const { data, error } = await supabaseService
    .from('ripartizione_jobs')
    .insert({ campagna_ripartizione_id: campagnaId, stato: 'queued', fase: 'in coda', created_by: userId })
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') throw new RipartizioneJobError('Calcolo già in corso su questa campagna', 409)
    throw errore('Creazione del job non riuscita', error)
  }
  return data.id as string
}

async function leggiIndividuazioni(
  sorgenti: string[],
  onPagina: (lette: number) => Promise<void>,
): Promise<IndividuazioneSorgente[]> {
  const tutte: IndividuazioneSorgente[] = []
  for (const sorgente of sorgenti) {
    let ultimo: string | null = null
    for (;;) {
      let q = supabaseService
        .from('individuazioni')
        .select(COLONNE_INDIVIDUAZIONE)
        .eq('campagna_individuazioni_id', sorgente)
        .order('id', { ascending: true })
        .limit(PAGINA)
      if (ultimo) q = q.gt('id', ultimo)
      const { data, error } = await q
      if (error) throw errore('Lettura delle individuazioni non riuscita', error)
      const pagina = (data ?? []) as IndividuazioneSorgente[]
      tutte.push(...pagina)
      await onPagina(tutte.length)
      if (pagina.length < PAGINA) break
      ultimo = pagina[pagina.length - 1].id
    }
  }
  return tutte
}

async function cancellaRisultati(campagnaId: string) {
  for (;;) {
    const { data, error } = await supabaseService
      .from('ripartizioni_righe')
      .select('id')
      .eq('campagna_ripartizione_id', campagnaId)
      .limit(5000)
    if (error) throw errore('Lettura delle righe precedenti non riuscita', error)
    const ids = (data ?? []).map((r: { id: number }) => r.id)
    if (ids.length === 0) break
    for (let i = 0; i < ids.length; i += 1000) {
      const { error: errDel } = await supabaseService.from('ripartizioni_righe').delete().in('id', ids.slice(i, i + 1000))
      if (errDel) throw errore('Cancellazione delle righe precedenti non riuscita', errDel)
    }
  }
  const { error } = await supabaseService.from('ripartizioni').delete().eq('campagna_ripartizione_id', campagnaId)
  if (error) throw errore('Cancellazione dei totali precedenti non riuscita', error)
}

function rigaDaScrivere(campagnaId: string, r: RigaCalcolata, ind: IndividuazioneSorgente | undefined) {
  return {
    campagna_ripartizione_id: campagnaId,
    individuazione_id: r.id,
    artista_id: r.artistaId,
    opera_id: ind?.opera_id ?? null,
    episodio_id: ind?.episodio_id ?? null,
    ruolo_id: ind?.ruolo_id ?? null,
    categoria: r.categoria,
    esclusa: r.esclusa,
    views_usate: r.viewsUsate,
    views_assegnate: r.viewsAssegnate,
    ricavi: ind ? ricaviDa(ind) : null,
    quota_opera: r.quotaOpera,
    prima: r.prima,
    seconda: r.seconda,
    resto: r.resto,
    bonus_direzione: r.bonusDirezione,
    integrazione_minimo: r.integrazioneMinimo,
    totale_prima_ricalcolo: r.totalePrimaDelRicalcolo,
    importo: r.importo,
    importo_finale: r.importoFinale,
  }
}

export async function eseguiCalcoloRipartizione(jobId: string, campagnaId: string): Promise<void> {
  try {
    await patchJob(jobId, { stato: 'running', fase: 'lettura dati' })

    const { data: campagna, error: errCampagna } = await supabaseService
      .from('campagne_ripartizione')
      .select('id, stato, importo_totale_disponibile, modalita, emittente_id, parametri_id')
      .eq('id', campagnaId)
      .single()
    if (errCampagna || !campagna) throw errore('Campagna di ripartizione non trovata', errCampagna)
    if (campagna.stato === 'approvata' || campagna.stato === 'distribuita') {
      throw errore('La campagna è già approvata')
    }

    const { data: sorgentiRows, error: errSorgenti } = await supabaseService
      .from('campagne_ripartizione_sorgenti')
      .select('campagna_individuazione_id, campagne_individuazione(stato, emittente_id)')
      .eq('campagna_ripartizione_id', campagnaId)
    if (errSorgenti) throw errore('Lettura delle campagne incluse non riuscita', errSorgenti)
    const sorgenti = (sorgentiRows ?? []) as unknown as {
      campagna_individuazione_id: string
      campagne_individuazione: { stato: string; emittente_id: string } | null
    }[]
    if (sorgenti.length === 0) throw errore('Nessuna campagna di individuazione inclusa')
    const nonCompletate = sorgenti.filter((s) => s.campagne_individuazione?.stato !== 'completata')
    if (nonCompletate.length > 0) throw errore(`${nonCompletate.length} campagne di individuazione non completate`)

    const emittenteId = campagna.emittente_id ?? sorgenti[0].campagne_individuazione?.emittente_id ?? null
    const { data: emittente } = emittenteId
      ? await supabaseService
          .from('emittenti')
          .select('tipo, modalita_ripartizione, configurazione')
          .eq('id', emittenteId)
          .maybeSingle()
      : { data: null }

    let parametriId = campagna.parametri_id as string | null
    let configurazione: unknown = null
    {
      let q = supabaseService.from('parametri_ripartizione').select('id, configurazione')
      q = parametriId
        ? q.eq('id', parametriId)
        : q.eq('categoria', 'regolamento_video').order('valido_dal', { ascending: false }).limit(1)
      const { data, error } = await q
      if (error) throw errore('Lettura dei parametri non riuscita', error)
      if (data && data[0]) {
        parametriId = data[0].id
        configurazione = data[0].configurazione
      }
    }
    const parametri = parametriDaConfigurazione(configurazione)

    const { data: ruoli, error: errRuoli } = await supabaseService
      .from('ruoli_tipologie')
      .select('id, categoria_ripartizione')
    if (errRuoli) throw errore('Lettura dei ruoli non riuscita', errRuoli)
    const categorieRuoli = new Map<string, CategoriaRipartizione | null>(
      (ruoli ?? []).map((r: { id: string; categoria_ripartizione: unknown }) => [r.id, categoriaRuolo(r.categoria_ripartizione)]),
    )

    const individuazioni = await leggiIndividuazioni(
      sorgenti.map((s) => s.campagna_individuazione_id),
      (lette) => patchJob(jobId, { righe_lette: lette }),
    )
    const contesto = {
      modalita: (emittente?.modalita_ripartizione ?? null) as 'lineare' | 'on_demand' | null,
      tipo: (emittente?.tipo as string | undefined) ?? null,
      canaliGeneralisti: canaliGeneralistiDa(emittente?.configurazione),
    }
    const utilizzazioni = utilizzazioniDaIndividuazioni(individuazioni, categorieRuoli, contesto)
    const modalita = isModalita(campagna.modalita) ? campagna.modalita : modalitaProposta(utilizzazioni, contesto)

    await patchJob(jobId, { fase: 'calcolo' })
    const { righe, riepilogo } = calcolaRipartizione({
      fondo: Number(campagna.importo_totale_disponibile),
      modalita,
      righe: utilizzazioni,
      parametri,
    })

    await patchJob(jobId, { fase: 'scrittura risultati' })
    await cancellaRisultati(campagnaId)
    const perId = new Map(individuazioni.map((i) => [i.id, i]))
    let scritte = 0
    for (let i = 0; i < righe.length; i += BLOCCO_SCRITTURA) {
      const blocco = righe.slice(i, i + BLOCCO_SCRITTURA).map((r) => rigaDaScrivere(campagnaId, r, perId.get(r.id)))
      const { error } = await supabaseService.from('ripartizioni_righe').insert(blocco)
      if (error) throw errore('Scrittura delle righe non riuscita', error)
      scritte += blocco.length
      await patchJob(jobId, { righe_scritte: scritte })
    }

    const totali = totaliPerArtista(righe)
    for (let i = 0; i < totali.length; i += BLOCCO_SCRITTURA) {
      const blocco = totali.slice(i, i + BLOCCO_SCRITTURA).map((t) => ({
        campagna_ripartizione_id: campagnaId,
        artista_id: t.artista_id,
        numero_individuazioni: t.numero_individuazioni,
        calcoli: { versione: riepilogo.versioneParametri, modalita, per_categoria: t.perCategoria },
        importo_lordo: t.importo,
        trattenuta_collecting: 0,
        altre_trattenute: 0,
        importo_netto: t.importo,
      }))
      const { error } = await supabaseService.from('ripartizioni').insert(blocco)
      if (error) throw errore('Scrittura dei totali per artista non riuscita', error)
    }

    const { error: errUpdate } = await supabaseService
      .from('campagne_ripartizione')
      .update({
        stato: 'calcolata',
        data_calcolo: new Date().toISOString(),
        modalita,
        parametri_id: parametriId,
        emittente_id: emittenteId,
        statistiche_calcolo: { ...riepilogo, artisti: totali.length, individuazioni_lette: individuazioni.length },
      })
      .eq('id', campagnaId)
    if (errUpdate) throw errore('Aggiornamento della campagna non riuscito', errUpdate)

    await patchJob(jobId, { stato: 'completed', fase: 'completato' })
  } catch (e) {
    const messaggio = e instanceof RipartizioneError || e instanceof Error ? e.message : 'Calcolo non riuscito'
    console.error('[ripartizione] calcolo non riuscito', e)
    await patchJob(jobId, { stato: 'error', fase: 'errore', error: messaggio })
  }
}

/** Al riavvio del worker: i calcoli rimasti a metà si chiudono in errore e si possono rilanciare. */
export async function chiudiCalcoliInterrotti(): Promise<number> {
  const { data, error } = await supabaseService
    .from('ripartizione_jobs')
    .update({ stato: 'error', fase: 'errore', error: 'Calcolo interrotto dal riavvio del worker: rilanciarlo', updated_at: new Date().toISOString() })
    .in('stato', ['queued', 'running'])
    .select('id')
  if (error) {
    console.error('[ripartizione] chiusura calcoli interrotti non riuscita', error)
    return 0
  }
  return data?.length ?? 0
}
