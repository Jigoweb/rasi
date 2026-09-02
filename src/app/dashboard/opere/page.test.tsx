import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OperePage from './page'
import { OPERE_INCOMPLETE_OR } from '@/features/opere/services/opere.service'
import { supabase } from '@/shared/lib/supabase-client'

const mockReplace = jest.fn()
let mockSearchParams = new URLSearchParams()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn() }),
  useSearchParams: () => mockSearchParams,
}))

jest.mock('@/shared/contexts/export-process-context', () => ({
  useExportProcess: () => ({
    state: { status: 'idle', progress: null },
    startExport: jest.fn(),
  }),
  ExportProcessProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('@/shared/lib/toast', () => ({
  notifyError: jest.fn(),
  notifySuccess: jest.fn(),
}))

const createQueryBuilder = () => {
  const builder: Record<string, jest.Mock> = {}
  const methods = ['select', 'order', 'limit', 'or', 'eq', 'not', 'neq', 'is']
  for (const m of methods) {
    builder[m] = jest.fn(() => builder)
  }
  ;(builder as any).then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(resolve, reject)
  return builder
}

let queryBuilder = createQueryBuilder()

jest.mock('@/shared/lib/supabase-client', () => ({
  supabase: {
    from: jest.fn(() => queryBuilder),
  },
}))

// Radix UI requires browser APIs absent from jsdom
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

class MockPointerEvent extends Event {
  button: number
  ctrlKey: boolean
  pointerType: string
  constructor(type: string, props: PointerEventInit) {
    super(type, props)
    this.button = props.button || 0
    this.ctrlKey = props.ctrlKey || false
    this.pointerType = props.pointerType || 'mouse'
  }
}
;(window as any).PointerEvent = MockPointerEvent
window.HTMLElement.prototype.scrollIntoView = jest.fn()
window.HTMLElement.prototype.releasePointerCapture = jest.fn()
window.HTMLElement.prototype.hasPointerCapture = jest.fn()

describe('OperePage Select validation', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams()
    mockReplace.mockClear()
    queryBuilder = createQueryBuilder()
    ;(supabase.from as jest.Mock).mockImplementation(() => queryBuilder)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('opens "Nuova Opera" without Select.Item empty value error', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<OperePage />)

    const newButton = await screen.findAllByText('Nuova Opera')
    fireEvent.click(newButton[0])
    await screen.findByText('Crea Opera')

    const errorCalls = errorSpy.mock.calls.map((c) => String(c[0]))
    expect(errorCalls.some((m) => m.includes('A <Select.Item /> must have a value prop that is not an empty string'))).toBe(false)

    errorSpy.mockRestore()
  })

  it('enables incomplete Data Health filter from ?incomplete=1', async () => {
    mockSearchParams = new URLSearchParams('incomplete=1')

    render(<OperePage />)

    const chip = await screen.findByText('Incomplete (Data Health)')
    expect(queryBuilder.or).toHaveBeenCalledWith(OPERE_INCOMPLETE_OR)

    fireEvent.click(chip)
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/opere')

    await waitFor(() => {
      expect(screen.queryByText('Incomplete (Data Health)')).not.toBeInTheDocument()
    })
  })
})
