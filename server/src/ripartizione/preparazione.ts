/**
 * Preparazione dei dati per il motore: dalle individuazioni salvate alle
 * utilizzazioni, scelta della modalità, parametri e totali per artista.
 * Funzioni pure, testate in preparazione.test.ts.
 */
import type { RigaCalcolata, Utilizzazione } from './engine.js'
import {
  CATEGORIE_RIPARTIZIONE,
  MODALITA,
  PARAMETRI_REGOLAMENTO_2024,
  type CategoriaRipartizione,
  type Modalita,
  type ParametriRipartizione,
} from './parametri.js'

/** Colonne di `individuazioni` lette dal worker. */
export interface IndividuazioneSorgente {
  id: string
  artista_id: string
  opera_id: string | null
  episodio_id: string | null
  ruolo_id: string | null
  programmazione_id: string | null
  canale: string | null
  durata_minuti: number | null
  ora_inizio: string | null
  views: number | null
  total_revenue: number | null
  retail_price: number | null
  track_price_local_currency: number | null
  stato: string | null
}

export const COLONNE_INDIVIDUAZIONE =
  'id, artista_id, opera_id, episodio_id, ruolo_id, programmazione_id, canale, durata_minuti, ora_inizio, views, total_revenue, retail_price, track_price_local_currency, stato'

export interface ContestoEmittente {
  /** 'lineare' | 'on_demand' (emittenti.modalita_ripartizione). */
  modalita: 'lineare' | 'on_demand' | null
  /** emittenti.tipo (tv_generalista, tv_tematica, streaming, pay_tv). */
  tipo: string | null
  /** emittenti.configurazione.canali_generalisti */
  canaliGeneralisti: string[] | null
}

const numero = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

const normalizzaCanale = (v: string | null | undefined) => (v ?? '').trim().toUpperCase()

export function canaliGeneralistiDa(configurazione: unknown): string[] | null {
  const lista = (configurazione as { canali_generalisti?: unknown } | null)?.canali_generalisti
  if (!Array.isArray(lista)) return null
  return lista.filter((c): c is string => typeof c === 'string' && c.trim() !== '').map(normalizzaCanale)
}

/**
 * Ricavi della riga: incasso totale se c'è, altrimenti prezzo × vendite
 * (Apple TVOD: sales_count è importato nelle visualizzazioni).
 */
export function ricaviDa(ind: IndividuazioneSorgente): number | null {
  const totale = numero(ind.total_revenue)
  if (totale !== null) return totale
  const prezzo = numero(ind.track_price_local_currency) ?? numero(ind.retail_price)
  const vendite = numero(ind.views)
  return prezzo !== null && vendite !== null ? prezzo * vendite : null
}

export function generalistaDa(ind: IndividuazioneSorgente, emittente: ContestoEmittente): boolean {
  if (emittente.canaliGeneralisti && emittente.canaliGeneralisti.length > 0) {
    return emittente.canaliGeneralisti.includes(normalizzaCanale(ind.canale))
  }
  // Senza elenco dei canali: un'emittente generalista lo è su tutti i canali.
  return emittente.tipo === 'tv_generalista'
}

export function utilizzazioniDaIndividuazioni(
  individuazioni: IndividuazioneSorgente[],
  categorieRuoli: Map<string, CategoriaRipartizione | null>,
  emittente: ContestoEmittente,
): Utilizzazione[] {
  return individuazioni
    .filter((i) => i.stato !== 'respinto')
    .map((i) => ({
      id: i.id,
      artistaId: i.artista_id,
      // Il tetto di ruoli è per opera; senza opera la riga conta da sola.
      operaId: i.opera_id ?? `individuazione:${i.id}`,
      categoria: (i.ruolo_id && categorieRuoli.get(i.ruolo_id)) || null,
      generalista: generalistaDa(i, emittente),
      durataMinuti: numero(i.durata_minuti),
      oraInizio: i.ora_inizio,
      views: numero(i.views),
      ricavi: ricaviDa(i),
    }))
}

export function categoriaRuolo(value: unknown): CategoriaRipartizione | null {
  return (CATEGORIE_RIPARTIZIONE as readonly unknown[]).includes(value) ? (value as CategoriaRipartizione) : null
}

/**
 * Modalità proposta dai dati, se la campagna non ne ha una scelta:
 * lineare per le emittenti lineari; on demand per visualizzazioni se almeno
 * metà delle righe le ha, altrimenti per numero di utilizzazioni.
 */
export function modalitaProposta(righe: Utilizzazione[], emittente: ContestoEmittente): Modalita {
  const lineare = emittente.modalita ? emittente.modalita === 'lineare' : emittente.tipo !== 'streaming'
  if (lineare) return 'lineare'
  const conViews = righe.filter((r) => typeof r.views === 'number' && r.views > 0).length
  return righe.length > 0 && conViews * 2 >= righe.length ? 'od_views' : 'od_utilizzazioni'
}

export function isModalita(value: unknown): value is Modalita {
  return (MODALITA as readonly unknown[]).includes(value)
}

/** Parametri salvati in parametri_ripartizione.configurazione, sopra i valori del regolamento. */
export function parametriDaConfigurazione(configurazione: unknown): ParametriRipartizione {
  const base = PARAMETRI_REGOLAMENTO_2024
  if (!configurazione || typeof configurazione !== 'object') return base
  const c = configurazione as Partial<ParametriRipartizione>
  return {
    ...base,
    ...c,
    pesiPrima: { ...base.pesiPrima, ...(c.pesiPrima ?? {}) },
    moltiplicatoriSeconda: { ...base.moltiplicatoriSeconda, ...(c.moltiplicatoriSeconda ?? {}) },
    lineare: {
      ...base.lineare,
      ...(c.lineare ?? {}),
      quote: { ...base.lineare.quote, ...(c.lineare?.quote ?? {}) },
      fasciaPrimaSerata: { ...base.lineare.fasciaPrimaSerata, ...(c.lineare?.fasciaPrimaSerata ?? {}) },
    },
    bonusDirezione: { ...base.bonusDirezione, ...(c.bonusDirezione ?? {}) },
    minimoOnDemand: { ...base.minimoOnDemand, ...(c.minimoOnDemand ?? {}) },
  }
}

export interface TotaleArtista {
  artista_id: string
  numero_individuazioni: number
  importo: number
  perCategoria: Partial<Record<CategoriaRipartizione, { righe: number; importo: number }>>
}

export function totaliPerArtista(righe: RigaCalcolata[]): TotaleArtista[] {
  const map = new Map<string, TotaleArtista>()
  for (const r of righe) {
    if (r.esclusa || !r.categoria) continue
    const t = map.get(r.artistaId) ?? { artista_id: r.artistaId, numero_individuazioni: 0, importo: 0, perCategoria: {} }
    t.numero_individuazioni += 1
    t.importo += r.importoFinale
    const c = (t.perCategoria[r.categoria] ??= { righe: 0, importo: 0 })
    c.righe += 1
    c.importo += r.importoFinale
    map.set(r.artistaId, t)
  }
  const arrotonda = (n: number) => Math.round(n * 100) / 100
  return [...map.values()].map((t) => ({
    ...t,
    importo: arrotonda(t.importo),
    perCategoria: Object.fromEntries(
      Object.entries(t.perCategoria).map(([k, v]) => [k, { righe: v!.righe, importo: arrotonda(v!.importo) }]),
    ),
  }))
}
