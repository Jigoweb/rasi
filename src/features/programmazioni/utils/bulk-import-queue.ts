export async function runBulkImportQueue<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
  options: { concurrency?: number } = {},
): Promise<void> {
  const concurrency = Math.max(1, options.concurrency ?? 3)
  let nextIndex = 0

  async function runOne(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++
      const item = items[index]
      try {
        await worker(item, index)
      } catch {
        // caller aggiorna stato riga; la coda non si ferma
      }
    }
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => runOne())
  await Promise.all(runners)
}
