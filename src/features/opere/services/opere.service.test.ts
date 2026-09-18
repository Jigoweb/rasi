import { supabase } from '@/shared/lib/supabase-client'
import { getOpere, getOperaById, createOpera, updateOpera, deleteOpera, restoreOpera, deleteEpisodio, deletePartecipazione, deletePartecipazioniMultiple, getCatalogAuditLog, OPERE_INCOMPLETE_OR } from './opere.service'
import type { TablesInsert, TablesUpdate } from '@/shared/lib/supabase'

const mockSingle: jest.Mock = jest.fn()
const mockOrder: jest.Mock = jest.fn()
const mockSelect: jest.Mock = jest.fn()
const mockEq: jest.Mock = jest.fn()
const mockInsert: jest.Mock = jest.fn()
const mockUpdate: jest.Mock = jest.fn()
const mockOr: jest.Mock = jest.fn()
const mockIs: jest.Mock = jest.fn()
const mockNot: jest.Mock = jest.fn()
const mockRpc: jest.Mock = jest.fn()

jest.mock('@/shared/lib/supabase-client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      or: mockOr,
    })),
    rpc: (...args: unknown[]) => mockRpc(...args),
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
    mockIs.mockClear()
    mockNot.mockClear()
    mockRpc.mockClear()
    ;(supabase.from as jest.Mock).mockClear()
  })

  beforeEach(() => {
    mockEq.mockReturnValue({ single: mockSingle, order: mockOrder, select: mockSelect, or: mockOr, is: mockIs, not: mockNot, eq: mockEq })
    mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq, single: mockSingle, or: mockOr, is: mockIs, not: mockNot })
    mockIs.mockReturnValue({ order: mockOrder, eq: mockEq, or: mockOr, not: mockNot })
    mockNot.mockReturnValue({ order: mockOrder, is: mockIs, eq: mockEq, or: mockOr })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockUpdate.mockReturnValue({ eq: mockEq, select: mockSelect })
    mockOr.mockReturnValue({ order: mockOrder, eq: mockEq, is: mockIs, or: mockOr })
  })

  describe('getOpere', () => {
    it('should list only active opere by default', async () => {
      const mockData = [{ id: '1', titolo: 'Opera 1' }]
      mockOrder.mockResolvedValue({ data: mockData, error: null })

      const { data } = await getOpere()

      expect(supabase.from).toHaveBeenCalledWith('opere')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockIs).toHaveBeenCalledWith('deleted_at', null)
      expect(mockOrder).toHaveBeenCalledWith('anno_produzione', { ascending: false })
      expect(data).toEqual(mockData)
    })

    it('applies incomplete OR matching Data Health when incomplete=true', async () => {
      mockOrder.mockReturnValue({ or: mockOr, eq: mockEq })
      mockOr.mockResolvedValue({ data: [], error: null })

      await getOpere({ incomplete: true })

      expect(mockOr).toHaveBeenCalledWith(OPERE_INCOMPLETE_OR)
    })

    it('treats missing regia and series without episodes as incomplete matching data', () => {
      expect(OPERE_INCOMPLETE_OR).toContain('regista.is.null')
      expect(OPERE_INCOMPLETE_OR).toContain('regista.eq.{}')
      expect(OPERE_INCOMPLETE_OR).toContain('tipo.eq.serie_tv')
      expect(OPERE_INCOMPLETE_OR).toContain('has_episodes.eq.false')
    })

    it('should list only removed opere when deleted is removed', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      await getOpere({ deleted: 'removed' })

      expect(mockNot).toHaveBeenCalledWith('deleted_at', 'is', null)
      expect(mockIs).not.toHaveBeenCalled()
    })
  })

  describe('deleteOpera', () => {
    it('should soft-delete via RPC without deleting individuazioni', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      const { error } = await deleteOpera('uuid-1')

      expect(mockRpc).toHaveBeenCalledWith('soft_delete_opera', { p_id: 'uuid-1' })
      expect(error).toBeNull()
    })
  })

  describe('restoreOpera', () => {
    it('should restore via RPC', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      const { error } = await restoreOpera('uuid-1')

      expect(mockRpc).toHaveBeenCalledWith('restore_opera', { p_id: 'uuid-1' })
      expect(error).toBeNull()
    })
  })

  describe('deleteEpisodio', () => {
    it('should soft-delete via RPC', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      await deleteEpisodio('ep-1')

      expect(mockRpc).toHaveBeenCalledWith('soft_delete_episodio', { p_id: 'ep-1' })
    })
  })

  describe('deletePartecipazione', () => {
    it('should soft-delete via RPC', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      await deletePartecipazione('p-1')

      expect(mockRpc).toHaveBeenCalledWith('soft_delete_partecipazione', { p_id: 'p-1' })
    })
  })

  describe('deletePartecipazioniMultiple', () => {
    it('should bulk soft-delete via RPC', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      await deletePartecipazioniMultiple(['p-1', 'p-2'])

      expect(mockRpc).toHaveBeenCalledWith('soft_delete_partecipazioni', { p_ids: ['p-1', 'p-2'] })
    })
  })

  describe('getCatalogAuditLog', () => {
    it('should query audit rows for an opera', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null })

      await getCatalogAuditLog('opera', 'uuid-1')

      expect(supabase.from).toHaveBeenCalledWith('catalog_audit_log')
      expect(mockEq).toHaveBeenCalledWith('entity_type', 'opera')
      expect(mockEq).toHaveBeenCalledWith('entity_id', 'uuid-1')
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
      const payload: TablesInsert<'opere'> = { codice_opera: 'OP001', titolo: 'Titolo', tipo: 'film' }
      const mockData = { id: 'uuid-1', ...payload }
      mockSingle.mockResolvedValue({ data: mockData, error: null })

      const { data } = await createOpera(payload)

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
      const payload: TablesUpdate<'opere'> = { titolo_originale: 'Originale' }
      const mockData = { id, codice_opera: 'OP001', titolo: 'Titolo', tipo: 'film', titolo_originale: 'Originale' }
      mockSingle.mockResolvedValue({ data: mockData, error: null })

      const { data } = await updateOpera(id, payload)

      expect(supabase.from).toHaveBeenCalledWith('opere')
      expect(mockUpdate).toHaveBeenCalledWith(payload)
      expect(mockEq).toHaveBeenCalledWith('id', id)
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockSingle).toHaveBeenCalled()
      expect(data).toEqual(mockData)
    })
  })
})
