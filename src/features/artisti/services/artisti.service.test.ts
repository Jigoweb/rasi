import { supabase } from '@/shared/lib/supabase'
import { getArtisti, getArtistaById, getPartecipazioniByArtistaId } from './artisti.service'

const mockSingle = jest.fn()
const mockOrder = jest.fn()
const mockEq = jest.fn(() => ({
  single: mockSingle,
  order: mockOrder,
}))
const mockSelect = jest.fn(() => ({
  order: mockOrder,
  eq: mockEq,
  single: mockSingle,
}))

// Mock Supabase client
jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
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
    it('should call supabase.from("partecipazioni").select(...).eq("artist-id", artistId).order(...)', async () => {
      const artistId = '1'
      const mockData = [{ id: '1', titolo: 'Opera 1' }]
      mockOrder.mockResolvedValue({ data: mockData, error: null })

      const { data } = await getPartecipazioniByArtistaId(artistId)

      expect(supabase.from).toHaveBeenCalledWith('partecipazioni')
      expect(mockSelect).toHaveBeenCalledWith(expect.stringContaining('opere'))
      expect(mockEq).toHaveBeenCalledWith('artist-id', artistId)
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(data).toEqual(mockData)
    })
  })
})
