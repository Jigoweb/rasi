import { alertHref, groupAlertScadenze, segnaAlertVisti, type AlertScadenza } from './alert-scadenze.service'

const alert = (tipo: string, entity_type = 'artista', entity_id = 'id-1'): AlertScadenza => ({
  alert_key: tipo,
  tipo,
  severita: 'low',
  entity_type,
  entity_id,
  titolo: 'Titolo',
  dettaglio: 'Dettaglio',
  data_riferimento: '2026-10-12',
})

describe('groupAlertScadenze', () => {
  it('groups by category in priority order and drops empty ones', () => {
    const groups = groupAlertScadenze([alert('over_80'), alert('documento_scadenza'), alert('over_80', 'artista', 'id-2')])
    expect(groups.map((group) => [group.id, group.items.length])).toEqual([
      ['documento_scadenza', 1],
      ['over_80', 2],
    ])
  })

  it('ignores unknown alert types', () => {
    expect(groupAlertScadenze([alert('sconosciuto')])).toEqual([])
  })
})

describe('alertHref', () => {
  it('links artisti and opere', () => {
    expect(alertHref({ entity_type: 'artista', entity_id: 'a' })).toBe('/dashboard/artisti/a')
    expect(alertHref({ entity_type: 'opera', entity_id: 'o' })).toBe('/dashboard/opere/o')
  })
})

describe('segnaAlertVisti', () => {
  it('upserts in batches of 500 and ignores duplicates', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null })
    const client = { from: jest.fn(() => ({ upsert })) }
    const items = Array.from({ length: 501 }, (_, i) => ({ alert_key: 'over_80', entity_id: `id-${i}` }))

    await segnaAlertVisti(client as never, items)

    expect(client.from).toHaveBeenCalledWith('alert_prese_visione')
    expect(upsert).toHaveBeenCalledTimes(2)
    expect(upsert.mock.calls[0][0]).toHaveLength(500)
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: 'alert_key,entity_id', ignoreDuplicates: true })
  })
})
