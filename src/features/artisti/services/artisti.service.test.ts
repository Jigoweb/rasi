import { supabase } from '@/shared/lib/supabase'
import { getArtisti, getArtistaById, getPartecipazioniByArtistaId, createArtista, updateArtista } from './artisti.service'

const mockSingle = jest.fn()
const mockOrder = jest.fn()
const mockEq = jest.fn(() => ({
  single: mockSingle,
  order: mockOrder,
  select: mockSelect,
}))
const mockSelect = jest.fn(() => ({
  order: mockOrder,
  eq: mockEq,
  single: mockSingle,
}))
const mockInsert = jest.fn(() => ({
  select: mockSelect,
}))
const mockUpdate = jest.fn(() => ({
  eq: mockEq,
  select: mockSelect,
}))

// Mock Supabase client
jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => ({
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
    ;(supabase.from as jest.Mock).mockClear()
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
      const payload = { codice_ipn: 'IPN001', nome: 'Mario', cognome: 'Rossi' }
      const mockData = { id: 'uuid-1', ...payload }
      mockSingle.mockResolvedValue({ data: mockData, error: null })

      const { data } = await createArtista(payload as any)

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
      const payload = { nome_arte: 'M. Rossi' }
      const mockData = { id, codice_ipn: 'IPN001', nome: 'Mario', cognome: 'Rossi', nome_arte: 'M. Rossi' }
      mockSingle.mockResolvedValue({ data: mockData, error: null })

      const { data } = await updateArtista(id, payload as any)

      expect(supabase.from).toHaveBeenCalledWith('artisti')
      expect(mockUpdate).toHaveBeenCalledWith(payload)
      expect(mockEq).toHaveBeenCalledWith('id', id)
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockSingle).toHaveBeenCalled()
      expect(data).toEqual(mockData)
    })
  })
})
