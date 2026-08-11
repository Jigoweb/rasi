/** Bar color reflects completeness only, not field impact class. */
export function completenessBarClass(percent: number): string {
  if (percent >= 100) return 'bg-emerald-600'
  if (percent >= 80) return 'bg-sky-600'
  if (percent >= 50) return 'bg-amber-500'
  return 'bg-rose-600'
}

export function completenessBadgeClass(percent: number): string {
  if (percent >= 100) return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (percent >= 80) return 'bg-sky-50 text-sky-800 border-sky-200'
  if (percent >= 50) return 'bg-amber-50 text-amber-900 border-amber-200'
  return 'bg-rose-50 text-rose-800 border-rose-200'
}
