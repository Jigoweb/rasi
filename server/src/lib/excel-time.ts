// server/src/lib/excel-time.ts
// Copia server di src/features/programmazioni/utils/excel-time.ts (build separata).
// Le due copie devono restare identiche: lo verifica transforms-parity.test.ts.
import * as XLSX from 'xlsx'

/**
 * Converte una frazione di giorno Excel in HH:MM:SS.
 * Esempio: 0.25 → "06:00:00", 0.004502314814814815 → "00:06:29".
 *
 * Accetta anche seriali con parte intera (datetime): usa solo la frazione.
 */
export function excelFractionToHHMMSS(value: number): string | null {
  if (!Number.isFinite(value)) return null
  // Parte frazionaria del giorno; gestisce anche valori negativi via modulo positivo.
  const fraction = ((value % 1) + 1) % 1
  const totalSec = Math.round(fraction * 24 * 60 * 60) % 86400
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

/**
 * SheetJS con `raw: false` formatta le celle orario senza number-format come "1/0/00",
 * perdendo la frazione numerica. Riscrive `w` in HH:MM:SS per le celle 0 ≤ v < 1
 * così `sheet_to_json({ raw: false })` espone orari Postgres-validi.
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

/**
 * Celle data e data+ora (seriale ≥ 1 con formato data). Con `raw: false` SheetJS
 * le restituisce con il formato del file, spesso ambiguo: una data con il
 * formato predefinito diventa "12/1/24" (mese/giorno/anno a due cifre) e una
 * data+ora "01/12/2024 19:30", che il riconoscimento degli orari scartava.
 * Riscrive `w` in ISO: "2024-12-01" oppure "2024-12-01 19:30:00".
 * Richiede la lettura con `cellNF: true` (serve `cell.z` per riconoscere il
 * formato data); senza formato la cella non viene toccata.
 */
export function normalizeExcelDateCells(ws: XLSX.WorkSheet): void {
  const ref = ws['!ref']
  if (!ref) return

  const range = XLSX.utils.decode_range(ref)
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      const cell = ws[addr]
      if (!cell || cell.t !== 'n' || typeof cell.v !== 'number' || cell.v < 1) continue
      const format = typeof cell.z === 'string' ? cell.z : null
      if (!format || !isDateNumberFormat(format)) continue
      const date = excelSerialToIsoDate(cell.v)
      if (!date) continue
      const hasTime = Math.abs(cell.v % 1) > 1e-9
      cell.w = hasTime ? `${date} ${excelFractionToHHMMSS(cell.v)}` : date
    }
  }
}

/**
 * Il formato numerico Excel indica una data? Cerca d o y fuori da testo tra
 * virgolette, colori/condizioni tra parentesi quadre e caratteri escapati.
 * Senza `XLSX.SSF`, che nella build ESM usata dal worker non è esportato.
 */
export function isDateNumberFormat(format: string): boolean {
  const stripped = format
    .replace(/"[^"]*"/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\\./g, '')
    .replace(/_./g, '')
  // Serve un giorno o un anno: "mm" da solo può essere minuti ([h]:mm).
  return /[dy]/i.test(stripped)
}

/** Seriale Excel → "YYYY-MM-DD" (base 1899-12-30, come excel_serial_to_iso). */
export function excelSerialToIsoDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1) return null
  const d = new Date(Date.UTC(1899, 11, 30) + Math.trunc(serial) * 86400000)
  if (Number.isNaN(d.getTime())) return null
  return [
    String(d.getUTCFullYear()).padStart(4, '0'),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
  ].join('-')
}
