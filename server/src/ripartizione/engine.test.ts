import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applicaTettoRuoli,
  arrotondaAlCentesimo,
  calcolaRipartizione,
  minutiDaOra,
  ricalcolaProporzionale,
  RipartizioneError,
  type Utilizzazione,
} from './engine.js'
import { PARAMETRI_REGOLAMENTO_2024 as P } from './parametri.js'

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) <= eps, `atteso ${b}, ottenuto ${a}`)

const somma = (xs: number[]) => xs.reduce((s, x) => s + x, 0)

describe('ripartizione · utilità', () => {
  it('legge l’ora di inizio', () => {
    assert.equal(minutiDaOra('19:00'), 1140)
    assert.equal(minutiDaOra('23:30:00'), 1410)
    assert.equal(minutiDaOra('6.05'), 365)
    assert.equal(minutiDaOra(''), null)
    assert.equal(minutiDaOra('25:00'), null)
  })

  it('arrotonda al centesimo chiudendo esattamente sul totale', () => {
    const c = arrotondaAlCentesimo([1 / 3, 1 / 3, 1 / 3], 1)
    assert.deepEqual(c, [0.34, 0.33, 0.33])
    const c2 = arrotondaAlCentesimo([2.005, 2.005, 5.99], 10)
    close(somma(c2), 10, 1e-9)
  })

  it('ricalcola in proporzione e, se chiesto, protegge il minimo', () => {
    const semplice = ricalcolaProporzionale([1.5, 10, 20], 20, null)
    close(somma(semplice.importi), 20)
    assert.ok(semplice.importi[0] < 1.5)
    const conMinimo = ricalcolaProporzionale([1.5, 10, 20], 20, 1.5)
    close(somma(conMinimo.importi), 20)
    assert.equal(conMinimo.importi[0], 1.5)
  })

  it('applica il tetto di 3 ruoli tenendo quelli con il punteggio più alto', () => {
    const righe: Utilizzazione[] = [
      { id: 'a', artistaId: 'x', operaId: 'o', categoria: 'doppiatore_comprimario' },
      { id: 'b', artistaId: 'x', operaId: 'o', categoria: 'primario' },
      { id: 'c', artistaId: 'x', operaId: 'o', categoria: 'direzione_doppiaggio' },
      { id: 'd', artistaId: 'x', operaId: 'o', categoria: 'comprimario' },
      { id: 'e', artistaId: 'x', operaId: 'altra', categoria: 'doppiatore_comprimario' },
      { id: 'f', artistaId: 'x', operaId: 'o', categoria: null },
    ]
    const esclusioni = applicaTettoRuoli(righe, 3, P.pesiPrima)
    assert.equal(esclusioni.get('a'), 'tetto_ruoli')
    assert.equal(esclusioni.get('f'), 'senza_categoria')
    assert.equal(esclusioni.has('b'), false)
    assert.equal(esclusioni.has('e'), false)
  })
})

describe('ripartizione · canali lineari', () => {
  const righe: Utilizzazione[] = [
    { id: '1', artistaId: 'A', operaId: 'O1', categoria: 'primario', generalista: true, durataMinuti: 90, oraInizio: '20:00' },
    { id: '2', artistaId: 'B', operaId: 'O1', categoria: 'comprimario', generalista: false, durataMinuti: 30, oraInizio: '10:00' },
  ]

  it('applica 73/10/9/8, prima e seconda ripartizione e chiude sul fondo', () => {
    const { righe: out, riepilogo } = calcolaRipartizione({ fondo: 100, modalita: 'lineare', righe })
    const q1 = 36.5 + 10 + 9 + 8
    const q2 = 36.5
    close(out[0].quotaOpera, q1)
    close(out[1].quotaOpera, q2)
    const p1 = (q1 / 11) * 5.51
    const p2 = (q2 / 11) * 2.49
    close(out[0].prima, p1)
    close(out[1].prima, p2)
    const r = (100 - p1 - p2) / 2
    close(riepilogo.restoPerUtilizzazione, r)
    close(out[0].seconda, r * 3.5)
    close(out[1].seconda, r * 1.1)
    const t1 = p1 + r * 3.5
    const t2 = p2 + r * 1.1
    close(riepilogo.coefficienteRicalcolo, 100 / (t1 + t2))
    close(out[0].importo, (t1 * 100) / (t1 + t2))
    assert.equal(riepilogo.totaleFinale, 100)
    assert.equal(out[0].resto, 0)
    assert.equal(riepilogo.minimo, null)
  })

  it('senza canali generalisti somma il 10% al 73% e manda nel resto le quote senza righe', () => {
    const senzaGen = righe.map((r) => ({ ...r, generalista: false, durataMinuti: 20 }))
    const { righe: out, riepilogo } = calcolaRipartizione({ fondo: 800, modalita: 'lineare', righe: senzaGen })
    close(riepilogo.quoteLineari!.tutte.percentuale, 0.83)
    assert.equal(riepilogo.quoteLineari!.oltre60.assegnata, false)
    close(out[1].quotaOpera, (800 * 0.83) / 2)
    close(out[0].quotaOpera, (800 * 0.83) / 2 + 800 * 0.08)
    assert.ok(riepilogo.avvisi.some((a) => a.includes('9%')))
    assert.equal(riepilogo.totaleFinale, 800)
  })

  it('dà alla direzione del doppiaggio il 10% in più sul totale', () => {
    const d: Utilizzazione[] = [
      { id: '1', artistaId: 'A', operaId: 'O', categoria: 'doppiatore_primario', durataMinuti: 30 },
      { id: '2', artistaId: 'B', operaId: 'O', categoria: 'direzione_doppiaggio', durataMinuti: 30 },
    ]
    const { righe: out } = calcolaRipartizione({ fondo: 50, modalita: 'lineare', righe: d })
    close(out[1].totalePrimaDelRicalcolo, out[0].totalePrimaDelRicalcolo * 1.1)
  })
})

