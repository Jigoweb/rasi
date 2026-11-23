/**
 * Lettura degli Excel di ripartizione preparati a mano da RASI («F <EMITTENTE>
 * <ANNO>_INDIVIDUAZIONI.xlsx»).
 *
 * Le colonne si riconoscono dal nome dell'intestazione: i file non hanno tutti
 * lo stesso tracciato (ruolo in una colonna, oppure un artista per colonna di
 * ruolo; visualizzazioni chiamate views, UTILIZZI o Legitimate Stream…).
 */
import * as XLSX from 'xlsx'
import type { CategoriaRipartizione } from './parametri.js'

export interface RigaExcelRipartizione {
  foglio: string
  /** Numero di riga nel foglio (1 = intestazione). */
  riga: number
  categoria: CategoriaRipartizione
  artista: string
  opera: string
  generalista: boolean
  durataMinuti: number | null
  oraInizio: string | null
  views: number | null
  ricavi: number | null
  /** Valori calcolati nel file. */
  file: { prima: number | null; ridotto: number | null; finale: number }
}

export interface LetturaExcelRipartizione {
  fogli: string[]
  righe: RigaExcelRipartizione[]
  colonne: Record<string, string[]>
  avvisi: string[]
}

export function normalizzaIntestazione(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function categoriaDaTesto(value: unknown): CategoriaRipartizione | null {
  const t = normalizzaIntestazione(value).replace(/[.,]/g, ' ').replace(/\s+/g, ' ')
  if (!t) return null
  if (t.startsWith('dir')) return 'direzione_doppiaggio'
  if (/^(dopp\w*|dp|dc)\b/.test(t)) {
    if (t === 'dp' || /\bprim/.test(t)) return 'doppiatore_primario'
    if (t === 'dc' || /\bcompr/.test(t)) return 'doppiatore_comprimario'
    return null
  }
  if (/^(artist\w* )?compr/.test(t) || t === 'c') return 'comprimario'
  if (/^(artist\w* )?prim/.test(t) || t === 'p') return 'primario'
  return null
}

const COLONNE_RUOLO: { re: RegExp; categoria: CategoriaRipartizione }[] = [
  { re: /^artisti primari$/, categoria: 'primario' },
  { re: /^artisti comprimari$/, categoria: 'comprimario' },
  { re: /^doppiatori primari$/, categoria: 'doppiatore_primario' },
  { re: /^doppiatori comprimari$/, categoria: 'doppiatore_comprimario' },
  { re: /^direzione doppiaggio$/, categoria: 'direzione_doppiaggio' },
]

const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const s = v.trim().replace(/\./g, '').replace(',', '.')
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  }
  return null
}

/** Ora di Excel (frazione di giorno, numero con data, testo o Date) → «HH:MM». */
export function oraDaCella(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date) {
    return `${String(v.getUTCHours()).padStart(2, '0')}:${String(v.getUTCMinutes()).padStart(2, '0')}`
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    const frazione = v - Math.floor(v)
    const minuti = Math.round(frazione * 24 * 60) % (24 * 60)
    return `${String(Math.floor(minuti / 60)).padStart(2, '0')}:${String(minuti % 60).padStart(2, '0')}`
  }
  const m = /(\d{1,2})[:.](\d{2})/.exec(String(v))
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}

/** Durata in minuti: numero di minuti oppure ora di Excel («01:30»). */
export function durataDaCella(v: unknown): number | null {
  if (v instanceof Date) return v.getUTCHours() * 60 + v.getUTCMinutes()
  if (typeof v === 'number' && Number.isFinite(v)) return v > 0 && v < 1 ? Math.round(v * 24 * 60) : v
  const n = num(v)
  if (n !== null) return n
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v ?? '').trim())
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

function trovaColonna(intestazioni: string[], test: (h: string) => boolean): number {
  return intestazioni.findIndex(test)
}

