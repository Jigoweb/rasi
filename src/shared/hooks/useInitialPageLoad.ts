import { useCallback, useRef } from 'react'

/**
 * Distinguishes the first load of an entity from a later refresh.
 *
 * Detail pages used to flip a full-page `loading` flag after every save.
 * That replaced the long page with a short placeholder, the document
 * collapsed, and the browser clamped the scroll position to the top.
 * Callers should show that placeholder only while `beginLoad().initial` is true.
 */
export function useInitialPageLoad(entityKey: string) {
  const loadedKeyRef = useRef<string | null>(null)
  const keyRef = useRef(entityKey)
  keyRef.current = entityKey

  const beginLoad = useCallback(() => {
    const key = keyRef.current
    const initial = loadedKeyRef.current !== key
    return {
      initial,
      markLoaded: () => {
        if (keyRef.current === key) loadedKeyRef.current = key
      },
    }
  }, [])

  return { beginLoad }
}