describe('ripartizione · on demand', () => {
  const base = (views: (number | null)[]): Utilizzazione[] =>
    views.map((v, i) => ({
      id: String(i),
      artistaId: `A${i}`,
      operaId: `O${i % 2}`,
      categoria: i === 0 ? 'primario' : i === 1 ? 'direzione_doppiaggio' : 'doppiatore_comprimario',
      views: v,
    }))

  it('quota per visualizzazioni, seconda sulla prima, resto per utilizzazione, minimo e riduzione', () => {
    const righe = base([100_000, 50_000, 10, 10, 10])
    const { righe: out, riepilogo } = calcolaRipartizione({ fondo: 1000, modalita: 'od_views', righe })
    const q = 1000 / 150_030
    close(riepilogo.quotaPerUnita!, q)
    close(out[0].quotaOpera, 100_000 * q)
    // +10% alla direzione già nella 1ª ripartizione
    close(out[1].prima, ((50_000 * q) / 11) * 1.8 * 1.1)
    close(out[1].seconda, out[1].prima * 0.4)
    close(out[0].seconda, out[0].prima * 3.5)
    // Qui prima e seconda superano il fondo: nessun resto, poi riduzione.
    assert.ok(riepilogo.totalePrima + riepilogo.totaleSeconda > 1000)
    assert.equal(riepilogo.restoPerUtilizzazione, 0)
    assert.ok(riepilogo.coefficienteRicalcolo < 1)
    assert.equal(riepilogo.totaleFinale, 1000)
    close(somma(out.map((r) => r.importo)), 1000, 1e-6)
  })

  it('aggiunge il resto per utilizzazione quando prima e seconda non esauriscono il fondo', () => {
    const righe = base([10, 10, 10, 10, 10])
    const { righe: out, riepilogo } = calcolaRipartizione({ fondo: 100, modalita: 'od_views', righe })
    const resto = (100 - riepilogo.totalePrima - riepilogo.totaleSeconda) / 5
    assert.ok(resto > 0)
    close(riepilogo.restoPerUtilizzazione, resto)
    close(out[4].totalePrimaDelRicalcolo, out[4].prima + out[4].seconda + resto)
  })

  it('porta gli importi sotto 1,50 € al primo importo superiore', () => {
    const righe = base([1_000_000, 1, 1, 1, 1, 400])
    const { righe: out, riepilogo } = calcolaRipartizione({ fondo: 30, modalita: 'od_views', righe })
    assert.ok(riepilogo.minimo!.righe > 0)
    assert.ok(riepilogo.minimo!.valore >= 1.5)
    const integrate = out.filter((r) => r.integrazioneMinimo > 0)
    for (const r of integrate) close(r.totalePrimaDelRicalcolo, riepilogo.minimo!.valore)
    assert.equal(riepilogo.totaleFinale, 30)
  })

  it('assegna il 10% della media alle righe senza visualizzazioni', () => {
    const righe = base([100, 300, null])
    const { righe: out, riepilogo } = calcolaRipartizione({ fondo: 100, modalita: 'od_views', righe })
    close(riepilogo.viewsAssegnatePerRigaMancante!, 20)
    assert.equal(out[2].viewsAssegnate, true)
    close(riepilogo.totaleViews!, 420)
  })

  it('senza dati divide il fondo per il numero di utilizzazioni', () => {
    const righe = base([null, null, null, null])
    const { righe: out } = calcolaRipartizione({ fondo: 40, modalita: 'od_utilizzazioni', righe })
    for (const r of out) close(r.quotaOpera, 10)
  })

  it('con i ricavi usa la proporzione sui ricavi e tiene i rimborsi', () => {
    const righe = base([null, null, null]).map((r, i) => ({ ...r, ricavi: [300, 100, -10][i] }))
    const { righe: out, riepilogo } = calcolaRipartizione({ fondo: 39, modalita: 'od_ricavi', righe })
    close(riepilogo.quotaPerUnita!, 39 / 390)
    close(out[2].quotaOpera, -1)
    assert.equal(riepilogo.totaleFinale, 39)
  })

  it('rifiuta un catalogo senza visualizzazioni in modalità visualizzazioni', () => {
    assert.throws(
      () => calcolaRipartizione({ fondo: 10, modalita: 'od_views', righe: base([null, null]) }),
      (e: unknown) => e instanceof RipartizioneError && e.codice === 'nessuna_view',
    )
  })

  it('non assegna nulla alle righe escluse', () => {
    const righe = [...base([10, 10]), { id: 'x', artistaId: 'Z', operaId: 'O0', categoria: null, views: 10 }]
    const { righe: out, riepilogo } = calcolaRipartizione({ fondo: 10, modalita: 'od_views', righe })
    assert.equal(out[2].importoFinale, 0)
    assert.equal(riepilogo.escluse.senza_categoria, 1)
    assert.equal(riepilogo.totaleFinale, 10)
  })
})
