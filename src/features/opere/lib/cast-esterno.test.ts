import {
  formatEpisodioLabel,
  formatRuoloPrimarieta,
  fromRuoloPrimarieta,
  groupCastByEpisodio,
  toRuoloPrimarieta,
  mapImdbCreditsToCast,
  primarietaFromCredit,
  suggestRuoloPerPrimarieta,
} from './cast-esterno'

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
        ruolo: 'attore',
        imdb_nconst: 'nm123',
        fonte: 'imdb',
        ordine: 0,
      },
      {
        nome: 'Extra',
        personaggio: null,
        primarieta: 'comprimario',
        ruolo: 'attore',
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

describe('suggestRuoloPerPrimarieta', () => {
  const ruoli = [
    { id: 'cp', nome: 'Comprimario Primario', categoria: 'recitazione' },
    { id: 'pp', nome: 'Protagonista Primario', categoria: 'recitazione' },
    { id: 'dop', nome: 'Doppiatore primario', categoria: 'doppiaggio' },
  ]

  it('maps primario to the protagonista role, not to a comprimario one', () => {
    expect(suggestRuoloPerPrimarieta('primario', ruoli)).toBe('pp')
  })

  it('maps comprimario to a comprimario role', () => {
    expect(suggestRuoloPerPrimarieta('comprimario', ruoli)).toBe('cp')
  })

  it('maps doppiatori to dubbing roles only', () => {
    const conDoppiaggio = [
      ...ruoli,
      { id: 'dc', nome: 'Doppiatore comprimario', categoria: 'doppiaggio' },
    ]
    expect(suggestRuoloPerPrimarieta('primario', conDoppiaggio, 'doppiatore')).toBe('dop')
    expect(suggestRuoloPerPrimarieta('comprimario', conDoppiaggio, 'doppiatore')).toBe('dc')
    expect(suggestRuoloPerPrimarieta('comprimario', ruoli, 'doppiatore')).toBeNull()
  })

  it('returns null when nothing matches', () => {
    expect(suggestRuoloPerPrimarieta('primario', [{ id: 'x', nome: 'Regia', categoria: 'direzione' }])).toBeNull()
  })
})

describe('groupCastByEpisodio', () => {
  const episodi = [
    { id: 'e2', numero_stagione: 1, numero_episodio: 2 },
    { id: 'e1', numero_stagione: 1, numero_episodio: 1, titolo_episodio: 'Pilota' },
  ]

  it('puts whole-series cast first and episodes in order', () => {
    const groups = groupCastByEpisodio(
      [
        { id: 'a', episodio_id: 'e2' },
        { id: 'b', episodio_id: null },
        { id: 'c', episodio_id: 'e1' },
      ],
      episodi,
    )
    expect(groups.map((group) => group.episodio?.id ?? null)).toEqual([null, 'e1', 'e2'])
    expect(formatEpisodioLabel(groups[1].episodio)).toBe('S1E1 – Pilota')
    expect(formatEpisodioLabel({
      id: 'e9',
      numero_stagione: 1,
      numero_episodio: 9,
      titolo_episodio: null,
      titolo_episodio_originale: 'Pilot',
    })).toBe('S1E9 – Pilot')
    expect(formatEpisodioLabel(null)).toBe('Tutta la serie')
  })
})

describe('ruolo e primarietà', () => {
  it('round-trips the combined select value', () => {
    expect(toRuoloPrimarieta('doppiatore', 'primario')).toBe('doppiatore:primario')
    expect(toRuoloPrimarieta(null, 'comprimario')).toBe('attore:comprimario')
    expect(fromRuoloPrimarieta('doppiatore:comprimario')).toEqual({ ruolo: 'doppiatore', primarieta: 'comprimario' })
    expect(formatRuoloPrimarieta('attore', 'primario')).toBe('Attore primario')
  })
})
