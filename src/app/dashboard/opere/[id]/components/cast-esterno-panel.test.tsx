import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { CastEsternoPanel } from './cast-esterno-panel'
import {
  createCastEsterno,
  listCastEsterno,
  updateCastEsterno,
} from '@/features/opere/services/cast-esterno.service'

jest.mock('@/features/opere/services/external/imdb.service', () => ({
  getTitleCredits: jest.fn(),
}))

jest.mock('@/features/opere/services/cast-esterno.service', () => ({
  listCastEsterno: jest.fn(),
  listCastEsternoArtistiCorrispondenti: jest.fn(async () => ({ data: [{ cast_id: 'c1', artista_id: 'a1', artista_nome: 'Mario Rossi' }], error: null })),
  createCastEsterno: jest.fn(async () => ({ data: null, error: null })),
  updateCastEsterno: jest.fn(async () => ({ data: null, error: null })),
  deleteCastEsterno: jest.fn(async () => ({ error: null })),
  replaceCastEsterno: jest.fn(async () => ({ error: null })),
}))

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'c1',
  opera_id: 'op1',
  episodio_id: null,
  nome: 'Mario Rossi',
  personaggio: 'Il medico',
  primarieta: 'primario',
  ruolo: 'attore',
  imdb_nconst: null,
  fonte: 'manuale',
  ordine: 0,
  created_at: null,
  updated_at: null,
  ...overrides,
})

const episodi = [
  { id: 'e1', numero_stagione: 1, numero_episodio: 1, titolo_episodio: 'Pilota', imdb_tconst: null },
  { id: 'e2', numero_stagione: 1, numero_episodio: 2, titolo_episodio: null, imdb_tconst: null },
]

beforeAll(() => {
  // Radix Select/Dropdown in jsdom
  window.HTMLElement.prototype.scrollIntoView = jest.fn()
  window.HTMLElement.prototype.hasPointerCapture = jest.fn()
  window.HTMLElement.prototype.releasePointerCapture = jest.fn()
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('CastEsternoPanel', () => {
  it('edits name, character and primarietà of a manual entry', async () => {
    ;(listCastEsterno as jest.Mock).mockResolvedValue({ data: [row()], error: null })
    const user = userEvent.setup()
    render(<CastEsternoPanel operaId="op1" imdbTconst={null} />)

    await user.click(await screen.findByRole('button', { name: 'Azioni per Mario Rossi' }))
    await user.click(await screen.findByRole('menuitem', { name: /Modifica/ }))

    const dialog = await screen.findByRole('dialog')
    const nome = within(dialog).getByLabelText('Nome')
    await user.clear(nome)
    await user.type(nome, 'Mario Bianchi')
    const personaggio = within(dialog).getByLabelText('Personaggio')
    await user.clear(personaggio)
    await user.type(personaggio, 'Il dottore')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))

    await waitFor(() => {
      expect(updateCastEsterno).toHaveBeenCalledWith('c1', {
        nome: 'Mario Bianchi',
        personaggio: 'Il dottore',
        primarieta: 'primario',
        ruolo: 'attore',
      })
    })
  })

  it('shows an existing RASI artist with the same name', async () => {
    ;(listCastEsterno as jest.Mock).mockResolvedValue({ data: [row()], error: null })
    render(<CastEsternoPanel operaId="op1" imdbTconst={null} />)

    expect(await screen.findByText(/In anagrafica: Mario Rossi/)).toHaveAttribute('href', '/dashboard/artisti/a1')
  })

  it('groups series cast by episode', async () => {
    ;(listCastEsterno as jest.Mock).mockResolvedValue({
      data: [row({ id: 'c2', nome: 'Anna Verdi', episodio_id: 'e2' }), row({ id: 'c3', nome: 'Luca Neri' })],
      error: null,
    })
    const { container } = render(<CastEsternoPanel operaId="op1" imdbTconst={null} episodi={episodi} />)

    await screen.findByText('Anna Verdi')
    const text = container.textContent ?? ''
    // Prima il cast dell'intera serie, poi l'episodio con il suo titolo di gruppo.
    expect(text.indexOf('Luca Neri')).toBeLessThan(text.indexOf('S1E2'))
    expect(text.indexOf('S1E2')).toBeLessThan(text.indexOf('Anna Verdi'))
  })

  it('adds a whole-series entry when no episode is selected', async () => {
    ;(listCastEsterno as jest.Mock).mockResolvedValue({ data: [], error: null })
    render(<CastEsternoPanel operaId="op1" imdbTconst={null} episodi={episodi} />)

    fireEvent.change(await screen.findByLabelText('Nome cast esterno'), { target: { value: 'Paolo Gialli' } })
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi/ }))

    await waitFor(() => {
      expect(createCastEsterno).toHaveBeenCalledWith(
        'op1',
        expect.objectContaining({ nome: 'Paolo Gialli', fonte: 'manuale' }),
        null,
      )
    })
  })
})
