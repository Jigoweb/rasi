import { act, render, screen, within } from '@testing-library/react'
import MappingWizard from './MappingWizard'

// File misto come PLEX AVOD 2024: la prima riga è un film, gli episodi sono più sotto.
const ROWS = [
  {
    'Timestamp Month': '2024-12', 'TV/Film': 'FILM', 'Episode Name': null, 'Season Number': null,
    'Episode Number': null, 'Programme Title (Episode/Film name)': 'Late Spring', DIRECTOR: 'Yasujiro Ozu', Note: null,
  },
  {
    'Timestamp Month': '2024-12', 'TV/Film': 'SERIE', 'Episode Name': 'The Worst Night', 'Season Number': '1',
    'Episode Number': '6', 'Programme Title (Episode/Film name)': '21 Jump Street', DIRECTOR: null, Note: null,
  },
  {
    'Timestamp Month': '2024-12', 'TV/Film': 'SERIE', 'Episode Name': 'Target Practice', 'Season Number': '1',
    'Episode Number': '13', 'Programme Title (Episode/Film name)': 'Drone Wars', DIRECTOR: null, Note: null,
  },
  {
    'Timestamp Month': '2024-12', 'TV/Film': 'SERIE', 'Episode Name': 'The Gunmen', 'Season Number': '11',
    'Episode Number': '19', 'Programme Title (Episode/Film name)': 'Bonanza', DIRECTOR: null, Note: null,
  },
]

jest.mock('@/features/programmazioni/services/import-mapping.service', () => {
  const actual = jest.requireActual('@/features/programmazioni/services/import-mapping.service')
  return {
    ...actual,
    detectColumns: jest.fn(async () => {
      const columns = Object.keys(ROWS[0])
      return {
        columns,
        preview: ROWS.slice(0, 5),
        samples: actual.buildColumnSamples(ROWS, columns),
        sampleRows: ROWS,
      }
    }),
  }
})

function rowFor(column: string): HTMLElement {
  const cell = screen.getByText(column, { selector: 'td' })
  return cell.closest('tr') as HTMLElement
}

describe('MappingWizard — anteprima su file misto film/serie', () => {
  beforeEach(async () => {
    await act(async () => {
      render(
        <MappingWizard
          open
          onClose={jest.fn()}
          onSave={jest.fn()}
          prefillFile={new File(['x'], 'PLEX AVOD 2024.xlsx')}
        />,
      )
    })
  })

  it('mostra i valori degli episodi anche se la prima riga è un film', async () => {
    await screen.findByText('The Worst Night')
    expect(within(rowFor('Episode Name')).getByText('3 su 4 righe piene', { exact: false })).toBeInTheDocument()
    expect(within(rowFor('Season Number')).getByText('1')).toBeInTheDocument()
    expect(within(rowFor('Episode Number')).getByText('6')).toBeInTheDocument()
    expect(within(rowFor('Programme Title (Episode/Film name)')).getByText('Late Spring')).toBeInTheDocument()
  })

  it('segnala le colonne vuote in tutto il campione', async () => {
    await screen.findByText('The Worst Night')
    expect(within(rowFor('Note')).getByTestId('column-preview-empty')).toHaveTextContent('vuota nelle prime 4 righe')
  })

  it('propone il mapping dalle intestazioni, compreso il titolo', async () => {
    await screen.findByText('The Worst Night')
    expect(within(rowFor('Episode Name')).getByText(/suggerito dall.intestazione/)).toBeInTheDocument()
    expect(within(rowFor('Season Number')).getByText(/suggerito dall.intestazione/)).toBeInTheDocument()
    expect(within(rowFor('Episode Number')).getByText(/suggerito dall.intestazione/)).toBeInTheDocument()
    expect(within(rowFor('Timestamp Month')).queryByText(/suggerito dall.intestazione/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Mappa "titolo" per continuare/)).not.toBeInTheDocument()
  })
})
