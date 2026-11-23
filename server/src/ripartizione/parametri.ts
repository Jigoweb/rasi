/**
 * Parametri del regolamento di ripartizione video.
 *
 * Fonte: «Scheda tecnica applicativa regolamento ripartizione video»
 * (assemblea del 29/04/2024, versione inviata da RASI il 22/10/2026).
 *
 * I punti che la scheda non chiarisce, e che gli Excel 2024 trattano in modi
 * diversi, sono impostazioni esplicite: vedi
 * docs/codebase-audit/2026-11-23-ripartizione-2024-domande-paolo.md.
 */

export type CategoriaRipartizione =
  | 'primario'
  | 'comprimario'
  | 'doppiatore_primario'
  | 'direzione_doppiaggio'
  | 'doppiatore_comprimario'

export const CATEGORIE_RIPARTIZIONE: readonly CategoriaRipartizione[] = [
  'primario',
  'comprimario',
  'doppiatore_primario',
  'direzione_doppiaggio',
  'doppiatore_comprimario',
]

export type Modalita = 'lineare' | 'od_views' | 'od_ricavi' | 'od_utilizzazioni'

export const MODALITA: readonly Modalita[] = ['lineare', 'od_views', 'od_ricavi', 'od_utilizzazioni']

export type PuntoBonusDirezione = 'prima_ripartizione' | 'totale' | 'nessuno'

export type RegolaMinimo =
  /** Gli importi sotto la soglia salgono al più piccolo importo già ≥ soglia. */
  | 'primo_importo_superiore'
  /** Gli importi sotto la soglia salgono alla soglia. */
  | 'soglia'
  | 'nessuno'

export interface ParametriRipartizione {
  versione: string
  /** «Totale punteggi» della 1ª ripartizione. */
  divisore: number
  /** Punteggi della 1ª ripartizione per categoria. */
  pesiPrima: Record<CategoriaRipartizione, number>
  /** Moltiplicatori della 2ª ripartizione per categoria. */
  moltiplicatoriSeconda: Record<CategoriaRipartizione, number>
  lineare: {
    quote: { tutte: number; generaliste: number; oltre60: number; primaSerata: number }
    /** Durata oltre la quale scatta la quota del 9% (minuti, estremo escluso). */
    durataMinimaMinuti: number
    /** Fascia della quota dell'8%, inizio trasmissione compreso negli estremi (HH:MM). */
    fasciaPrimaSerata: { da: string; a: string }
    /**
     * Network senza canali generalisti: la quota del 10% non si effettua.
     * 'somma_a_tutte' (come Viacom e Tv2000: 73% + 10% = 83%) oppure 'resto'.
     */
    senzaGeneraliste: 'somma_a_tutte' | 'resto'
    /** Quote del 9% o dell'8% senza righe ammesse: rientrano nel resto della 2ª ripartizione. */
    quotaSenzaRighe: 'resto'
  }
  bonusDirezione: {
    percentuale: number
    lineare: PuntoBonusDirezione
    onDemand: PuntoBonusDirezione
  }
  minimoOnDemand: {
    importo: number
    regola: RegolaMinimo
    /** Se vero, la riduzione proporzionale non porta nessuna riga sotto il minimo. */
    mantieniDopoRiduzione: boolean
  }
  /** Ruoli massimi computabili per artista nella stessa opera (null = nessun limite). */
  tettoRuoliPerOpera: number | null
  /** Righe senza visualizzazioni in un catalogo che le ha: quota della media. */
  viewsMancantiQuotaMedia: number
}

export const PARAMETRI_REGOLAMENTO_2024: ParametriRipartizione = {
  versione: 'regolamento-2024-04-29-rev-2026-10-22',
  divisore: 11,
  pesiPrima: {
    primario: 5.51,
    comprimario: 2.49,
    doppiatore_primario: 1.8,
    direzione_doppiaggio: 1.8,
    doppiatore_comprimario: 1.2,
  },
  moltiplicatoriSeconda: {
    primario: 3.5,
    comprimario: 1.1,
    doppiatore_primario: 0.4,
    direzione_doppiaggio: 0.4,
    doppiatore_comprimario: 0.2,
  },
  lineare: {
    quote: { tutte: 0.73, generaliste: 0.1, oltre60: 0.09, primaSerata: 0.08 },
    durataMinimaMinuti: 60,
    fasciaPrimaSerata: { da: '19:00', a: '23:30' },
    senzaGeneraliste: 'somma_a_tutte',
    quotaSenzaRighe: 'resto',
  },
  // Scheda: nei lineari l'incremento segue il calcolo dei totali; nell'on demand
  // è scritto dentro la 1ª ripartizione. Da confermare con RASI (domanda 1).
  bonusDirezione: { percentuale: 0.1, lineare: 'totale', onDemand: 'prima_ripartizione' },
  // «Tutti i compensi in centesimi sono arrotondati al primo importo più alto di 1,50 euro.»
  // Da confermare con RASI (domanda 2).
  minimoOnDemand: { importo: 1.5, regola: 'primo_importo_superiore', mantieniDopoRiduzione: false },
  tettoRuoliPerOpera: 3,
  viewsMancantiQuotaMedia: 0.1,
}
