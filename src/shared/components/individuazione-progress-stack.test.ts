import {
  FLOATING_PROGRESS_MAX_VISIBLE,
  selectFloatingProcesses,
} from './individuazione-progress-stack'

describe('selectFloatingProcesses', () => {
  const processes = [
    { status: 'completed', id: 'a' },
    { status: 'processing', id: 'b' },
    { status: 'completed', id: 'c' },
    { status: 'processing', id: 'd' },
    { status: 'error', id: 'e' },
  ]

  it('orders processing first and hides overflow when collapsed', () => {
    const result = selectFloatingProcesses(processes, FLOATING_PROGRESS_MAX_VISIBLE, false)

    expect(result.ordered.map(p => p.id)).toEqual(['b', 'd', 'a', 'c', 'e'])
    expect(result.visible.map(p => p.id)).toEqual(['b', 'd', 'a'])
    expect(result.hiddenCount).toBe(2)
  })

  it('shows all processes when expanded', () => {
    const result = selectFloatingProcesses(processes, 3, true)

    expect(result.visible).toHaveLength(5)
    expect(result.hiddenCount).toBe(0)
  })

  it('does not stack when under the limit', () => {
    const result = selectFloatingProcesses(processes.slice(0, 2), 3, false)

    expect(result.visible).toHaveLength(2)
    expect(result.hiddenCount).toBe(0)
  })
})
