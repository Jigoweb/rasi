import { chiaveNome, confrontaArtisti, formatCategoria, vociRiepilogo } from './ripartizione-display'
import type { LetturaExcelRipartizione } from './excel-lettura'

const lettura = (righe: { artista: string; finale: number }[]): LetturaExcelRipartizione => ({
  fogli: ['F'],
  colonne: {},
  avvisi: [],
  righe: righe.map((r, i) => ({
    foglio: 'F',
    riga: i + 2,
    categoria: 'primario',
    artista: r.artista,
    opera: 'O',
    generalista: false,
    durataMinuti: null,
    oraInizio: null,
    views: null,
    ricavi: null,
    file: { prima: null, ridotto: null, finale: r.finale },
  })),
})

describe('ripartizione · display', () => {
  it('normalizza i nomi per il confronto', () => {
    expect(chiaveNome('Rossi Mario')).toBe(chiaveNome('MARIO ROSSÌ'.replace('Ì', 'I')))
    expect(chiaveNome("D'Amico  Àlba")).toBe('ALBA AMICO D')
  })

  it('confronta per artista anche con nome d’arte e segnala chi manca', () => {
    const c = confrontaArtisti(
      lettura([
        { artista: 'ROSSI MARIO', finale: 10 },
        { artista: 'Rossi Mario', finale: 5 },
        { artista: 'ZETA', finale: 7 },
        { artista: 'Solo Nel File', finale: 3 },
      ]),
      [
        { artistaId: 'a', nome: 'Mario Rossi', importo: 14 },
        { artistaId: 'b', nome: 'Anna Bianchi', alias: ['Zeta'], importo: 7 },
        { artistaId: 'c', nome: 'Solo In Piattaforma', importo: 2 },
      ],
    )
    const rossi = c.righe.find((r) => r.artistaId === 'a')!
    expect(rossi.file).toBe(15)
    expect(rossi.differenza).toBe(-1)
    expect(c.righe.find((r) => r.artistaId === 'b')!.esito).toBe('entrambi')
    expect(c.soloFile).toBe(1)
    expect(c.soloPiattaforma).toBe(1)
    expect(c.totaleFile).toBe(25)
    expect(c.totalePiattaforma).toBe(23)
  })

  it('formatta categorie e riepilogo', () => {
    expect(formatCategoria('direzione_doppiaggio')).toBe('Direzione doppiaggio')
    expect(vociRiepilogo(null)).toEqual([])
    const voci = vociRiepilogo({
      modalita: 'lineare',
      fondo: 800,
      utilizzazioni: 185,
      artisti: 5,
      escluse: { senza_categoria: 0, tetto_ruoli: 0 },
      quoteLineari: { oltre60: { percentuale: 0.09, importo: 72, righe: 0, perRiga: 0, assegnata: false } },
      totaleViews: null,
      totaleRicavi: null,
      quotaPerUnita: null,
      totalePrima: 1,
      totaleSeconda: 2,
      restoPerUtilizzazione: 3,
      minimo: null,
      totalePrimaDelRicalcolo: 900,
      coefficienteRicalcolo: 0.8888,
      totaleFinale: 800,
    })
    expect(voci.find((v) => v.voce.startsWith('Quota opere oltre 60'))!.valore).toContain('non assegnata')
    expect(voci.at(-1)!.voce).toBe('Totale da liquidare')
  })
})
