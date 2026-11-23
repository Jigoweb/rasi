import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import * as XLSX from 'xlsx'
import { calcolaRipartizione } from './engine.js'
import {
  categoriaDaTesto,
  confrontaConExcel,
  durataDaCella,
  leggiExcelRipartizione,
  oraDaCella,
} from './excel-paolo.js'

function workbook(fogli: Record<string, unknown[][]>): Buffer {
  const wb = XLSX.utils.book_new()
  for (const [nome, righe] of Object.entries(fogli)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(righe), nome)
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('excel ripartizione · celle', () => {
  it('riconosce le categorie di ruolo scritte in modi diversi', () => {
    assert.equal(categoriaDaTesto('Primario'), 'primario')
    assert.equal(categoriaDaTesto('Comprimario'), 'comprimario')
    assert.equal(categoriaDaTesto('Doppiatore Primario'), 'doppiatore_primario')
    assert.equal(categoriaDaTesto('Doppiatore comprimario'), 'doppiatore_comprimario')
    assert.equal(categoriaDaTesto('Direzione Doppiaggio'), 'direzione_doppiaggio')
    assert.equal(categoriaDaTesto('Regia'), null)
    assert.equal(categoriaDaTesto(''), null)
  })

  it('legge ore e durate di Excel', () => {
    assert.equal(oraDaCella(0.875), '21:00')
    assert.equal(oraDaCella(1.8125), '19:30')
    assert.equal(oraDaCella('19:02:46'), '19:02')
    assert.equal(oraDaCella(null), null)
    assert.equal(durataDaCella(95), 95)
    assert.equal(durataDaCella(0.0625), 90)
    assert.equal(durataDaCella('01:30'), 90)
  })
})

describe('excel ripartizione · lettura e confronto', () => {
  it('legge un foglio con la colonna ruolo, salta riepiloghi e righe di totale', () => {
    const buf = workbook({
      Individuazioni: [
        ['titolo', 'views', 'artista', 'ruolo', 'TOT. 1° RIPARTIZIONE', 'Fondi a Primari', 'Fondi a Comprimari'],
        ['Opera A', 100, 'Rossi', 'Primario', 1, 10, null],
        ['Opera A', 100, 'Bianchi', 'Comprimario', 0.5, null, 5],
        [null, null, null, null, null, 10, 5],
      ],
      'Dati conteggi': [['Fondo', 15]],
    })
    const l = leggiExcelRipartizione(buf)
    assert.deepEqual(l.fogli, ['Individuazioni'])
    assert.equal(l.righe.length, 2)
    assert.equal(l.righe[0].categoria, 'primario')
    assert.equal(l.righe[0].views, 100)
    assert.equal(l.righe[1].file.finale, 5)
    assert.equal(l.righe[0].file.prima, 1)
  })

  it('legge un foglio con un artista per colonna di ruolo, l’ora di fine e i generalisti', () => {
    const buf = workbook({
      GENERALISTE: [
        ['ORA INIZIO', 'ORA FINE', 'TITOLO\nOPERA', 'ARTISTI\nPRIMARI', 'DOPPIATORI\nCOMPRIMARI', 'ASSEGNATO PRIMARI'],
        ['21:00', '22:40', 'Film', 'Verdi', null, 7],
        ['10:00', '10:30', 'Serie', null, 'Neri', 3],
      ],
    })
    const l = leggiExcelRipartizione(buf)
    assert.equal(l.righe.length, 2)
    assert.equal(l.righe[0].categoria, 'primario')
    assert.equal(l.righe[0].durataMinuti, 100)
    assert.equal(l.righe[0].generalista, true)
    assert.equal(l.righe[1].categoria, 'doppiatore_comprimario')
    assert.equal(l.righe[1].artista, 'Neri')
  })

  it('converte in minuti le durate scritte in secondi', () => {
    const buf = workbook({
      TEMATICHE: [
        ['DURATA', 'artista', 'CATEGORIA RUOLO', 'ASSEGNATO PRIMARI'],
        [5400, 'A', 'Primario', 1],
        [2400, 'B', 'Primario', 1],
        [7200, 'C', 'Primario', 1],
      ],
    })
    const l = leggiExcelRipartizione(buf)
    assert.deepEqual(
      l.righe.map((r) => r.durataMinuti),
      [90, 40, 120],
    )
    assert.ok(l.avvisi.some((a) => a.includes('secondi')))
  })

  it('a parità di regole il confronto non trova scostamenti', () => {
    const righe = [
      ['Opera A', 1000, 'Rossi', 'Primario'],
      ['Opera A', 1000, 'Bianchi', 'Doppiatore primario'],
      ['Opera B', 10, 'Verdi', 'Comprimario'],
    ]
    const { righe: calcolate } = calcolaRipartizione({
      fondo: 100,
      modalita: 'od_views',
      righe: righe.map((r, i) => ({
        id: String(i),
        artistaId: String(r[2]).toUpperCase(),
        operaId: String(r[0]).toUpperCase(),
        categoria: i === 0 ? 'primario' : i === 1 ? 'doppiatore_primario' : 'comprimario',
        views: r[1] as number,
      })),
    })
    const buf = workbook({
      Individuazioni: [
        ['titolo', 'views', 'artista', 'ruolo', 'Fondi a'],
        ...righe.map((r, i) => [...r, calcolate[i].importoFinale]),
      ],
    })
    const c = confrontaConExcel(leggiExcelRipartizione(buf), 100, 'od_views')
    assert.equal(c.totalePiattaforma, 100)
    assert.ok(c.scostamentoAssoluto < 1e-9)
  })
})
