#!/usr/bin/env node
/**
 * Normalizza le intestazioni Excel SKY (SNAKE_CASE / Primafila / CRLF)
 * verso il formato Title Case usato dalla maggioranza dei file 2015–2022.
 *
 * Uso:
 *   node scripts/normalize-sky-excel-headers.mjs \
 *     --input "/Users/matteo/Downloads/SKY" \
 *     --output "/Users/matteo/Downloads/SKY_normalized"
 *
 * Opzioni:
 *   --dry-run     Solo report, nessuna scrittura
 *   --in-place    Sovrascrive i file sorgente (crea .bak accanto)
 *   --all-sheets  Rinomina header su tutti i fogli (default: solo primo foglio)
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

/** Mapping esatto: nome sorgente → Title Case SKY */
const HEADER_MAP = {
  CANALE: 'Nome Rete',
  DATA_INIZIO: 'Data Inizio',
  ORA_INIZIO: 'Ora Inizio',
  ORE_INIZIO: 'Ora Inizio',
  DURATA: 'Durata',
  SERIE_ORIGINALE: 'Serie Programma Originale',
  SERIE_SISTEMA: 'Serie Programma Sistema',
  EPISODIO_ORIGINALE: 'Episodio Originale',
  EPISODIO_SISTEMA: 'Episodio Sistema',
  TIPOLOGIA: 'Tipologia',
  DETTAGLI: 'Dettagli',
  NAZIONALITA: 'Nazionalità',
  ANNO: 'Anno',
  REGISTA: 'Regista',
  ATTORE_PRIMARIO: 'Attore Primario',
  PRODUTTORE: 'Produttore',
}

/** Varianti con newline (es. Cielo 2015) → Title Case */
const CRLF_HEADER_MAP = {
  'Serie Programma\r\nOriginale': 'Serie Programma Originale',
  'Serie Programma\nOriginale': 'Serie Programma Originale',
  'Serie Programma\r\nSistema': 'Serie Programma Sistema',
  'Serie Programma\nSistema': 'Serie Programma Sistema',
  'Episodio\r\nOriginale': 'Episodio Originale',
  'Episodio\nOriginale': 'Episodio Originale',
  'Episodio\r\nSistema': 'Episodio Sistema',
  'Episodio\nSistema': 'Episodio Sistema',
  'Attore\r\nPrimario': 'Attore Primario',
  'Attore\nPrimario': 'Attore Primario',
}

function parseArgs(argv) {
  const args = {
    input: null,
    output: null,
    dryRun: false,
    inPlace: false,
    allSheets: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--input') args.input = argv[++i]
    else if (a === '--output') args.output = argv[++i]
    else if (a === '--dry-run') args.dryRun = true
    else if (a === '--in-place') args.inPlace = true
    else if (a === '--all-sheets') args.allSheets = true
    else if (a === '--help' || a === '-h') args.help = true
  }
  return args
}

function walkExcel(dir) {
  const out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walkExcel(p))
    else if (/\.(xlsx|xls|xlsm)$/i.test(ent.name)) out.push(p)
  }
  return out
}

function normalizeHeaderCell(value) {
  if (value == null) return value
  const raw = String(value)
  if (Object.prototype.hasOwnProperty.call(CRLF_HEADER_MAP, raw)) {
    return CRLF_HEADER_MAP[raw]
  }
  const trimmed = raw.trim()
  if (Object.prototype.hasOwnProperty.call(HEADER_MAP, trimmed)) {
    return HEADER_MAP[trimmed]
  }
  // SNAKE case-insensitive fallback
  const upper = trimmed.toUpperCase()
  if (Object.prototype.hasOwnProperty.call(HEADER_MAP, upper)) {
    return HEADER_MAP[upper]
  }
  return raw
}

function findHeaderRow(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const r = rows[i] || []
    const nonEmpty = r.filter((c) => String(c).trim() !== '')
    if (nonEmpty.length >= 2) return { index: i, cells: r }
  }
  return null
}

function wouldChange(cells) {
  const renames = []
  for (const cell of cells) {
    const next = normalizeHeaderCell(cell)
    if (next !== cell && String(cell).trim() !== '') {
      renames.push({ from: String(cell), to: String(next) })
    }
  }
  return renames
}

function applyHeaderRename(sheet, headerRowIndex, renames) {
  // Rebuild first rows and rewrite header cells by column letter
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c })
    const cell = sheet[addr]
    if (!cell) continue
    const current = cell.v == null ? '' : String(cell.v)
    const next = normalizeHeaderCell(current)
    if (next !== current) {
      sheet[addr] = { t: 's', v: next }
    }
  }
  return renames
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.input) {
    console.log(`Usage:
  node scripts/normalize-sky-excel-headers.mjs --input <dir> --output <dir>
  node scripts/normalize-sky-excel-headers.mjs --input <dir> --in-place
  node scripts/normalize-sky-excel-headers.mjs --input <dir> --output <dir> --dry-run

Flags:
  --all-sheets   Process every sheet (default: first sheet only)
  --dry-run      Report only
  --in-place     Overwrite source files (writes .bak backup first)
`)
    process.exit(args.help ? 0 : 1)
  }

  if (!args.dryRun && !args.inPlace && !args.output) {
    console.error('Specifica --output <dir> oppure --in-place (o --dry-run).')
    process.exit(1)
  }

  if (args.inPlace && args.output) {
    console.error('Usa --in-place OPPURE --output, non entrambi.')
    process.exit(1)
  }

  const inputRoot = path.resolve(args.input)
  if (!fs.existsSync(inputRoot)) {
    console.error('Input non trovato:', inputRoot)
    process.exit(1)
  }

  const files = walkExcel(inputRoot)
  let touched = 0
  let skipped = 0
  const report = []

  for (const file of files) {
    const rel = path.relative(inputRoot, file)
    const wb = XLSX.readFile(file, { cellDates: true, bookVBA: true })
    const sheetNames = args.allSheets ? wb.SheetNames : wb.SheetNames.slice(0, 1)
    let fileRenames = []
    let changed = false

    for (const sheetName of sheetNames) {
      const sheet = wb.Sheets[sheetName]
      if (!sheet) continue
      const header = findHeaderRow(sheet)
      if (!header) continue
      const renames = wouldChange(header.cells)
      if (renames.length === 0) continue
      changed = true
      fileRenames.push({ sheet: sheetName, renames })
      if (!args.dryRun) applyHeaderRename(sheet, header.index, renames)
    }

    if (!changed) {
      skipped++
      continue
    }

    touched++
    report.push({ file: rel, sheets: fileRenames })

    if (args.dryRun) continue

    if (args.inPlace) {
      const bak = file + '.bak'
      if (!fs.existsSync(bak)) fs.copyFileSync(file, bak)
      XLSX.writeFile(wb, file)
    } else {
      const outPath = path.join(path.resolve(args.output), rel)
      ensureDir(path.dirname(outPath))
      XLSX.writeFile(wb, outPath)
    }
  }

  console.log(JSON.stringify({
    input: inputRoot,
    mode: args.dryRun ? 'dry-run' : args.inPlace ? 'in-place' : 'output',
    output: args.output ? path.resolve(args.output) : null,
    totalFiles: files.length,
    rewritten: touched,
    unchanged: skipped,
    files: report,
  }, null, 2))
}

main()
