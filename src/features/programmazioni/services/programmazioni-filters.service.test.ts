import {
  filterCampagneProgrammazione,
  getUniqueAnni,
  getUniqueEmittenti,
  type FilterableCampagnaProgrammazione,
} from './programmazioni-filters.service'

const campagne: FilterableCampagnaProgrammazione[] = [
  {
    id: 'c1',
    nome: 'Netflix Marzo',
    stato: 'bozza',
    anno: 2026,
    emittente_id: 'e1',
    emittenti: { nome: 'Netflix' },
  },
  {
    id: 'c2',
    nome: 'Rai 2025',
    stato: 'in_review',
    anno: 2025,
    emittente_id: 'e2',
    emittenti: { nome: 'Rai 1' },
  },
  {
    id: 'c3',
    nome: 'Netflix Archivio',
    stato: 'error',
    anno: 2025,
    emittente_id: 'e1',
    emittenti: { nome: 'Netflix' },
  },
]

describe('programmazioni filters', () => {
  it('filters by search, status, emittente, and anno', () => {
    const filtered = filterCampagneProgrammazione(campagne, {
      searchQuery: 'netflix',
      statusFilter: 'bozza',
      emittenteFilter: ['e1'],
      annoFilter: ['2026'],
    })

    expect(filtered.map(campagna => campagna.id)).toEqual(['c1'])
  })

  it('supports multiple emittenti and anni at once', () => {
    const filtered = filterCampagneProgrammazione(campagne, {
      searchQuery: '',
      statusFilter: 'all',
      emittenteFilter: ['e1', 'e2'],
      annoFilter: ['2025'],
    })

    expect(filtered.map(campagna => campagna.id).sort()).toEqual(['c2', 'c3'])
  })

  it('treats empty multi filters as all', () => {
    expect(filterCampagneProgrammazione(campagne, {
      searchQuery: 'rai',
      statusFilter: 'all',
      emittenteFilter: [],
      annoFilter: [],
    }).map(campagna => campagna.id)).toEqual(['c2'])
  })

  it('returns unique years sorted descending', () => {
    expect(getUniqueAnni(campagne)).toEqual([2026, 2025])
  })

  it('returns unique emittenti sorted by name', () => {
    expect(getUniqueEmittenti(campagne)).toEqual([
      { id: 'e1', nome: 'Netflix' },
      { id: 'e2', nome: 'Rai 1' },
    ])
  })
})
