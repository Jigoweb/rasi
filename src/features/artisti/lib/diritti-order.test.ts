import dirittiCatalog from '../../../../public/diritti-artisti.json'
import {
  DIRITTI_ORDER_BY_AMBITO,
  dirittiLabelsInOrdine,
  normalizeDirittoKey,
  orderByDirittoLabel,
  orderDirittiLabels,
} from './diritti-order'

const LENDING_CATALOG = 'Art. 72, comma 1, lett. c) Art. 80, comma 2, lett. f) - AL - LLE LENDING'
const LENDING_ANAGRAFICA = 'Art. 72, comma 1, lett. c) Art. 80, comma 2, lett. f) - ALL - LLE LENDING'
const AU_BR = 'Art. 73 - AU - BR BROADCASTING'
const AV_BR = 'Art 84 comma 2 - AV - BR BROADCASTING'
const AU_CP = 'Artt. 73 e 73-bis - AU - CP COMMUNICATION TO THE PUBLIC'
const AV_MA = 'Art 84 comma 3 - AV - MA MAKING AVAILABLE'
const PP = 'Art. 15 - ALL - PP PUBLIC PERFORMANCE'
const RR = 'Art. 180-bis - ALL - RR RETRANSMISSION RIGHTS'
const ALL = 'ALL (Tutti i diritti)'

describe('diritti-order', () => {
  it('keeps the catalog lending label as AL and matches it to the anagrafica ALL spelling', () => {
    const stored = dirittiCatalog.diritti.find((d) => d.codice === 'ART_72_C1_LETTC_ART_80_C2_LETTF_AL_LLE')
    expect(stored?.nome).toBe(LENDING_CATALOG)
    expect(normalizeDirittoKey(LENDING_CATALOG)).toBe(normalizeDirittoKey(LENDING_ANAGRAFICA))
    expect(normalizeDirittoKey('ART_72_C1_LETTC_ART_80_C2_LETTF_AL_LLE')).toBe(
      normalizeDirittoKey(LENDING_ANAGRAFICA),
    )
  })

  it('orders interdisciplinare (entrambi) and leaves unknown labels, including ALL, at the end', () => {
    const reversed = [...dirittiCatalog.diritti].reverse().map((d) => d.nome)
    const ordered = orderDirittiLabels(reversed, 'entrambi')

    expect(ordered.slice(0, -1).map(normalizeDirittoKey)).toEqual(
      DIRITTI_ORDER_BY_AMBITO.entrambi.map(normalizeDirittoKey),
    )
    expect(ordered.at(-1)).toBe(ALL)
    expect(ordered).toContain(LENDING_CATALOG)
    expect(ordered).not.toContain(LENDING_ANAGRAFICA)
  })

  it('orders video (cinema) and keeps rights outside that list in their incoming order', () => {
    const ordered = orderDirittiLabels(
      [AU_CP, AV_BR, 'extra prima', AU_BR, PP, 'extra dopo', LENDING_ANAGRAFICA],
      'cinema',
    )

    expect(ordered).toEqual([
      AV_BR,
      LENDING_ANAGRAFICA,
      PP,
      AU_CP,
      'extra prima',
      AU_BR,
      'extra dopo',
    ])
  })

  it('orders musica and keeps audiovisual rights at the end in incoming order', () => {
    const ordered = orderDirittiLabels(
      [AV_MA, RR, AV_BR, AU_BR, 'voce libera', LENDING_CATALOG],
      'musica',
    )

    expect(ordered).toEqual([
      AU_BR,
      LENDING_CATALOG,
      RR,
      AV_MA,
      AV_BR,
      'voce libera',
    ])
  })

  it('does not rename either lending spelling when both are present', () => {
    const ordered = orderDirittiLabels([LENDING_ANAGRAFICA, AU_BR, LENDING_CATALOG], 'musica')
    expect(ordered).toEqual([AU_BR, LENDING_ANAGRAFICA, LENDING_CATALOG])
  })

  it('keeps the current order when the category cannot be determined', () => {
    const labels = [ALL, 'voce libera', RR]
    expect(orderDirittiLabels(labels, null)).toEqual(labels)
    expect(orderDirittiLabels(labels, undefined)).toEqual(labels)
    expect(dirittiLabelsInOrdine(labels, null)).toEqual(labels)
  })

  it('derives the category from AU/AV when ambito is empty', () => {
    expect(dirittiLabelsInOrdine([RR, AU_BR, LENDING_CATALOG], null)).toEqual([
      AU_BR,
      LENDING_CATALOG,
      RR,
    ])
    expect(dirittiLabelsInOrdine([AU_BR, AV_BR], null)).toEqual([AU_BR, AV_BR])
  })

  it('prefers the stored ambito over markers in the rights', () => {
    expect(dirittiLabelsInOrdine([AU_BR, AV_BR], 'cinema')).toEqual([AV_BR, AU_BR])
  })

  it('orders legacy codice keys without rewriting them', () => {
    expect(dirittiLabelsInOrdine({
      ART_180BIS_ALL_RR: true,
      ART_73_AU_BR: true,
      ART_72_C1_LETTC_ART_80_C2_LETTF_AL_LLE: true,
    }, 'musica')).toEqual([
      'ART_73_AU_BR',
      'ART_72_C1_LETTC_ART_80_C2_LETTF_AL_LLE',
      'ART_180BIS_ALL_RR',
    ])
  })

  it('orders catalog rows by nome and keeps rows outside the list in catalog order', () => {
    const rows = [
      { codice: 'ZZZ', nome: 'voce libera' },
      { codice: 'ART_73_AU_BR', nome: AU_BR },
      { codice: 'ART_84_C2_AV_BR', nome: AV_BR },
    ]
    expect(orderByDirittoLabel(rows, 'musica', (row) => row.nome).map((row) => row.codice)).toEqual([
      'ART_73_AU_BR',
      'ZZZ',
      'ART_84_C2_AV_BR',
    ])
  })
})
