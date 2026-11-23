/**
 * Motore di ripartizione: funzioni pure, nessun I/O.
 *
 * Una riga in ingresso è un'utilizzazione (opera o episodio × artista × ruolo;
 * per i lineari ogni messa in onda). Il calcolo è esatto: nessun valore
 * intermedio viene troncato e gli importi finali, al centesimo, sommano
 * esattamente al fondo (metodo dei resti maggiori).
 */
import {
  CATEGORIE_RIPARTIZIONE,
  PARAMETRI_REGOLAMENTO_2024,
  type CategoriaRipartizione,
  type Modalita,
  type ParametriRipartizione,
  type PuntoBonusDirezione,
} from './parametri.js'

export interface Utilizzazione {
  id: string
  artistaId: string
  operaId: string
  /** null: ruolo che non entra nella ripartizione (es. regia), riga esclusa. */
  categoria: CategoriaRipartizione | null
  /** Lineari: la messa in onda è su un canale generalista o principale. */
  generalista?: boolean | null
  durataMinuti?: number | null
  /** Ora di inizio trasmissione, «HH:MM» o «HH:MM:SS». */
  oraInizio?: string | null
  views?: number | null
  ricavi?: number | null
}

export type MotivoEsclusione = 'senza_categoria' | 'tetto_ruoli'

export interface RigaCalcolata {
  id: string
  artistaId: string
  operaId: string
  categoria: CategoriaRipartizione | null
  esclusa: MotivoEsclusione | null
  /** Views effettivamente usate (comprese quelle assegnate per dato mancante). */
  viewsUsate: number | null
  viewsAssegnate: boolean
  quotaOpera: number
  prima: number
  seconda: number
  resto: number
  bonusDirezione: number
  integrazioneMinimo: number
  totalePrimaDelRicalcolo: number
  /** Importo esatto dopo il ricalcolo proporzionale. */
  importo: number
  /** Importo da liquidare, al centesimo. */
  importoFinale: number
}

export interface QuotaLineare {
  percentuale: number
  importo: number
  righe: number
  perRiga: number
  assegnata: boolean
}

export interface RiepilogoRipartizione {
  versioneParametri: string
  modalita: Modalita
  fondo: number
  righeTotali: number
  utilizzazioni: number
  escluse: Record<MotivoEsclusione, number>
  righePerCategoria: Record<CategoriaRipartizione, number>
  quoteLineari: Record<'tutte' | 'generaliste' | 'oltre60' | 'primaSerata', QuotaLineare> | null
  totaleViews: number | null
  righeViewsMancanti: number
  viewsAssegnatePerRigaMancante: number | null
  totaleRicavi: number | null
  righeRicaviMancanti: number
  quotaPerUnita: number | null
  totaleQuotaOpera: number
  totalePrima: number
  totaleSeconda: number
  restoPerUtilizzazione: number
  totaleBonusDirezione: number
  minimo: { soglia: number; valore: number; righe: number } | null
  totalePrimaDelRicalcolo: number
  coefficienteRicalcolo: number
  totaleFinale: number
  avvisi: string[]
}

export interface RisultatoRipartizione {
  righe: RigaCalcolata[]
  riepilogo: RiepilogoRipartizione
}

export interface InputRipartizione {
  fondo: number
  modalita: Modalita
  righe: Utilizzazione[]
  parametri?: ParametriRipartizione
}

