import { mapImdbCreditsToCast, primarietaFromCredit } from './cast-esterno'

describe('cast esterno', () => {
  it('keeps only cast members and preserves primary vs supporting', () => {
    const rows = mapImdbCreditsToCast([
      { name: 'Nolan', categoryGroup: 'direction', castRole: null },
      { name: 'Colin Firth', categoryGroup: 'cast', isStar: true, castRole: 'Primario', character: 'Harry', id: 'nm123' },
      { name: 'Extra', categoryGroup: 'cast', isStar: false, castRole: 'Comprimario', character: '  ' },
    ])

    expect(rows).toEqual([
      {
        nome: 'Colin Firth',
        personaggio: 'Harry',
        primarieta: 'primario',
        imdb_nconst: 'nm123',
        fonte: 'imdb',
        ordine: 0,
      },
      {
        nome: 'Extra',
        personaggio: null,
        primarieta: 'comprimario',
        imdb_nconst: null,
        fonte: 'imdb',
        ordine: 1,
      },
    ])
  })

  it('defaults unmarked credits to comprimario', () => {
    expect(primarietaFromCredit({ name: 'Qualcuno' })).toBe('comprimario')
  })
})
