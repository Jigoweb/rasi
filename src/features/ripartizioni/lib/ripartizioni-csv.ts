export type RipartizioneCsvRow = {
  nome: string
  stato: string | null
  periodoInizio: string
  periodoFine: string
  importoDisponibile: string | number | null
  descrizione: string | null
}

const CSV_HEADER = [
  'Nome',
  'Stato',
  'Periodo Inizio',
  'Periodo Fine',
  'Importo Disponibile',
  'Descrizione',
] as const

/** RFC 4180: virgole, virgolette e a capo restano dentro il campo. */
export function escapeCsvField(value: unknown): string {
  if (value == null) return ''
  const text = String(value)
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function buildRipartizioniCsv(rows: readonly RipartizioneCsvRow[]): string {
  const lines = [
    CSV_HEADER.map(column => escapeCsvField(column)).join(','),
    ...rows.map(row => [
      row.nome,
      row.stato ?? '',
      row.periodoInizio,
      row.periodoFine,
      row.importoDisponibile ?? '',
      row.descrizione ?? '',
    ].map(field => escapeCsvField(field)).join(',')),
  ]

  return `\uFEFF${lines.join('\n')}`
}
