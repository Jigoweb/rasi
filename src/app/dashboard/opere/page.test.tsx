import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OperePage from './page'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('@/shared/contexts/export-process-context', () => ({
  useExportProcess: () => ({
    state: { status: 'idle', progress: null },
    startExport: jest.fn(),
  }),
  ExportProcessProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('@/shared/lib/supabase-client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          limit: jest.fn(async () => ({ data: [], error: null })),
        })),
      })),
    })),
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
})
