import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { CastImportActions } from './cast-import-actions'

describe('CastImportActions', () => {
  it('shows the Italian actions and the preview rules', async () => {
    const user = userEvent.setup()
    render(<CastImportActions operaId="op1" onImported={() => undefined} />)

    expect(screen.getByRole('button', { name: 'Scarica template cast' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Importa cast' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('Nulla viene scritto prima della conferma')
    expect(screen.getByRole('dialog')).toHaveTextContent('Non si creano episodi né schede artista')
    expect(screen.getByRole('button', { name: 'Conferma importazione' })).toBeDisabled()
  })

  it('evidenzia il conflitto e rivalida la correzione prima della conferma', async () => {
    const user = userEvent.setup()
    const preview = {
      mode: 'preview',
      ruoli: ['Comprimario', 'Protagonista Primario'],
      summary: { valid: 0, excluded: 0, skipped: 1, partecipazioni: 0, castEsterno: 0, aggiornamenti: 0 },
      rows: [{
        rowNumber: 2,
        nome: 'Mario',
        cognome: 'Bianchi',
        ipn: 'IPN1',
        ruolo: 'Comprimario',
        stagione: null,
        episodio: null,
        status: 'skipped',
        action: null,
        alert: 'IPN corrisponde a un altro artista',
        detail: null,
        included: false,
        proposta: null,
        castEsternoId: null,
        flagged: true,
      }],
    }
    const corrected = {
      ...preview,
      mode: 'revalidate',
      summary: { valid: 1, excluded: 0, skipped: 0, partecipazioni: 1, castEsterno: 0, aggiornamenti: 0 },
      rows: [{
        ...preview.rows[0],
        cognome: 'Rossi',
        status: 'valid',
        action: 'partecipazione',
        alert: null,
        detail: 'Artista RASI',
        included: true,
        flagged: false,
      }],
    }
    global.fetch = jest.fn(async (_url: string, init?: RequestInit) => {
      if (init?.body instanceof FormData) {
        return { ok: true, json: async () => preview }
      }
      return { ok: true, json: async () => corrected }
    }) as jest.Mock

    render(<CastImportActions operaId="op1" onImported={() => undefined} />)
    await user.click(screen.getByRole('button', { name: 'Importa cast' }))
    const file = new File(['Nome'], 'cast.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText('File template cast'), file)

    expect(await screen.findByText('IPN corrisponde a un altro artista')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Includi riga 2' })).toBeDisabled()
    await user.clear(screen.getByLabelText('Cognome riga 2'))
    await user.type(screen.getByLabelText('Cognome riga 2'), 'Rossi')

    expect(await screen.findByText('Partecipazione RASI')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Includi riga 2' })).toBeEnabled()
    const calls = (global.fetch as jest.Mock).mock.calls
    const revalidate = calls.find((call) => String(call[1]?.body || '').includes('"mode":"revalidate"'))
    expect(revalidate).toBeTruthy()
    expect(calls.some((call) => String(call[1]?.body || '').includes('"mode":"commit"'))).toBe(false)
  })

  it('mostra il selettore degli omonimi esterni senza ruolo', async () => {
    const user = userEvent.setup()
    const preview = {
      mode: 'preview',
      ruoli: ['Comprimario'],
      summary: { valid: 1, excluded: 0, skipped: 0, partecipazioni: 0, castEsterno: 0, aggiornamenti: 1 },
      rows: [{
        rowNumber: 2,
        nome: 'Giulia',
        cognome: 'Bianchi',
        ipn: '',
        ruolo: 'Comprimario',
        stagione: null,
        episodio: null,
        status: 'valid',
        action: 'update_cast_esterno',
        alert: 'Duplicato: più persone del cast esterno senza ruolo hanno questo nome in questo ambito. Scegli quale riga aggiornare.',
        detail: 'Aggiorna la persona scelta tra gli omonimi già inseriti a mano',
        included: true,
        proposta: 'aggiorna',
        castEsternoId: 'ext-a',
        flagged: true,
        candidati: [
          { id: 'ext-a', nome: 'Giulia Bianchi', codice_ipn: null, personaggio: 'Anna' },
          { id: 'ext-b', nome: 'Giulia Bianchi', codice_ipn: null, personaggio: null },
        ],
      }],
    }
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => preview })) as jest.Mock

    render(<CastImportActions operaId="op1" onImported={() => undefined} />)
    await user.click(screen.getByRole('button', { name: 'Importa cast' }))
    await user.upload(screen.getByLabelText('File template cast'), new File(['Nome'], 'cast.csv', { type: 'text/csv' }))

    expect(await screen.findByText(/Scegli quale riga aggiornare/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Persona da aggiornare riga 2' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Azione riga 2' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Includi riga 2' })).toBeEnabled()
  })
})