export function leggiExcelRipartizione(buffer: Buffer | ArrayBuffer): LetturaExcelRipartizione {
  const wb = XLSX.read(buffer, { type: buffer instanceof ArrayBuffer ? 'array' : 'buffer', cellDates: true })
  const righe: RigaExcelRipartizione[] = []
  const colonne: Record<string, string[]> = {}
  const avvisi: string[] = []
  const fogli: string[] = []

  for (const nome of wb.SheetNames) {
    if (/conteggi|legenda/i.test(nome)) continue
    const grezze = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nome], { header: 1, raw: true, defval: null })
    if (grezze.length < 2) continue
    const h = (grezze[0] ?? []).map(normalizzaIntestazione)

    const cRuolo = trovaColonna(h, (x) => x === 'ruolo' || x === 'categoria ruolo')
    const cArtista = trovaColonna(h, (x) => x === 'artista')
    const cRuoliArtista = COLONNE_RUOLO.map((c) => ({ ...c, idx: h.findIndex((x) => c.re.test(x)) })).filter(
      (c) => c.idx >= 0,
    )
    if (cRuolo < 0 && cRuoliArtista.length === 0) continue
    const cTitolo = trovaColonna(h, (x) => /^titolo( dell'opera| opera)?$/.test(x))
    const cEpisodio = trovaColonna(h, (x) => /^(episodio|titolo_? ?episodio|n\.? ?episodio|n, episodio|numero_episodio)$/.test(x))
    const cViews = trovaColonna(h, (x) => x === 'views' || x === 'utilizzi' || x.startsWith('legitimate stream'))
    const cRicavi = trovaColonna(h, (x) => x.startsWith('incasso tot'))
    const cDurata = trovaColonna(h, (x) => /^durata( opera|_minuti)?$/.test(x))
    const cOra = trovaColonna(h, (x) => /^(ora|orario) inizio$/.test(x))
    const cOraFine = trovaColonna(h, (x) => x === 'ora fine')
    const cPrima = trovaColonna(h, (x) => /^tot[.,]? ?1° ripartizione$|^tot 1 rip$/.test(x))
    const cRidotto = trovaColonna(h, (x) => x.startsWith('riduzione'))
    const cFinali = h
      .map((x, i) => ({ x, i }))
      .filter(({ x }) => /^(f?fondi|assegnato|da liquidare)/.test(x) && !x.startsWith('fondi disponibili'))
      .map(({ i }) => i)
    if (cFinali.length === 0) {
      avvisi.push(`${nome}: nessuna colonna con gli importi finali`)
      continue
    }
    fogli.push(nome)
    colonne[nome] = [
      ...(cRuolo >= 0 ? [h[cRuolo]] : cRuoliArtista.map((c) => h[c.idx])),
      ...[cTitolo, cEpisodio, cViews, cRicavi, cDurata, cOra, cOraFine, cPrima, cRidotto].filter((i) => i >= 0).map((i) => h[i]),
      ...cFinali.map((i) => h[i]),
    ]
    const generalista = /generalist/i.test(nome)
    const primaRiga = righe.length

    grezze.slice(1).forEach((r, k) => {
      let categoria: CategoriaRipartizione | null = null
      let artista = ''
      if (cRuolo >= 0) {
        categoria = categoriaDaTesto(r[cRuolo])
        artista = String(r[cArtista] ?? '').trim()
      } else {
        for (const c of cRuoliArtista) {
          const v = String(r[c.idx] ?? '').trim()
          if (v) {
            categoria = c.categoria
            artista = v
            break
          }
        }
      }
      if (!categoria) return
      const finale = cFinali.reduce((s, i) => s + (num(r[i]) ?? 0), 0)
      let durata = cDurata >= 0 ? durataDaCella(r[cDurata]) : null
      const ora = cOra >= 0 ? oraDaCella(r[cOra]) : null
      if (durata === null && ora && cOraFine >= 0) {
        const fine = oraDaCella(r[cOraFine])
        if (fine) {
          const [a, b] = [ora, fine].map((x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3, 5)))
          durata = (b - a + 24 * 60) % (24 * 60)
        }
      }
      const titolo = String((cTitolo >= 0 ? r[cTitolo] : '') ?? '').trim()
      righe.push({
        foglio: nome,
        riga: k + 2,
        categoria,
        artista,
        opera: titolo,
        generalista,
        durataMinuti: durata,
        oraInizio: ora,
        views: cViews >= 0 ? num(r[cViews]) : null,
        ricavi: cRicavi >= 0 ? num(r[cRicavi]) : null,
        file: {
          prima: cPrima >= 0 ? num(r[cPrima]) : null,
          ridotto: cRidotto >= 0 ? num(r[cRidotto]) : null,
          finale,
        },
      })
    })

    // Durata in secondi (es. Rai Tematiche: 2471 = 41 minuti): mediana oltre 10 ore.
    const durate = righe
      .slice(primaRiga)
      .map((r) => r.durataMinuti)
      .filter((d): d is number => d !== null)
      .sort((a, b) => a - b)
    if (durate.length && durate[Math.floor(durate.length / 2)] > 600) {
      for (const r of righe.slice(primaRiga)) if (r.durataMinuti !== null) r.durataMinuti /= 60
      avvisi.push(`${nome}: durata letta in secondi e convertita in minuti`)
    }
  }
  return { fogli, righe, colonne, avvisi }
}
