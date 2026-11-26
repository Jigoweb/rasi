import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { detectSlashDateOrder, parseSlashDate } from './transforms.js'

describe('detectSlashDateOrder', () => {
  it('riconosce GG/MM quando un giorno è maggiore di 12', () => {
    assert.equal(detectSlashDateOrder(['01/01/2024', '13/01/2024']), 'dmy')
  })

  it('riconosce MM/GG quando un mese in seconda posizione è impossibile come mese', () => {
    assert.equal(detectSlashDateOrder(['01/13/2024']), 'mdy')
  })

  it('resta ambiguo se giorno e mese sono entrambi ≤ 12', () => {
    assert.equal(detectSlashDateOrder(['01/02/2024']), 'ambiguous')
  })

  it('segnala il conflitto se il file mescola i due ordini', () => {
    assert.equal(detectSlashDateOrder(['13/01/2024', '01/13/2024']), 'conflict')
  })
})

describe('parseSlashDate', () => {
  it('converte 13/01/2024 in GG/MM e non scambia 02/01/2024 con febbraio', () => {
    assert.equal(parseSlashDate('13/01/2024', 'dmy'), '2024-01-13')
    assert.equal(parseSlashDate('02/01/2024', 'dmy'), '2024-01-02')
  })

  it('accetta anno a due cifre, trattino e un orario finale da ignorare', () => {
    assert.equal(parseSlashDate('13/01/24', 'dmy'), '2024-01-13')
    assert.equal(parseSlashDate('13-01-2024', 'dmy'), '2024-01-13')
    assert.equal(parseSlashDate('13/01/2024 19:30:00', 'dmy'), '2024-01-13')
    assert.equal(parseSlashDate('01-13-2024', 'mdy'), '2024-01-13')
  })

  it('rifiuta una data impossibile', () => {
    assert.equal(parseSlashDate('32/01/2024', 'dmy'), null)
    assert.equal(parseSlashDate('non-una-data', 'dmy'), null)
  })
})
