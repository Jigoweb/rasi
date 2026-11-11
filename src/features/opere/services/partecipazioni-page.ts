import { POSTGREST_MAX_ROWS } from '@/shared/lib/postgrest-page'

/** Righe visibili nella scheda opera. Il conteggio resta sul server. */
export const PARTECIPAZIONI_PAGE_SIZE = 50

export type PartecipazioneScheda = {
  id: string
  personaggio: string | null
  note: string | null
  created_at: string | null
  artista_id: string
  opera_id: string
  episodio_id: string | null
  ruolo_id: string
  artisti: {
    id: string
    nome: string | null
    cognome: string | null
    nome_arte: string | null
    codice_ipn: string | null
  } | null
  ruoli_tipologie: {
    id: string
    nome: string | null
    descrizione: string | null
  } | null
  episodi: {
    id: string
    numero_stagione: number | null
    numero_episodio: number | null
    titolo_episodio: string | null
    titolo_episodio_originale: string | null
  } | null
}

export type PartecipazioniListParams = {
  operaId: string
  /** 1-based. */
  page?: number
  pageSize?: number
  search?: string
  ruoloId?: string
  /** '' = tutti, '__serie__' = senza episodio, altrimenti id episodio. */
  episodio?: string
}

export type PartecipazioniPage = {
  rows: PartecipazioneScheda[]
  /** Righe che rispettano ricerca e filtri. */
  total: number
  /** Partecipazioni dell'opera, senza filtri. */
  totalOpera: number
}

const SERIE_SCOPE = '__serie__'

export function toPartecipazioniRpcArgs(params: PartecipazioniListParams) {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(POSTGREST_MAX_ROWS, Math.max(1, params.pageSize ?? PARTECIPAZIONI_PAGE_SIZE))
  const episodio = params.episodio ?? ''
  const search = params.search?.trim() ?? ''

  return {
    p_opera_id: params.operaId,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
    p_search: search.length > 0 ? search : null,
    p_ruolo_id: params.ruoloId ? params.ruoloId : null,
    p_episodio_id: episodio && episodio !== SERIE_SCOPE ? episodio : null,
    p_senza_episodio: episodio === SERIE_SCOPE,
  }
}

export function parsePartecipazioniPage(payload: unknown): PartecipazioniPage {
  const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
  const rows = Array.isArray(body.rows) ? body.rows as PartecipazioneScheda[] : []
  const total = Number(body.total ?? 0)
  const totalOpera = Number(body.total_opera ?? total)
  return {
    rows,
    total: Number.isFinite(total) ? total : 0,
    totalOpera: Number.isFinite(totalOpera) ? totalOpera : 0,
  }
}
