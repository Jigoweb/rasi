import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import RipartizioneDettaglioPage from './page'
import {
  avviaCalcolo,
  cambiaStato,
  statoCalcolo,
} from '@/features/ripartizioni/services/ripartizioni.service'

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'cr-1' }),
  useRouter: () => ({ push: jest.fn() }),
}))

let mockRole = 'admin'
jest.mock('@/shared/contexts/auth-context', () => {
  const { getRolePermissions } = jest.requireActual('@/shared/lib/auth-permissions')
  return { useAuth: () => ({ userRole: mockRole, loading: false, ...getRolePermissions(mockRole) }) }
})

let mockCampagna: Record<string, unknown> = {}
jest.mock('@/shared/lib/supabase', () => {
  const builder = (table: string) => {
    const q: any = {
      select: () => q,
      eq: () => q,
      single: async () => ({ data: table === 'campagne_ripartizione' ? mockCampagna : null, error: null }),
      maybeSingle: async () => ({ data: { nome: 'NETFLIX' }, error: null }),
    }
    return q
  }
  return { supabase: { from: (t: string) => builder(t) } }
})

jest.mock('@/features/ripartizioni/services/ripartizioni.service', () => ({
  listaSorgenti: jest.fn(async () => [{ id: 'ci-1', nome: 'Individuazione Netflix 2024', anno: 2024 }]),
  totaliPerArtista: jest.fn(async () => [
    { artistaId: 'a1', nome: 'Mario Rossi', nomeArte: null, numeroIndividuazioni: 3, importo: 120.5, perCategoria: { primario: { righe: 3, importo: 120.5 } } },
  ]),
  totaliPerConfronto: jest.fn(() => []),
  ultimoCalcolo: jest.fn(async () => null),
  avviaCalcolo: jest.fn(async () => 'job-1'),
  statoCalcolo: jest.fn(async () => ({ id: 'job-1', stato: 'running', fase: 'calcolo', righe_lette: 10, righe_scritte: 0, error: null })),
  cambiaStato: jest.fn(async () => undefined),
  esportaExcel: jest.fn(async () => undefined),
  listaEmittenti: jest.fn(async () => []),
  listaIndividuazioniDisponibili: jest.fn(async () => []),
  salvaCampagnaRipartizione: jest.fn(),
}))

const base = {
  id: 'cr-1',
  nome: 'Netflix 2024',
  descrizione: null,
  importo_totale_disponibile: 35000,
  emittente_id: 'em-1',
  anno: 2024,
  modalita: 'od_views',
  parametri_id: null,
  data_calcolo: '2026-11-23T10:00:00Z',
  data_approvazione: null,
  data_distribuzione: null,
  periodo_riferimento_inizio: '2024-01-01',
  periodo_riferimento_fine: '2024-12-31',
  configurazione_calcolo: {},
  created_at: null,
  created_by: null,
  updated_at: null,
  statistiche_calcolo: {
    modalita: 'od_views',
    fondo: 35000,
    utilizzazioni: 1891,
    artisti: 52,
    escluse: { senza_categoria: 0, tetto_ruoli: 0 },
    quoteLineari: null,
    totaleViews: 1000,
    righeViewsMancanti: 0,
    totaleRicavi: null,
    quotaPerUnita: 35,
    totalePrima: 6887,
    totaleSeconda: 9000,
    restoPerUtilizzazione: 10.1,
    totaleBonusDirezione: 100,
    minimo: { soglia: 1.5, valore: 10.2, righe: 0 },
    totalePrimaDelRicalcolo: 35000,
    coefficienteRicalcolo: 1,
    totaleFinale: 35000,
    avvisi: ['Nessuna opera oltre i 60 minuti: la quota del 9% rientra nel resto.'],
  },
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRole = 'admin'
  mockCampagna = { ...base, stato: 'calcolata' }
})

describe('Dettaglio ripartizione', () => {
  it('mostra riepilogo, importi per artista e approva con conferma', async () => {
    const user = userEvent.setup()
    render(<RipartizioneDettaglioPage />)

    expect(await screen.findByText('Mario Rossi')).toBeInTheDocument()
    expect(screen.getByText('Dati conteggi')).toBeInTheDocument()
    expect(screen.getByText('Individuazione Netflix 2024')).toBeInTheDocument()
    expect(screen.getByText(/rientra nel resto/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Approva' }))
    await user.click(await screen.findByRole('button', { name: 'Approva' }))
    await waitFor(() => expect(cambiaStato).toHaveBeenCalledWith('cr-1', 'approvata'))
  })

  it('avvia il calcolo e mostra l’avanzamento', async () => {
    const user = userEvent.setup()
    render(<RipartizioneDettaglioPage />)
    await user.click(await screen.findByRole('button', { name: 'Ricalcola' }))
    expect(avviaCalcolo).toHaveBeenCalledWith('cr-1')
    await waitFor(() => expect(statoCalcolo).toHaveBeenCalledWith('job-1'))
    expect(await screen.findByRole('status')).toHaveTextContent('Calcolo in corso')
  })

  it('l’Operatore pro calcola ma non approva', async () => {
    mockRole = 'operatore'
    render(<RipartizioneDettaglioPage />)
    expect(await screen.findByRole('button', { name: 'Ricalcola' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approva' })).not.toBeInTheDocument()
  })

  it('una ripartizione approvata non si ricalcola né si modifica', async () => {
    mockCampagna = { ...base, stato: 'approvata', data_approvazione: '2026-11-23T11:00:00Z' }
    render(<RipartizioneDettaglioPage />)
    expect(await screen.findByRole('button', { name: 'Revoca approvazione' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /calcola/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Modifica' })).not.toBeInTheDocument()
  })

  it('l’Operatore base vede i risultati in sola lettura', async () => {
    mockRole = 'operatore_base'
    render(<RipartizioneDettaglioPage />)
    expect(await screen.findByText('Mario Rossi')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /calcola/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Esporta Excel' })).toBeInTheDocument()
  })
})
