/** Empty selection = nessun filtro (tutti). */
export function matchesMultiValueFilter(
  selected: readonly string[],
  value: string | number | null | undefined,
): boolean {
  if (selected.length === 0) return true
  if (value == null || value === '') return false
  return selected.includes(String(value))
}

export function hasMultiValueFilter(selected: readonly string[]): boolean {
  return selected.length > 0
}
