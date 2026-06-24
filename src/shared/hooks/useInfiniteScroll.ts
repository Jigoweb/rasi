import { useEffect, useRef } from 'react'

interface UseInfiniteScrollOptions {
  enabled: boolean
  isLoading: boolean
  onLoadMore: () => void
  rootMargin?: string
  threshold?: number
}

export function useInfiniteScroll<T extends HTMLElement>({
  enabled,
  isLoading,
  onLoadMore,
  rootMargin = '320px',
  threshold = 0,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<T | null>(null)
  const onLoadMoreRef = useRef(onLoadMore)

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])

  useEffect(() => {
    if (!enabled || isLoading || typeof IntersectionObserver === 'undefined') return

    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          onLoadMoreRef.current()
        }
      },
      { rootMargin, threshold }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, isLoading, rootMargin, threshold])

  return sentinelRef
}
