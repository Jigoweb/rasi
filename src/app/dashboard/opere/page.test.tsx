import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OperePage from './page'

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

describe('OperePage Select validation', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('opens "Nuova Opera" without Select.Item empty value error', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<OperePage />)

    const newButton = await screen.findAllByText('Nuova Opera')
    fireEvent.click(newButton[0])
    await screen.findByText('Crea')

    const errorCalls = errorSpy.mock.calls.map((c) => String(c[0]))
    expect(errorCalls.some((m) => m.includes('A <Select.Item /> must have a value prop that is not an empty string'))).toBe(false)

    errorSpy.mockRestore()
  })
})
