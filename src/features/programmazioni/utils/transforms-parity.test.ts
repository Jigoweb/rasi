import fs from 'fs'
import path from 'path'

/**
 * Il worker (server/, build separata) ha una copia delle trasformazioni e del
 * parser degli anni. Se le copie divergono, l'import fatto dal worker non
 * applica quello che l'operatore ha scelto nel wizard: è successo con
 * mojibake_repair, che il worker ignorava. Le copie devono restare identiche a
 * parte l'intestazione di commento iniziale e gli import con suffisso `.js`.
 */
const root = path.resolve(__dirname, '../../../..')

function normalize(file: string): string {
  const text = fs.readFileSync(path.join(root, file), 'utf8')
  const lines = text.split('\n')
  let start = 0
  while (start < lines.length && lines[start].startsWith('//')) start += 1
  return lines
    .slice(start)
    .map(line => line.replace(/^(import .* from '\.\/[a-z-]+)\.js'$/, "$1'"))
    .join('\n')
    .trim()
}

describe('copie server delle trasformazioni import', () => {
  it.each([
    ['src/features/programmazioni/utils/transforms.ts', 'server/src/lib/transforms.ts'],
    ['src/features/programmazioni/utils/year-parse.ts', 'server/src/lib/year-parse.ts'],
  ])('%s e %s sono identiche', (app, server) => {
    expect(normalize(server)).toBe(normalize(app))
  })

  it('la conversione anno-mese è la stessa nell\'app e nel worker', () => {
    const extract = (file: string) => {
      const text = fs.readFileSync(path.join(root, file), 'utf8')
      const start = text.indexOf('export function yearMonthToFirstDay')
      const end = text.indexOf('\n}\n', start)
      return text.slice(start, end)
    }
    expect(extract('server/src/jobs/programmazioni-import-core.ts')).toBe(
      extract('src/features/programmazioni/utils/coercion.ts'),
    )
  })
})
