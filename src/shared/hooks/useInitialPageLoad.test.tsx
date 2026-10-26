import { act, renderHook } from '@testing-library/react'
import { useInitialPageLoad } from './useInitialPageLoad'

describe('useInitialPageLoad', () => {
  it('treats only the first successful load of an entity as a full-page load', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useInitialPageLoad(id),
      { initialProps: { id: 'artista-1' } },
    )

    expect(result.current.beginLoad().initial).toBe(true)

    act(() => {
      result.current.beginLoad().markLoaded()
    })

    expect(result.current.beginLoad().initial).toBe(false)

    rerender({ id: 'artista-1' })
    expect(result.current.beginLoad().initial).toBe(false)

    rerender({ id: 'opera-2' })
    expect(result.current.beginLoad().initial).toBe(true)
  })

  it('does not treat a stale load as the new entity', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useInitialPageLoad(id),
      { initialProps: { id: 'artista-1' } },
    )

    const first = result.current.beginLoad()
    rerender({ id: 'opera-2' })

    act(() => {
      first.markLoaded()
    })

    expect(result.current.beginLoad().initial).toBe(true)
  })
})
