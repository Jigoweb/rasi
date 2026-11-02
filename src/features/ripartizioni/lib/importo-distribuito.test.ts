import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchImportoNettoDistribuito,
  sumImportoNettoDistribuito,
} from './importo-distribuito'

describe('sumImportoNettoDistribuito', () => {
  const campagne = [
    { id: 'distribuita', stato: 'distribuita' },
    { id: 'approvata', stato: 'approvata' },
    { id: 'calcolata', stato: 'calcolata' },
    { id: 'pianificata', stato: 'pianificata' },
    { id: 'vuota', stato: 'distribuita' },
  ]

  it('sums net amounts of distributed campaigns only', () => {
    const total = sumImportoNettoDistribuito(campagne, [
      { campagna_ripartizione_id: 'distribuita', importo_netto: '10.50' },
      { campagna_ripartizione_id: 'distribuita', importo_netto: 4.25 },
      { campagna_ripartizione_id: 'approvata', importo_netto: 999 },
      { campagna_ripartizione_id: 'calcolata', importo_netto: 80 },
      { campagna_ripartizione_id: 'pianificata', importo_netto: 15 },
      { campagna_ripartizione_id: 'sconosciuta', importo_netto: 7 },
    ])

    expect(total).toBe(14.75)
  })

  it('ignores the available amount and invalid net values', () => {
    const total = sumImportoNettoDistribuito(
      [{ id: 'distribuita', stato: 'distribuita', importo_totale_disponibile: 1000 } as {
        id: string
        stato: string
      }],
      [
        { campagna_ripartizione_id: 'distribuita', importo_netto: null },
        { campagna_ripartizione_id: 'distribuita', importo_netto: 'non-un-numero' },
        { campagna_ripartizione_id: 'distribuita', importo_netto: 2 },
      ],
    )

    expect(total).toBe(2)
  })

  it('returns zero when nothing has been distributed', () => {
    expect(sumImportoNettoDistribuito([], [])).toBe(0)
    expect(
      sumImportoNettoDistribuito([{ id: 'vuota', stato: 'distribuita' }], []),
    ).toBe(0)
  })
})

describe('fetchImportoNettoDistribuito', () => {
  function mockClient(pages: {
    campagne: Array<Array<{ id: string; stato: string | null }>>
    righe: Array<Array<{ campagna_ripartizione_id: string; importo_netto: unknown }>>
  }, selects: string[]) {
    const calls = { campagne: 0, righe: 0 }

    const query = (table: 'campagne_ripartizione' | 'ripartizioni') => {
      const builder = {
        select(columns: string) {
          selects.push(`${table}:${columns}`)
          return builder
        },
        order() {
          return builder
        },
        range() {
          const bucket = table === 'campagne_ripartizione' ? pages.campagne : pages.righe
          const index = table === 'campagne_ripartizione' ? calls.campagne++ : calls.righe++
          return Promise.resolve({ data: bucket[index] ?? [], error: null })
        },
      }
      return builder
    }

    return {
      from(table: string) {
        if (table !== 'campagne_ripartizione' && table !== 'ripartizioni') {
          throw new Error(`tabella inattesa: ${table}`)
        }
        return query(table)
      },
    } as unknown as SupabaseClient
  }

  it('reads net rows page by page and skips the available amount', async () => {
    const selects: string[] = []
    const fullPage = Array.from({ length: 1000 }, (_, index) => ({
      id: index === 0 ? 'distribuita' : `altra-${index}`,
      stato: index === 0 ? 'distribuita' : 'approvata',
    }))

    const total = await fetchImportoNettoDistribuito(mockClient({
      campagne: [fullPage, [{ id: 'altra-distribuita', stato: 'distribuita' }]],
      righe: [[
        { campagna_ripartizione_id: 'distribuita', importo_netto: '3.5' },
        { campagna_ripartizione_id: 'altra-distribuita', importo_netto: 1.5 },
        { campagna_ripartizione_id: 'altra-1', importo_netto: 100 },
      ]],
    }, selects))

    expect(total).toBe(5)
    expect(selects).toEqual([
      'campagne_ripartizione:id, stato',
      'campagne_ripartizione:id, stato',
      'ripartizioni:campagna_ripartizione_id, importo_netto',
    ])
    expect(selects.join(' ')).not.toContain('importo_totale_disponibile')
  })

  it('propagates read errors instead of returning a partial sum', async () => {
    const supabase = {
      from() {
        return {
          select() { return this },
          order() { return this },
          range: () => Promise.resolve({ data: null, error: { message: 'permission denied' } }),
        }
      },
    } as unknown as SupabaseClient

    await expect(fetchImportoNettoDistribuito(supabase)).rejects.toEqual({
      message: 'permission denied',
    })
  })
})
