import type { KeyboardEvent } from 'react'

export const clickableRowClassName =
  'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function handleClickableRowKeyDown(
  event: KeyboardEvent<HTMLElement>,
  onNavigate: () => void
) {
  if (event.key !== 'Enter' && event.key !== ' ') return

  event.preventDefault()
  onNavigate()
}
