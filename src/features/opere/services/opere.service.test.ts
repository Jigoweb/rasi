import { supabase } from '@/shared/lib/supabase'
import { getOpere, getOperaById, createOpera, updateOpera } from './opere.service'

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
const mockOr = jest.fn(() => ({
  order: mockOrder,
  eq: mockEq,
}))

jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      or: mockOr,
    })),
  },
}))

describe('Opere Service', () => {
  afterEach(() => {
    jest.clearAllMocks()
    mockSingle.mockClear()
    mockOrder.mockClear()
    mockEq.mockClear()
    mockSelect.mockClear()
    mockInsert.mockClear()
    mockUpdate.mockClear()
    mockOr.mockClear()
    ;(supabase.from as jest.Mock).mockClear()
  })

  describe('getOpere', () => {
    it('should call supabase.from("opere").select("*").order("anno_produzione")', async () => {
      const mockData = [{ id: '1', titolo: 'Opera 1' }]
      mockOrder.mockResolvedValue({ data: mockData, error: null })

      const { data } = await getOpere()

      expect(supabase.from).toHaveBeenCalledWith('opere')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockOrder).toHaveBeenCalledWith('anno_produzione', { ascending: false })
      expect(data).toEqual(mockData)
    })
  })

  describe('getOperaById', () => {
    it('should select by id and single', async () => {
      const id = 'uuid-1'
      const mockData = { id, titolo: 'Opera 1' }
      mockSingle.mockResolvedValue({ data: mockData, error: null })

      const { data } = await getOperaById(id)

      expect(supabase.from).toHaveBeenCalledWith('opere')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', id)
      expect(mockSingle).toHaveBeenCalled()
      expect(data).toEqual(mockData)
    })
  })

  describe('createOpera', () => {
    it('should insert and return inserted row', async () => {
      const payload = { codice_opera: 'OP001', titolo: 'Titolo', tipo: 'film' }
      const mockData = { id: 'uuid-1', ...payload }
      mockSingle.mockResolvedValue({ data: mockData, error: null })

      const { data } = await createOpera(payload as any)

      expect(supabase.from).toHaveBeenCalledWith('opere')
      expect(mockInsert).toHaveBeenCalledWith(payload)
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockSingle).toHaveBeenCalled()
      expect(data).toEqual(mockData)
    })
  })

  describe('updateOpera', () => {
    it('should update by id and return updated row', async () => {
      const id = 'uuid-1'
      const payload = { titolo_originale: 'Originale' }
      const mockData = { id, codice_opera: 'OP001', titolo: 'Titolo', tipo: 'film', titolo_originale: 'Originale' }
      mockSingle.mockResolvedValue({ data: mockData, error: null })

      const { data } = await updateOpera(id, payload as any)

      expect(supabase.from).toHaveBeenCalledWith('opere')
      expect(mockUpdate).toHaveBeenCalledWith(payload)
      expect(mockEq).toHaveBeenCalledWith('id', id)
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockSingle).toHaveBeenCalled()
      expect(data).toEqual(mockData)
    })
  })
})
