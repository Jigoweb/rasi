/**
 * Confronto tra un Excel di ripartizione di RASI e il calcolo della piattaforma
 * sulle stesse righe.
 */
import { calcolaRipartizione, type Utilizzazione } from './engine.js'
import type { LetturaExcelRipartizione } from './excel-lettura.js'
import type { Modalita, ParametriRipartizione } from './parametri.js'

export {
  categoriaDaTesto,
  durataDaCella,
  leggiExcelRipartizione,
  normalizzaIntestazione,
  oraDaCella,
  type LetturaExcelRipartizione,
  type RigaExcelRipartizione,
} from './excel-lettura.js'

export interface ConfrontoArtista {
  artista: string
  file: number
  piattaforma: number
  differenza: number
}

export interface ConfrontoRipartizione {
  fondo: number
  modalita: Modalita
  righe: number
  totaleFile: number
  totalePiattaforma: number
  perCategoria: Record<string, { file: number; piattaforma: number; righe: number }>
  artisti: ConfrontoArtista[]
  /** Somma delle differenze assolute per artista, in euro. */
  scostamentoAssoluto: number
  differenzaMassimaArtista: number
}

/** Ricalcola con il motore le righe lette dall'Excel e le confronta con il file. */
export function confrontaConExcel(
  lettura: LetturaExcelRipartizione,
  fondo: number,
  modalita: Modalita,
  parametri?: ParametriRipartizione,
): ConfrontoRipartizione {
  const utilizzazioni: Utilizzazione[] = lettura.righe.map((r) => ({
    id: `${r.foglio}:${r.riga}`,
    artistaId: r.artista.toUpperCase(),
    operaId: r.opera.toUpperCase(),
    categoria: r.categoria,
    generalista: r.generalista,
    durataMinuti: r.durataMinuti,
    oraInizio: r.oraInizio,
    views: r.views,
    ricavi: r.ricavi,
  }))
  const { righe } = calcolaRipartizione({ fondo, modalita, righe: utilizzazioni, parametri })
  const perCategoria: ConfrontoRipartizione['perCategoria'] = {}
  const perArtista = new Map<string, ConfrontoArtista>()
  lettura.righe.forEach((r, i) => {
    const nostro = righe[i].importoFinale
    const c = (perCategoria[r.categoria] ??= { file: 0, piattaforma: 0, righe: 0 })
    c.file += r.file.finale
    c.piattaforma += nostro
    c.righe += 1
    const key = r.artista.toUpperCase()
    const a = perArtista.get(key) ?? { artista: r.artista, file: 0, piattaforma: 0, differenza: 0 }
    a.file += r.file.finale
    a.piattaforma += nostro
    a.differenza = a.piattaforma - a.file
    perArtista.set(key, a)
  })
  const artisti = [...perArtista.values()].sort((a, b) => Math.abs(b.differenza) - Math.abs(a.differenza))
  return {
    fondo,
    modalita,
    righe: lettura.righe.length,
    totaleFile: lettura.righe.reduce((s, r) => s + r.file.finale, 0),
    totalePiattaforma: righe.reduce((s, r) => s + r.importoFinale, 0),
    perCategoria,
    artisti,
    scostamentoAssoluto: artisti.reduce((s, a) => s + Math.abs(a.differenza), 0),
    differenzaMassimaArtista: artisti.length ? Math.abs(artisti[0].differenza) : 0,
  }
}
