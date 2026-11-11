import { POSTGREST_MAX_ROWS } from '@/shared/lib/postgrest-page'
import {
  PARTECIPAZIONI_PAGE_SIZE,
  parsePartecipazioniPage,
  toPartecipazioniRpcArgs,
} from './partecipazioni-page'

describe('toPartecipazioniRpcArgs', () => {
  it('chiede una pagina sotto max_rows, con offset stabile', () => {
    expect(toPartecipazioniRpcArgs({ operaId: 'op', page: 2 })).toEqual({
      p_opera_id: 'op',
      p_limit: PARTECIPAZIONI_PAGE_SIZE,
      p_offset: PARTECIPAZIONI_PAGE_SIZE,
      p_search: null,
      p_ruolo_id: null,
      p_episodio_id: null,
      p_senza_episodio: false,
    })
  })

  it('non chiede mai più di max_rows in una sola risposta', () => {
    expect(toPartecipazioniRpcArgs({ operaId: 'op', page: 1, pageSize: 13_000 }).p_limit).toBe(POSTGREST_MAX_ROWS)
  })

  it('traduce ricerca, ruolo, episodio e il cast di tutta la serie', () => {
    expect(toPartecipazioniRpcArgs({
      operaId: 'op',
      search: '  Grey ',
      ruoloId: 'ruolo-1',
      episodio: 'ep-9',
    })).toMatchObject({
      p_search: 'Grey',
      p_ruolo_id: 'ruolo-1',
      p_episodio_id: 'ep-9',
      p_senza_episodio: false,
    })

    expect(toPartecipazioniRpcArgs({ operaId: 'op', episodio: '__serie__' })).toMatchObject({
      p_episodio_id: null,
      p_senza_episodio: true,
    })
  })

  it('tratta ricerca vuota e pagina non valida come assenza di filtro sulla prima pagina', () => {
    expect(toPartecipazioniRpcArgs({ operaId: 'op', page: 0, search: '   ', ruoloId: '' })).toMatchObject({
      p_limit: PARTECIPAZIONI_PAGE_SIZE,
      p_offset: 0,
      p_search: null,
      p_ruolo_id: null,
    })
  })
})

describe('parsePartecipazioniPage', () => {
  it('tiene il totale filtrato e quello dell\'opera, non la lunghezza della pagina', () => {
    const page = parsePartecipazioniPage({
      total: 42,
      total_opera: 1551,
      rows: [{ id: 'p1' }],
    })

    expect(page.total).toBe(42)
    expect(page.totalOpera).toBe(1551)
    expect(page.rows).toHaveLength(1)
  })

  it('usa il totale filtrato se manca il totale opera e ignora un payload senza righe', () => {
    expect(parsePartecipazioniPage({ total: 7 }).totalOpera).toBe(7)
    expect(parsePartecipazioniPage(null)).toEqual({ rows: [], total: 0, totalOpera: 0 })
    expect(parsePartecipazioniPage({ rows: 'no' }).rows).toEqual([])
  })
})
