import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { calcolaRipartizione } from './engine.js'
import {
  canaliGeneralistiDa,
  categoriaRuolo,
  modalitaProposta,
  parametriDaConfigurazione,
  ricaviDa,
  totaliPerArtista,
  utilizzazioniDaIndividuazioni,
  type IndividuazioneSorgente,
} from './preparazione.js'
import { PARAMETRI_REGOLAMENTO_2024 } from './parametri.js'

const ind = (over: Partial<IndividuazioneSorgente>): IndividuazioneSorgente => ({
  id: 'i1',
  artista_id: 'a1',
  opera_id: 'o1',
  episodio_id: null,
  ruolo_id: 'r1',
  programmazione_id: 'p1',
  canale: null,
  durata_minuti: null,
  ora_inizio: null,
  views: null,
  total_revenue: null,
  retail_price: null,
  track_price_local_currency: null,
  stato: 'individuato',
  ...over,
})

const ruoli = new Map([
  ['r1', 'primario' as const],
  ['r2', null],
])

describe('ripartizione · preparazione', () => {
  it('trasforma le individuazioni in utilizzazioni', () => {
    const out = utilizzazioniDaIndividuazioni(
      [
        ind({ id: 'a', canale: 'Rai 1', durata_minuti: 95, ora_inizio: '21:15:00', views: 10 }),
        ind({ id: 'b', ruolo_id: 'r2', canale: 'Rai 4' }),
        ind({ id: 'c', stato: 'respinto' }),
        ind({ id: 'd', opera_id: null }),
      ],
      ruoli,
      { modalita: 'lineare', tipo: 'tv_generalista', canaliGeneralisti: ['RAI 1', 'RAI 2'] },
    )
    assert.equal(out.length, 3)
    assert.equal(out[0].categoria, 'primario')
    assert.equal(out[0].generalista, true)
    assert.equal(out[0].durataMinuti, 95)
    assert.equal(out[1].categoria, null)
    assert.equal(out[1].generalista, false)
    assert.equal(out[2].operaId, 'individuazione:d')
  })

  it('senza elenco dei canali considera generalista solo un’emittente generalista', () => {
    const [g] = utilizzazioniDaIndividuazioni([ind({})], ruoli, { modalita: 'lineare', tipo: 'tv_generalista', canaliGeneralisti: null })
    const [t] = utilizzazioniDaIndividuazioni([ind({})], ruoli, { modalita: 'lineare', tipo: 'tv_tematica', canaliGeneralisti: null })
    assert.equal(g.generalista, true)
    assert.equal(t.generalista, false)
  })

  it('ricava i ricavi da incasso totale oppure prezzo × vendite', () => {
    assert.equal(ricaviDa(ind({ total_revenue: 12.5 })), 12.5)
    assert.equal(ricaviDa(ind({ views: 3, track_price_local_currency: 4.99 })), 3 * 4.99)
    assert.equal(ricaviDa(ind({ views: 3 })), null)
  })

  it('legge i canali generalisti dalla configurazione dell’emittente', () => {
    assert.deepEqual(canaliGeneralistiDa({ canali_generalisti: ['Rai 1', ' rai 2 ', 3] }), ['RAI 1', 'RAI 2'])
    assert.equal(canaliGeneralistiDa({}), null)
  })

  it('propone la modalità dai dati', () => {
    const conViews = utilizzazioniDaIndividuazioni([ind({ views: 5 }), ind({ id: 'x', views: 7 })], ruoli, {
      modalita: 'on_demand', tipo: 'streaming', canaliGeneralisti: null,
    })
    const senza = utilizzazioniDaIndividuazioni([ind({}), ind({ id: 'x' })], ruoli, {
      modalita: 'on_demand', tipo: 'streaming', canaliGeneralisti: null,
    })
    assert.equal(modalitaProposta(conViews, { modalita: 'on_demand', tipo: 'streaming', canaliGeneralisti: null }), 'od_views')
    assert.equal(modalitaProposta(senza, { modalita: 'on_demand', tipo: 'streaming', canaliGeneralisti: null }), 'od_utilizzazioni')
    assert.equal(modalitaProposta(senza, { modalita: null, tipo: 'pay_tv', canaliGeneralisti: null }), 'lineare')
  })

  it('accetta solo categorie note', () => {
    assert.equal(categoriaRuolo('direzione_doppiaggio'), 'direzione_doppiaggio')
    assert.equal(categoriaRuolo('escluso'), null)
    assert.equal(categoriaRuolo(null), null)
  })

  it('sovrappone i parametri salvati a quelli del regolamento', () => {
    const p = parametriDaConfigurazione({ bonusDirezione: { onDemand: 'totale' }, pesiPrima: { doppiatore_comprimario: 1.1 } })
    assert.equal(p.bonusDirezione.onDemand, 'totale')
    assert.equal(p.bonusDirezione.lineare, PARAMETRI_REGOLAMENTO_2024.bonusDirezione.lineare)
    assert.equal(p.pesiPrima.doppiatore_comprimario, 1.1)
    assert.equal(p.pesiPrima.primario, 5.51)
    assert.equal(parametriDaConfigurazione(null), PARAMETRI_REGOLAMENTO_2024)
  })

  it('somma i totali per artista e per categoria', () => {
    const { righe } = calcolaRipartizione({
      fondo: 10,
      modalita: 'od_utilizzazioni',
      righe: [
        { id: '1', artistaId: 'A', operaId: 'o', categoria: 'primario' },
        { id: '2', artistaId: 'A', operaId: 'p', categoria: 'comprimario' },
        { id: '3', artistaId: 'B', operaId: 'o', categoria: 'doppiatore_comprimario' },
        { id: '4', artistaId: 'C', operaId: 'o', categoria: null },
      ],
    })
    const totali = totaliPerArtista(righe)
    assert.equal(totali.length, 2)
    const a = totali.find((t) => t.artista_id === 'A')!
    assert.equal(a.numero_individuazioni, 2)
    assert.equal(Object.keys(a.perCategoria).length, 2)
    assert.equal(Math.round(totali.reduce((s, t) => s + t.importo, 0) * 100) / 100, 10)
  })
})
