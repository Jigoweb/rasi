import * as XLSX from 'xlsx'
import { supabase } from '@/shared/lib/supabase'
import { getWorkerUrl } from '@/features/campagne-individuazione/services/campagne-individuazione.service'
import { formatCategoria, vociRiepilogo, type TotalePiattaforma } from '../lib/ripartizione-display'
import type { Modalita } from '../lib/parametri'

export interface EmittenteOpzione {
  id: string
  nome: string
  tipo: string
  modalita_ripartizione: string | null
}

export interface IndividuazioneDisponibile {
  id: string
  nome: string
  anno: number | null
  campagnaProgrammazione: string | null
  individuazioni: number | null
  /** Nome della ripartizione che già la include, se c'è. */
  inclusaIn: { id: string; nome: string } | null
}

export interface SorgenteRipartizione {
  id: string
  nome: string
  anno: number | null
}

export interface TotaleArtistaRipartizione {
  artistaId: string
  nome: string
  nomeArte: string | null
  numeroIndividuazioni: number
  importo: number
  perCategoria: Record<string, { righe: number; importo: number }>
}

export interface JobRipartizione {
  id: string
  stato: 'queued' | 'running' | 'completed' | 'error'
  fase: string | null
  righe_lette: number
  righe_scritte: number
  error: string | null
}

const PAGINA = 1000

export async function listaEmittenti(): Promise<EmittenteOpzione[]> {
  const { data, error } = await supabase
    .from('emittenti')
    .select('id, nome, tipo, modalita_ripartizione')
    .order('nome')
  if (error) throw error
  return (data ?? []) as EmittenteOpzione[]
}

/** Campagne di individuazione completate di un'emittente e di un anno, con l'eventuale ripartizione che le usa. */
export async function listaIndividuazioniDisponibili(emittenteId: string, anno: number): Promise<IndividuazioneDisponibile[]> {
  const { data, error } = await supabase
    .from('campagne_individuazione')
    .select('id, nome, anno, statistiche, campagne_programmazione:campagne_programmazione_id(nome, anno)')
    .eq('emittente_id', emittenteId)
    .eq('stato', 'completata')
    .order('created_at', { ascending: false })
  if (error) throw error
  const righe = ((data ?? []) as any[]).filter(
    (c) => (c.anno ?? c.campagne_programmazione?.anno) === anno,
  )
  const ids = righe.map((c) => c.id as string)
  const inclusa = new Map<string, { id: string; nome: string }>()
  if (ids.length) {
    const { data: sorgenti, error: errS } = await supabase
      .from('campagne_ripartizione_sorgenti')
      .select('campagna_individuazione_id, campagne_ripartizione:campagna_ripartizione_id(id, nome)')
      .in('campagna_individuazione_id', ids)
    if (errS) throw errS
    for (const s of (sorgenti ?? []) as any[]) {
      if (s.campagne_ripartizione) inclusa.set(s.campagna_individuazione_id, s.campagne_ripartizione)
    }
  }
  return righe.map((c) => ({
    id: c.id,
    nome: c.nome,
    anno: c.anno ?? null,
    campagnaProgrammazione: c.campagne_programmazione?.nome ?? null,
    individuazioni: typeof c.statistiche?.individuazioni_create === 'number'
      ? c.statistiche.individuazioni_create
      : typeof c.statistiche?.total_individuazioni === 'number'
        ? c.statistiche.total_individuazioni
        : null,
    inclusaIn: inclusa.get(c.id) ?? null,
  }))
}

export async function listaSorgenti(campagnaId: string): Promise<SorgenteRipartizione[]> {
  const { data, error } = await supabase
    .from('campagne_ripartizione_sorgenti')
    .select('campagna_individuazione_id, campagne_individuazione:campagna_individuazione_id(id, nome, anno)')
    .eq('campagna_ripartizione_id', campagnaId)
  if (error) throw error
  return ((data ?? []) as any[])
    .map((s) => s.campagne_individuazione)
    .filter(Boolean)
    .map((c) => ({ id: c.id, nome: c.nome, anno: c.anno ?? null }))
}

export async function salvaCampagnaRipartizione(input: {
  id?: string | null
  nome: string
  emittenteId: string
  anno: number
  fondo: number
  modalita: Modalita | null
  sorgenti: string[]
  descrizione?: string | null
}): Promise<string> {
  const { data, error } = await supabase.rpc('salva_campagna_ripartizione', {
    p_id: input.id ?? null,
    p_nome: input.nome,
    p_emittente_id: input.emittenteId,
    p_anno: input.anno,
    p_fondo: input.fondo,
    p_modalita: input.modalita,
    p_sorgenti: input.sorgenti,
    p_descrizione: input.descrizione ?? null,
  })
  if (error) throw new Error(error.message)
  return data as string
}

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  return headers
}

export async function avviaCalcolo(campagnaId: string): Promise<string> {
  const worker = getWorkerUrl()
  if (!worker) throw new Error('Worker non configurato')
  const res = await fetch(`${worker}/api/ripartizione/${campagnaId}/calcola`, { method: 'POST', headers: await authHeaders() })
  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload?.success) throw new Error(payload?.error || `Errore del worker (${res.status})`)
  return payload.data.jobId as string
}

export async function statoCalcolo(jobId: string): Promise<JobRipartizione> {
  const worker = getWorkerUrl()
  if (!worker) throw new Error('Worker non configurato')
  const res = await fetch(`${worker}/api/ripartizione/jobs/${jobId}`, { headers: await authHeaders() })
  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload?.success) throw new Error(payload?.error || `Errore del worker (${res.status})`)
  return payload.data as JobRipartizione
}

