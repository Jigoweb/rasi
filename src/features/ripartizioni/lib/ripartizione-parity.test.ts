import fs from 'fs'
import path from 'path'

/**
 * Il worker (server/, build separata) calcola le ripartizioni; l'app usa gli
 * stessi parametri e lo stesso lettore degli Excel di RASI per il confronto.
 * Le copie devono restare identiche, a parte gli import con suffisso `.js`.
 */
const root = path.resolve(__dirname, '../../../..')

function normalize(file: string): string {
  return fs
    .readFileSync(path.join(root, file), 'utf8')
    .split('\n')
    .map(line => line.replace(/^(import .* from '\.\/[a-z-]+)\.js'$/, "$1'"))
    .join('\n')
    .trim()
}

describe('copie app e worker della ripartizione', () => {
  it.each([
    ['src/features/ripartizioni/lib/parametri.ts', 'server/src/ripartizione/parametri.ts'],
    ['src/features/ripartizioni/lib/excel-lettura.ts', 'server/src/ripartizione/excel-lettura.ts'],
  ])('%s e %s sono identiche', (app, server) => {
    expect(normalize(app)).toBe(normalize(server))
  })
})
