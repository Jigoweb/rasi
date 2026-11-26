import {
  buildProgrammazioniExportFileName,
  fetchAllProgrammazioniForExport,
  formatProgrammazioniForExport,
} from './programmazioni-export.service'
import { listProgrammazioniByCampagnaKeyset, type ProgrammazioneRow } from './programmazioni.service'

jest.mock('./programmazioni.service', () => ({
  listProgrammazioniByCampagnaKeyset: jest.fn(),
}))

function row(overrides: Partial<ProgrammazioneRow>): ProgrammazioneRow {
  return {
    id: 'id',
    campagna_programmazione_id: 'camp',
    emittente_id: 'em',
    titolo: 'Titolo',
    processato: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('formatProgrammazioniForExport', () => {
  it('esporta i campi normalizzati', () => {
    const [out] = formatProgrammazioniForExport([
      row({
        data_trasmissione: '2024-03-01',
        ora_inizio: '21:00',
        titolo: 'MOZART IN THE JUNGLE',
        numero_stagione: 1,
        numero_episodio: 2,
        anno: 2015,
        tipo: 'serie',
        processato: true,
        errori_processamento: { motivo: 'x' },
      }),
    ])
    expect(out).toMatchObject({
      data_trasmissione: '2024-03-01',
      ora_inizio: '21:00',
      titolo: 'MOZART IN THE JUNGLE',
      numero_stagione: 1,
      numero_episodio: 2,
      anno_rilascio: 2015,
      tipo: 'serie',
      processato: 'si',
      errori_processamento: '{"motivo":"x"}',
      durata_minuti: '',
    })
  })
})

describe('fetchAllProgrammazioniForExport', () => {
  it('legge tutte le pagine e ordina per messa in onda', async () => {
    ;(listProgrammazioniByCampagnaKeyset as jest.Mock)
      .mockResolvedValueOnce({
        data: [row({ id: 'b', data_trasmissione: '2024-02-01' })],
        nextCursor: { created_at: 'x', id: 'b' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: [row({ id: 'a', data_trasmissione: '2024-01-01' })],
        nextCursor: undefined,
        error: null,
      })

    const onProgress = jest.fn()
    const { data, error } = await fetchAllProgrammazioniForExport('camp', { pageSize: 1, onProgress })

    expect(error).toBeNull()
    expect(data.map(r => r.id)).toEqual(['a', 'b'])
    expect(onProgress).toHaveBeenLastCalledWith(2)
    expect(listProgrammazioniByCampagnaKeyset).toHaveBeenCalledTimes(2)
  })
})

describe('buildProgrammazioniExportFileName', () => {
  it('rende il nome sicuro per il file', () => {
    expect(buildProgrammazioniExportFileName('RAI 1 – 2024 è', new Date('2026-11-26T10:00:00Z')))
      .toBe('programmazione_RAI_1_2024_e_2026-11-26')
  })
})
