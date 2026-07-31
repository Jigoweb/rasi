import * as XLSX from 'xlsx'

/**
 * Converte una frazione di giorno Excel (0 ≤ n < 1) in HH:MM:SS.
 * Esempio: 0.25 → "06:00:00".
 */
export function excelFractionToHHMMSS(value: number): string | null {
  if (!Number.isFinite(value)) return null
  const fraction = ((value % 1) + 1) % 1
  const totalSec = Math.round(fraction * 24 * 60 * 60) % 86400
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

/**
 * SheetJS con `raw: false` formatta le celle orario senza number-format come "1/0/00".
 * Riscrive `w` in HH:MM:SS per le celle 0 ≤ v < 1.
 */
export function normalizeExcelTimeFractionCells(ws: XLSX.WorkSheet): void {
  const ref = ws['!ref']
  if (!ref) return

  const range = XLSX.utils.decode_range(ref)
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      const cell = ws[addr]
      if (!cell || cell.t !== 'n' || typeof cell.v !== 'number') continue
      if (cell.v < 0 || cell.v >= 1) continue
      const formatted = excelFractionToHHMMSS(cell.v)
      if (!formatted) continue
      cell.w = formatted
      cell.z = 'hh:mm:ss'
    }
  }
}
