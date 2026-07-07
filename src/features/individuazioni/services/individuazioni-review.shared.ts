import type { Individuazione } from './individuazioni.service'

export function normalizeIndividuazioneRow(row: Individuazione): Individuazione {
  const { episodi: _episodi, programmazioni: _programmazioni, ...individuazione } = row as Individuazione & {
    episodi?: unknown
    programmazioni?: unknown
  }
  return individuazione
}
