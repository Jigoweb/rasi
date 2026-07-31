import { runBulkImportQueue } from './bulk-import-queue'

describe('runBulkImportQueue', () => {
  it('never runs more than concurrency workers at once', async () => {
    let inflight = 0
    let maxInflight = 0
    const items = [1, 2, 3, 4, 5, 6]

    await runBulkImportQueue(items, async () => {
      inflight++
      maxInflight = Math.max(maxInflight, inflight)
      await new Promise(r => setTimeout(r, 20))
      inflight--
    }, { concurrency: 3 })

    expect(maxInflight).toBeLessThanOrEqual(3)
    expect(maxInflight).toBe(3)
  })

  it('continues after an item rejects', async () => {
    const seen: number[] = []
    await runBulkImportQueue([1, 2, 3], async (n) => {
      seen.push(n)
      if (n === 2) throw new Error('boom')
    }, { concurrency: 1 })
    expect(seen).toEqual([1, 2, 3])
  })
})