export class RipartizioneError extends Error {
  constructor(
    message: string,
    readonly codice: 'fondo_non_valido' | 'nessuna_view' | 'nessun_ricavo',
  ) {
    super(message)
    this.name = 'RipartizioneError'
  }
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** «HH:MM[:SS]» → minuti dalla mezzanotte; null se non leggibile. */
export function minutiDaOra(ora: string | null | undefined): number | null {
  if (!ora) return null
  const m = /^(\d{1,2})[:.](\d{2})/.exec(ora.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

function sommaCategorie(): Record<CategoriaRipartizione, number> {
  return Object.fromEntries(CATEGORIE_RIPARTIZIONE.map((c) => [c, 0])) as Record<CategoriaRipartizione, number>
}

/**
 * Tetto di ruoli per artista nella stessa opera: si tengono le categorie con il
 * punteggio più alto, le altre righe sono escluse.
 */
export function applicaTettoRuoli(
  righe: Utilizzazione[],
  tetto: number | null,
  pesi: Record<CategoriaRipartizione, number>,
): Map<string, MotivoEsclusione> {
  const esclusioni = new Map<string, MotivoEsclusione>()
  for (const r of righe) if (!r.categoria) esclusioni.set(r.id, 'senza_categoria')
  if (tetto === null) return esclusioni

  const perArtistaOpera = new Map<string, Set<CategoriaRipartizione>>()
  for (const r of righe) {
    if (!r.categoria) continue
    const key = `${r.artistaId}\u0000${r.operaId}`
    let set = perArtistaOpera.get(key)
    if (!set) perArtistaOpera.set(key, (set = new Set()))
    set.add(r.categoria)
  }
  const ordine = (c: CategoriaRipartizione) => CATEGORIE_RIPARTIZIONE.indexOf(c)
  const tenute = new Map<string, Set<CategoriaRipartizione>>()
  for (const [key, set] of perArtistaOpera) {
    if (set.size <= tetto) continue
    const ordinate = [...set].sort((a, b) => pesi[b] - pesi[a] || ordine(a) - ordine(b))
    tenute.set(key, new Set(ordinate.slice(0, tetto)))
  }
  for (const r of righe) {
    if (!r.categoria) continue
    const keep = tenute.get(`${r.artistaId}\u0000${r.operaId}`)
    if (keep && !keep.has(r.categoria)) esclusioni.set(r.id, 'tetto_ruoli')
  }
  return esclusioni
}

/** Importi esatti → centesimi che sommano esattamente al totale (resti maggiori). */
export function arrotondaAlCentesimo(importi: number[], totale: number): number[] {
  const target = Math.round(totale * 100)
  const centesimi = importi.map((v) => v * 100)
  const base = centesimi.map((c) => Math.floor(c + 1e-9))
  let differenza = target - base.reduce((s, c) => s + c, 0)
  if (differenza !== 0 && importi.length > 0) {
    const ordine = centesimi
      .map((c, i) => ({ i, resto: c - base[i] }))
      .sort((a, b) => (differenza > 0 ? b.resto - a.resto : a.resto - b.resto) || a.i - b.i)
    const passo = differenza > 0 ? 1 : -1
    for (let k = 0; differenza !== 0; k = (k + 1) % ordine.length) {
      base[ordine[k].i] += passo
      differenza -= passo
    }
  }
  return base.map((c) => c / 100)
}

/**
 * Ricalcolo proporzionale fino al fondo. Con `minimo` le righe che
 * scenderebbero sotto il minimo restano al minimo e il resto si riproporziona.
 */
export function ricalcolaProporzionale(
  totali: number[],
  fondo: number,
  minimo: number | null,
): { importi: number[]; coefficiente: number } {
  const somma = totali.reduce((s, v) => s + v, 0)
  if (somma === 0) return { importi: totali.map(() => 0), coefficiente: 1 }
  let coefficiente = fondo / somma
  if (minimo === null || coefficiente >= 1) {
    return { importi: totali.map((v) => v * coefficiente), coefficiente }
  }
  const bloccate = new Set<number>()
  for (let giro = 0; giro < totali.length; giro += 1) {
    const sommaLibere = totali.reduce((s, v, i) => (bloccate.has(i) ? s : s + v), 0)
    const disponibile = fondo - bloccate.size * minimo
    if (sommaLibere <= 0 || disponibile <= 0) {
      // Il fondo non basta a garantire il minimo: ricalcolo semplice.
      coefficiente = fondo / somma
      return { importi: totali.map((v) => v * coefficiente), coefficiente }
    }
    coefficiente = disponibile / sommaLibere
    let nuove = 0
    totali.forEach((v, i) => {
      if (!bloccate.has(i) && v * coefficiente < minimo) {
        bloccate.add(i)
        nuove += 1
      }
    })
    if (nuove === 0) break
  }
  return {
    importi: totali.map((v, i) => (bloccate.has(i) ? minimo : v * coefficiente)),
    coefficiente,
  }
}

function bonusApplicato(punto: PuntoBonusDirezione, dove: PuntoBonusDirezione, categoria: CategoriaRipartizione) {
  return punto === dove && categoria === 'direzione_doppiaggio'
}

export function calcolaRipartizione(input: InputRipartizione): RisultatoRipartizione {
  const parametri = input.parametri ?? PARAMETRI_REGOLAMENTO_2024
  const { fondo, modalita } = input
  if (!isFiniteNumber(fondo) || fondo <= 0) {
    throw new RipartizioneError('Il fondo deve essere un importo maggiore di zero', 'fondo_non_valido')
  }

  const esclusioni = applicaTettoRuoli(input.righe, parametri.tettoRuoliPerOpera, parametri.pesiPrima)
  const valide = input.righe.filter((r) => !esclusioni.has(r.id)) as (Utilizzazione & {
    categoria: CategoriaRipartizione
  })[]
  const n = valide.length
  const avvisi: string[] = []

  const righePerCategoria = sommaCategorie()
  for (const r of valide) righePerCategoria[r.categoria] += 1

  // --- Quota opera ---------------------------------------------------------
  const quota = new Map<string, number>()
  const viewsUsate = new Map<string, { views: number; assegnate: boolean }>()
  let quoteLineari: RiepilogoRipartizione['quoteLineari'] = null
  let totaleViews: number | null = null
  let righeViewsMancanti = 0
  let viewsAssegnatePerRigaMancante: number | null = null
  let totaleRicavi: number | null = null
  let righeRicaviMancanti = 0
  let quotaPerUnita: number | null = null

  if (modalita === 'lineare') {
    const q = parametri.lineare.quote
    const inizio = minutiDaOra(parametri.lineare.fasciaPrimaSerata.da)!
    const fine = minutiDaOra(parametri.lineare.fasciaPrimaSerata.a)!
    const eGeneralista = (r: Utilizzazione) => r.generalista === true
    const eOltre60 = (r: Utilizzazione) =>
      isFiniteNumber(r.durataMinuti) && r.durataMinuti > parametri.lineare.durataMinimaMinuti
    const ePrimaSerata = (r: Utilizzazione) => {
      const m = minutiDaOra(r.oraInizio)
      return m !== null && m >= inizio && m <= fine
    }
    const nGen = valide.filter(eGeneralista).length
    const nOltre = valide.filter(eOltre60).length
    const nSerata = valide.filter(ePrimaSerata).length

    let percTutte = q.tutte
    if (nGen === 0 && parametri.lineare.senzaGeneraliste === 'somma_a_tutte') percTutte += q.generaliste
    const voce = (percentuale: number, righe: number, assegnata: boolean): QuotaLineare => ({
      percentuale,
      importo: fondo * percentuale,
      righe,
      perRiga: assegnata && righe > 0 ? (fondo * percentuale) / righe : 0,
      assegnata: assegnata && righe > 0,
    })
    quoteLineari = {
      tutte: voce(percTutte, n, true),
      generaliste: voce(q.generaliste, nGen, nGen > 0),
      oltre60: voce(q.oltre60, nOltre, true),
      primaSerata: voce(q.primaSerata, nSerata, true),
    }
    if (nGen === 0 && parametri.lineare.senzaGeneraliste === 'somma_a_tutte') {
      quoteLineari.generaliste = { ...quoteLineari.generaliste, importo: 0 }
    }
    if (nOltre === 0) avvisi.push('Nessuna opera oltre i 60 minuti: la quota del 9% rientra nel resto.')
    if (nSerata === 0) avvisi.push('Nessuna trasmissione in prima serata: la quota dell’8% rientra nel resto.')
    for (const r of valide) {
      let v = quoteLineari.tutte.perRiga
      if (eGeneralista(r)) v += quoteLineari.generaliste.perRiga
      if (eOltre60(r)) v += quoteLineari.oltre60.perRiga
      if (ePrimaSerata(r)) v += quoteLineari.primaSerata.perRiga
      quota.set(r.id, v)
    }
  } else if (modalita === 'od_views') {
    const conViews = valide.filter((r) => isFiniteNumber(r.views))
    righeViewsMancanti = n - conViews.length
    if (conViews.length === 0 && n > 0) {
      throw new RipartizioneError(
        'Nessuna riga ha le visualizzazioni: usare la modalità per numero di utilizzazioni',
        'nessuna_view',
      )
    }
    const media = conViews.length ? conViews.reduce((s, r) => s + (r.views as number), 0) / conViews.length : 0
    viewsAssegnatePerRigaMancante = righeViewsMancanti > 0 ? media * parametri.viewsMancantiQuotaMedia : null
    for (const r of valide) {
      const assegnate = !isFiniteNumber(r.views)
      viewsUsate.set(r.id, { views: assegnate ? (viewsAssegnatePerRigaMancante as number) : (r.views as number), assegnate })
    }
    totaleViews = [...viewsUsate.values()].reduce((s, v) => s + v.views, 0)
    if (totaleViews <= 0 && n > 0) {
      throw new RipartizioneError('Il totale delle visualizzazioni è zero', 'nessuna_view')
    }
    quotaPerUnita = n > 0 ? fondo / totaleViews : null
    for (const r of valide) quota.set(r.id, viewsUsate.get(r.id)!.views * (quotaPerUnita ?? 0))
  } else if (modalita === 'od_ricavi') {
    righeRicaviMancanti = valide.filter((r) => !isFiniteNumber(r.ricavi)).length
    totaleRicavi = valide.reduce((s, r) => s + (isFiniteNumber(r.ricavi) ? r.ricavi : 0), 0)
    if (totaleRicavi <= 0 && n > 0) {
      throw new RipartizioneError('Il totale dei ricavi è zero o negativo', 'nessun_ricavo')
    }
    quotaPerUnita = n > 0 ? fondo / totaleRicavi : null
    for (const r of valide) quota.set(r.id, (isFiniteNumber(r.ricavi) ? r.ricavi : 0) * (quotaPerUnita ?? 0))
    if (righeRicaviMancanti > 0) avvisi.push(`${righeRicaviMancanti} righe senza ricavi: quota opera zero.`)
  } else {
    quotaPerUnita = n > 0 ? fondo / n : null
    for (const r of valide) quota.set(r.id, quotaPerUnita ?? 0)
  }

  // --- 1ª e 2ª ripartizione, resto -----------------------------------------
  const lineare = modalita === 'lineare'
  const puntoBonus = lineare ? parametri.bonusDirezione.lineare : parametri.bonusDirezione.onDemand
  const bonus = parametri.bonusDirezione.percentuale
  const prima = new Map<string, number>()
  const bonusPrima = new Map<string, number>()
  for (const r of valide) {
    const base = (quota.get(r.id)! / parametri.divisore) * parametri.pesiPrima[r.categoria]
    const extra = bonusApplicato(puntoBonus, 'prima_ripartizione', r.categoria) ? base * bonus : 0
    prima.set(r.id, base + extra)
    bonusPrima.set(r.id, extra)
  }
  const totalePrima = [...prima.values()].reduce((s, v) => s + v, 0)

  const seconda = new Map<string, number>()
  let restoPerUtilizzazione = 0
  if (lineare) {
    // 2ª ripartizione: il resto dei fondi diviso per le utilizzazioni, per moltiplicatore.
    const r2 = n > 0 ? (fondo - totalePrima) / n : 0
    restoPerUtilizzazione = r2
    for (const r of valide) seconda.set(r.id, r2 * parametri.moltiplicatoriSeconda[r.categoria])
  } else {
    for (const r of valide) seconda.set(r.id, prima.get(r.id)! * parametri.moltiplicatoriSeconda[r.categoria])
  }
  const totaleSeconda = [...seconda.values()].reduce((s, v) => s + v, 0)
  if (!lineare && n > 0) {
    // On demand: il resto dei fondi diviso per le utilizzazioni, uguale per tutti.
    restoPerUtilizzazione = Math.max(0, (fondo - totalePrima - totaleSeconda) / n)
    if (fondo - totalePrima - totaleSeconda < 0) {
      avvisi.push('Prima e seconda ripartizione superano il fondo: nessun resto, si applica la riduzione.')
    }
  }

  const totali = new Map<string, number>()
  const bonusTotale = new Map<string, number>()
  for (const r of valide) {
    let t = prima.get(r.id)! + seconda.get(r.id)! + (lineare ? 0 : restoPerUtilizzazione)
    const extra = bonusApplicato(puntoBonus, 'totale', r.categoria) ? t * bonus : 0
    t += extra
    bonusTotale.set(r.id, extra)
    totali.set(r.id, t)
  }

  // --- Minimo (solo on demand) ----------------------------------------------
  let minimo: RiepilogoRipartizione['minimo'] = null
  const integrazione = new Map<string, number>()
  const regolaMinimo = parametri.minimoOnDemand.regola
  if (!lineare && regolaMinimo !== 'nessuno' && n > 0) {
    const soglia = parametri.minimoOnDemand.importo
    let valore = soglia
    if (regolaMinimo === 'primo_importo_superiore') {
      let piuPiccolo = Infinity
      for (const t of totali.values()) if (t >= soglia && t < piuPiccolo) piuPiccolo = t
      if (Number.isFinite(piuPiccolo)) valore = piuPiccolo
    }
    let righe = 0
    for (const r of valide) {
      const t = totali.get(r.id)!
      if (t < soglia) {
        integrazione.set(r.id, valore - t)
        totali.set(r.id, valore)
        righe += 1
      }
    }
    minimo = { soglia, valore, righe }
  }

  const totalePrimaDelRicalcolo = [...totali.values()].reduce((s, v) => s + v, 0)

  // --- Ricalcolo proporzionale fino al fondo ---------------------------------
  const ordineValide = valide.map((r) => r.id)
  const { importi, coefficiente } = ricalcolaProporzionale(
    ordineValide.map((id) => totali.get(id)!),
    fondo,
    minimo && parametri.minimoOnDemand.mantieniDopoRiduzione ? minimo.soglia : null,
  )
  const importoEsatto = new Map(ordineValide.map((id, i) => [id, importi[i]]))
  const centesimi = arrotondaAlCentesimo(importi, n > 0 ? fondo : 0)
  const importoFinale = new Map(ordineValide.map((id, i) => [id, centesimi[i]]))
  if (n === 0) avvisi.push('Nessuna utilizzazione valida: il fondo non è assegnato.')

  const righe: RigaCalcolata[] = input.righe.map((r) => {
    const esclusa = esclusioni.get(r.id) ?? null
    const v = viewsUsate.get(r.id)
    return {
      id: r.id,
      artistaId: r.artistaId,
      operaId: r.operaId,
      categoria: r.categoria,
      esclusa,
      viewsUsate: v ? v.views : isFiniteNumber(r.views) ? r.views : null,
      viewsAssegnate: v?.assegnate ?? false,
      quotaOpera: esclusa ? 0 : quota.get(r.id)!,
      prima: esclusa ? 0 : prima.get(r.id)!,
      seconda: esclusa ? 0 : seconda.get(r.id)!,
      resto: esclusa || lineare ? 0 : restoPerUtilizzazione,
      bonusDirezione: esclusa ? 0 : bonusPrima.get(r.id)! + bonusTotale.get(r.id)!,
      integrazioneMinimo: esclusa ? 0 : integrazione.get(r.id) ?? 0,
      totalePrimaDelRicalcolo: esclusa ? 0 : totali.get(r.id)!,
      importo: esclusa ? 0 : importoEsatto.get(r.id)!,
      importoFinale: esclusa ? 0 : importoFinale.get(r.id)!,
    }
  })

  const escluse: Record<MotivoEsclusione, number> = { senza_categoria: 0, tetto_ruoli: 0 }
  for (const m of esclusioni.values()) escluse[m] += 1
  if (escluse.tetto_ruoli > 0) avvisi.push(`${escluse.tetto_ruoli} righe escluse per il tetto di ruoli per opera.`)
  if (escluse.senza_categoria > 0) avvisi.push(`${escluse.senza_categoria} righe con ruolo non ripartibile.`)

  const somma = (f: (r: RigaCalcolata) => number) => righe.reduce((s, r) => s + f(r), 0)
  const riepilogo: RiepilogoRipartizione = {
    versioneParametri: parametri.versione,
    modalita,
    fondo,
    righeTotali: input.righe.length,
    utilizzazioni: n,
    escluse,
    righePerCategoria,
    quoteLineari,
    totaleViews,
    righeViewsMancanti,
    viewsAssegnatePerRigaMancante,
    totaleRicavi,
    righeRicaviMancanti,
    quotaPerUnita,
    totaleQuotaOpera: somma((r) => r.quotaOpera),
    totalePrima,
    totaleSeconda,
    restoPerUtilizzazione,
    totaleBonusDirezione: somma((r) => r.bonusDirezione),
    minimo,
    totalePrimaDelRicalcolo,
    coefficienteRicalcolo: coefficiente,
    totaleFinale: Math.round(somma((r) => r.importoFinale) * 100) / 100,
    avvisi,
  }
  return { righe, riepilogo }
}