/** Ultimo calcolo della campagna (per riprendere l'avanzamento dopo un ricaricamento). */
export async function ultimoCalcolo(campagnaId: string): Promise<JobRipartizione | null> {
  const { data, error } = await supabase
    .from('ripartizione_jobs')
    .select('id, stato, fase, righe_lette, righe_scritte, error')
    .eq('campagna_ripartizione_id', campagnaId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return ((data ?? [])[0] as JobRipartizione | undefined) ?? null
}

export async function cambiaStato(campagnaId: string, stato: 'calcolata' | 'approvata' | 'distribuita'): Promise<void> {
  const { error } = await supabase.from('campagne_ripartizione').update({ stato }).eq('id', campagnaId)
  if (error) throw new Error(error.message)
}

function nomeArtista(a: { nome?: string | null; cognome?: string | null; nome_arte?: string | null } | null): string {
  if (!a) return '—'
  return [a.nome, a.cognome].filter(Boolean).join(' ') || a.nome_arte || '—'
}

export async function totaliPerArtista(campagnaId: string): Promise<TotaleArtistaRipartizione[]> {
  const out: TotaleArtistaRipartizione[] = []
  for (let from = 0; ; from += PAGINA) {
    const { data, error } = await supabase
      .from('ripartizioni')
      .select('artista_id, numero_individuazioni, importo_netto, calcoli, artisti:artista_id(nome, cognome, nome_arte)')
      .eq('campagna_ripartizione_id', campagnaId)
      .order('importo_netto', { ascending: false })
      .range(from, from + PAGINA - 1)
    if (error) throw error
    for (const r of (data ?? []) as any[]) {
      out.push({
        artistaId: r.artista_id,
        nome: nomeArtista(r.artisti),
        nomeArte: r.artisti?.nome_arte ?? null,
        numeroIndividuazioni: r.numero_individuazioni,
        importo: Number(r.importo_netto),
        perCategoria: r.calcoli?.per_categoria ?? {},
      })
    }
    if (!data || data.length < PAGINA) break
  }
  return out
}

export function totaliPerConfronto(totali: TotaleArtistaRipartizione[]): TotalePiattaforma[] {
  return totali.map((t) => ({
    artistaId: t.artistaId,
    nome: t.nome,
    alias: t.nomeArte ? [t.nomeArte] : [],
    importo: t.importo,
  }))
}

/** Export Excel: righe calcolate, totali per artista e «Dati conteggi». */
export async function esportaExcel(campagna: { id: string; nome: string; statistiche_calcolo: unknown }): Promise<void> {
  const righe: Record<string, unknown>[] = []
  for (let from = 0; ; from += PAGINA) {
    const { data, error } = await supabase
      .from('ripartizioni_righe')
      .select(
        'id, categoria, esclusa, views_usate, views_assegnate, ricavi, quota_opera, prima, seconda, resto, bonus_direzione, integrazione_minimo, totale_prima_ricalcolo, importo, importo_finale, ' +
          'opere:opera_id(titolo), episodi:episodio_id(numero_stagione, numero_episodio, titolo_episodio), artisti:artista_id(nome, cognome, nome_arte)',
      )
      .eq('campagna_ripartizione_id', campagna.id)
      .order('id')
      .range(from, from + PAGINA - 1)
    if (error) throw error
    for (const r of (data ?? []) as any[]) {
      righe.push({
        Titolo: r.opere?.titolo ?? '',
        Stagione: r.episodi?.numero_stagione ?? '',
        Episodio: r.episodi?.numero_episodio ?? '',
        'Titolo episodio': r.episodi?.titolo_episodio ?? '',
        Artista: nomeArtista(r.artisti),
        Categoria: formatCategoria(r.categoria),
        Esclusa: r.esclusa === 'tetto_ruoli' ? 'Tetto 3 ruoli' : r.esclusa === 'senza_categoria' ? 'Ruolo non ripartibile' : '',
        Visualizzazioni: r.views_usate ?? '',
        'Visualizzazioni assegnate (10% media)': r.views_assegnate ? 'sì' : '',
        Ricavi: r.ricavi ?? '',
        'Quota opera': Number(r.quota_opera),
        '1ª ripartizione': Number(r.prima),
        '2ª ripartizione': Number(r.seconda),
        Resto: Number(r.resto),
        '+10% direzione': Number(r.bonus_direzione),
        'Integrazione minimo': Number(r.integrazione_minimo),
        'Totale prima del ricalcolo': Number(r.totale_prima_ricalcolo),
        'Da liquidare': Number(r.importo_finale),
      })
    }
    if (!data || data.length < PAGINA) break
  }
  const totali = await totaliPerArtista(campagna.id)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(righe), 'Righe')
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      totali.map((t) => ({ Artista: t.nome, 'Nome d’arte': t.nomeArte ?? '', Utilizzazioni: t.numeroIndividuazioni, 'Da liquidare': t.importo })),
    ),
    'Per artista',
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(vociRiepilogo(campagna.statistiche_calcolo).map((v) => ({ Voce: v.voce, Valore: v.valore }))),
    'Dati conteggi',
  )
  const nomeFile = `Ripartizione ${campagna.nome}`.replace(/[\\/:*?"<>|]+/g, ' ').trim()
  XLSX.writeFile(wb, `${nomeFile}.xlsx`)
}
