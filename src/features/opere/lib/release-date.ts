/** Parts of a calendar date; any null means the date is not persistable as YYYY-MM-DD. */
export type ReleaseDateParts = { year: number | null; month: number | null; day: number | null }

/** Persistable ISO date only when year+month+day are all present. Never pads with 01. */
export function formatReleaseDateForDb(releaseDate: ReleaseDateParts | null | undefined): string | null {
  if (!releaseDate) return null
  const { year, month, day } = releaseDate
  if (year == null || month == null || day == null) return null
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
