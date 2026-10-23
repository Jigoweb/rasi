import * as XLSX from 'xlsx'
import { parseTabularFile } from './tabular-file'

function xlsxBuffer(matrix: (string | number)[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(matrix)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'Foglio')
  return Buffer.from(XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer)
}

describe('parseTabularFile', () => {
  it('reads a semicolon csv and a comma csv', () => {
    const semicolon = parseTabularFile('cast.csv', Buffer.from('Nome;Cognome\nMario;Rossi\n', 'utf8'))
    const comma = parseTabularFile('cast.csv', Buffer.from('Nome,Cognome\nAnna,Verdi\n', 'utf8'))
    expect(semicolon.ok && semicolon.table.rows).toEqual([{ Nome: 'Mario', Cognome: 'Rossi' }])
    expect(comma.ok && comma.table.rows).toEqual([{ Nome: 'Anna', Cognome: 'Verdi' }])
  })

  it('strips a BOM and keeps integer cells as digits', () => {
    const buffer = xlsxBuffer([
      ['Nome', 'Episodio'],
      ['Lucia', 2],
    ])
    const parsed = parseTabularFile('cast.xlsx', buffer)
    expect(parsed.ok && parsed.table.rows).toEqual([{ Nome: 'Lucia', Episodio: '2' }])
  })

  it('rejects unsupported extensions', () => {
    const parsed = parseTabularFile('cast.xls', Buffer.from('a'))
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error).toMatch(/xlsx o \.csv/)
  })
})
