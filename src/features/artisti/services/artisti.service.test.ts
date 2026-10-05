import { supabase } from '@/shared/lib/supabase-client'
import { getArtisti, getArtistaById, getPartecipazioniByArtistaId, createArtista, updateArtista, ARTISTI_INCOMPLETE_OR } from './artisti.service'
import type { TablesInsert, TablesUpdate } from '@/shared/lib/supabase'

const mockSingle: jest.Mock = jest.fn()
const mockOrder: jest.Mock = jest.fn()
const mockSelect: jest.Mock = jest.fn()
const mockEq: jest.Mock = jest.fn()
const mockInsert: jest.Mock = jest.fn()
const mockUpdate: jest.Mock = jest.fn()
const mockOr: jest.Mock = jest.fn()
const mockNot: jest.Mock = jest.fn()
const mockIs: jest.Mock = jest.fn()
const mockNeq: jest.Mock = jest.fn()
const mockContains: jest.Mock = jest.fn()

// Mock Supabase client
jest.mock('@/shared/lib/supabase-client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    })),
  },
}))

describe('Artisti Service', () => {
  afterEach(() => {
    jest.clearAllMocks()
    mockSingle.mockClear()
    mockOrder.mockClear()
    mockEq.mockClear()
    mockSelect.mockClear()
    mockOr.mockClear()
    mockNot.mockClear()
    mockIs.mockClear()
    mockNeq.mockClear()
    mockContains.mockClear()
    ;(supabase.from as jest.Mock).mockClear()
  })

  beforeEach(() => {
    const chain = {
      single: mockSingle,
      order: mockOrder,
      select: mockSelect,
      or: mockOr,
      eq: mockEq,
      not: mockNot,
      is: mockIs,
      neq: mockNeq,
      contains: mockContains,
    }
    mockEq.mockReturnValue(chain)
    mockSelect.mockReturnValue(chain)
    mockInsert.mockReturnValue({ select: mockSelect })
    mockUpdate.mockReturnValue({ eq: mockEq, select: mockSelect })
    mockOr.mockReturnValue(chain)
    mockNot.mockReturnValue(chain)
    mockIs.mockReturnValue(chain)
    mockNeq.mockReturnValue(chain)
    mockContains.mockReturnValue(chain)
    mockOrder.mockResolvedValue({ data: [], error: null })
  })

  describe('getArtisti', () => {
    it('should call supabase.from("artisti").select("*").order("cognome")', async () => {
      const mockData = [{ id: '1', nome: 'Artista 1' }]
      mockOrder.mockResolvedValue({ data: mockData, error: null })

      const { data } = await getArtisti()

      expect(supabase.from).toHaveBeenCalledWith('artisti')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockOrder).toHaveBeenCalledWith('cognome', { ascending: true })
      expect(data).toEqual(mockData)
    })

    it('applies incomplete OR matching Data Health when incomplete=true', async () => {
      mockOrder.mockReturnValue({ or: mockOr, eq: mockEq })
      mockOr.mockResolvedValue({ data: [], error: null })

      await getArtisti({ incomplete: true })

      expect(mockOr).toHaveBeenCalledWith(ARTISTI_INCOMPLETE_OR)
    })

    it('filters by ambito value', async () => {
      mockOrder.mockReturnValue({
        eq: mockEq,
        or: mockOr,
        not: mockNot,
        is: mockIs,
      })
      mockEq.mockResolvedValue({ data: [], error: null })

      await getArtisti({ fieldFilters: [{ field: 'ambito', value: 'musica' }] })

      expect(mockEq).toHaveBeenCalledWith('ambito', 'musica')
    })

    it('filters by ambito not valorizzato', async () => {
      mockOrder.mockReturnValue({
        eq: mockEq,
        or: mockOr,
        not: mockNot,
        is: mockIs,
      })
      mockIs.mockResolvedValue({ data: [], error: null })

      await getArtisti({ fieldFilters: [{ field: 'ambito', hasValue: false }] })

      expect(mockIs).toHaveBeenCalledWith('ambito', null)
    })

    it('filters territorio by the selected value', async () => {
      mockOrder.mockReturnValue({
        eq: mockEq,
        or: mockOr,
        not: mockNot,
        is: mockIs,
        contains: mockContains,
      })
      mockEq.mockResolvedValue({ data: [], error: null })

      await getArtisti({ fieldFilters: [{ field: 'territorio', value: 'ITA+' }] })

      expect(mockEq).toHaveBeenCalledWith('territorio', 'ITA+')
    })

    it('filters diritti by the article stored on the artist', async () => {
      mockOrder.mockReturnValue({
        eq: mockEq,
        or: mockOr,
        not: mockNot,
        is: mockIs,
        contains: mockContains,
      })
      mockContains.mockResolvedValue({ data: [], error: null })

      await getArtisti({ fieldFilters: [{ field: 'diritti', value: 'Art. 73 - AU - BR BROADCASTING' }] })

      expect(mockContains).toHaveBeenCalledWith('diritti_attivi', ['Art. 73 - AU - BR BROADCASTING'])
    })

    it('filters paese by a slash-separated token', async () => {
      mockOrder.mockReturnValue({
        eq: mockEq,
        or: mockOr,
        not: mockNot,
        is: mockIs,
        contains: mockContains,
      })
      mockOr.mockResolvedValue({ data: [], error: null })

      await getArtisti({ fieldFilters: [{ field: 'codice_paese', value: 'FRA' }] })

      expect(mockOr).toHaveBeenCalledWith(
        'codice_paese.eq.FRA,codice_paese.like.FRA/%,codice_paese.like.%/FRA,codice_paese.like.%/FRA/%',
      )
    })
  })

  describe('getArtistaById', () => {
    it('should call supabase.from("artisti").select("*").eq("id", artistId).single()', async () => {
      const artistId = '1'
      const mockData = { id: '1', nome: 'Artista 1' }
      mockSingle.mockResolvedValue({ data: mockData, error: null })

      const { data } = await getArtistaById(artistId)

      expect(supabase.from).toHaveBeenCalledWith('artisti')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', artistId)
      expect(mockSingle).toHaveBeenCalled()
      expect(data).toEqual(mockData)
    })
  })

  describe('getPartecipazioniByArtistaId', () => {
    it('should call supabase.from("partecipazioni").select(...).eq("artista_id", artistId).order(...)', async () => {
      const artistId = '1'
      const mockData = [{ id: '1', titolo: 'Opera 1' }]
      mockOrder.mockResolvedValue({ data: mockData, error: null })

      const { data } = await getPartecipazioniByArtistaId(artistId)

      expect(supabase.from).toHaveBeenCalledWith('partecipazioni')
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('opere'))
      expect(mockEq).toHaveBeenCalledWith('artista_id', artistId)
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(data).toEqual(mockData)
    })
  })

  describe('createArtista', () => {
    it('should insert into artisti and return inserted row', async () => {
      const payload: TablesInsert<'artisti'> = { codice_ipn: 'IPN001', nome: 'Mario', cognome: 'Rossi' }
      const mockData = { id: 'uuid-1', ...payload }
      mockSingle.mockResolvedValue({ data: mockData, error: null })

      const { data } = await createArtista(payload)

      expect(supabase.from).toHaveBeenCalledWith('artisti')
      expect(mockInsert).toHaveBeenCalledWith(payload)
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockSingle).toHaveBeenCalled()
      expect(data).toEqual(mockData)
    })
  })

  describe('updateArtista', () => {
    it('should update artisti by id and return updated row', async () => {
      const id = 'uuid-1'
      const payload: TablesUpdate<'artisti'> = { nome_arte: 'M. Rossi' }
      const mockData = { id, codice_ipn: 'IPN001', nome: 'Mario', cognome: 'Rossi', nome_arte: 'M. Rossi' }
      mockSingle.mockResolvedValue({ data: mockData, error: null })

      const { data } = await updateArtista(id, payload)

      expect(supabase.from).toHaveBeenCalledWith('artisti')
      expect(mockUpdate).toHaveBeenCalledWith(payload)
      expect(mockEq).toHaveBeenCalledWith('id', id)
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockSingle).toHaveBeenCalled()
      expect(data).toEqual(mockData)
    })
  })
})
