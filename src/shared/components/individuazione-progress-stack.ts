export const FLOATING_PROGRESS_MAX_VISIBLE = 3
export const FLOATING_PROGRESS_AUTO_DISMISS_MS = 6_000

export type FloatingProcessLike = {
  status: string
  isMinimized?: boolean
}

/**
 * Ordina i processi floating privilegiando quelli in corso, poi limita
 * i card espansi a `maxVisible` quando lo stack è compresso.
 */
export function selectFloatingProcesses<T extends FloatingProcessLike>(
  processes: T[],
  maxVisible: number = FLOATING_PROGRESS_MAX_VISIBLE,
  expanded: boolean = false,
): { visible: T[]; hiddenCount: number; ordered: T[] } {
  const processing = processes.filter(process => process.status === 'processing')
  const rest = processes.filter(process => process.status !== 'processing')
  const ordered = [...processing, ...rest]

  if (expanded || ordered.length <= maxVisible) {
    return { visible: ordered, hiddenCount: 0, ordered }
  }

  return {
    visible: ordered.slice(0, maxVisible),
    hiddenCount: ordered.length - maxVisible,
    ordered,
  }
}
