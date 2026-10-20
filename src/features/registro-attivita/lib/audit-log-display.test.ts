import { auditRecordHref, buildAuditDiff, formatAzione, formatCampo, formatTabella } from './audit-log-display'

describe('audit log display', () => {
  it('labels actions, tables and fields', () => {
    expect(formatAzione('UPDATE')).toBe('Modifica')
    expect(formatAzione('LOGIN')).toBe('Accesso')
    expect(formatTabella('cast_esterno')).toBe('Cast esterno')
    expect(formatTabella('nuova_tabella')).toBe('nuova_tabella')
    expect(formatCampo('luogo_nascita')).toBe('Luogo nascita')
  })

  it('shows only changed fields for updates', () => {
    expect(
      buildAuditDiff({
        azione: 'UPDATE',
        campi_modificati: ['luogo_nascita', 'is_rasi'],
        old_data: { luogo_nascita: null, is_rasi: false },
        new_data: { luogo_nascita: 'Roma', is_rasi: true },
      }),
    ).toEqual([
      { campo: 'luogo_nascita', prima: '—', dopo: 'Roma' },
      { campo: 'is_rasi', prima: 'No', dopo: 'Sì' },
    ])
  })

  it('lists filled fields of deleted rows without technical ids', () => {
    expect(
      buildAuditDiff({
        azione: 'DELETE',
        campi_modificati: null,
        old_data: { id: 'x', nome: 'Mario', personaggio: null, ordine: 0 },
        new_data: null,
      }),
    ).toEqual([
      { campo: 'nome', prima: 'Mario', dopo: '—' },
      { campo: 'ordine', prima: '0', dopo: '—' },
    ])
  })

  it('links to the related scheda', () => {
    expect(auditRecordHref({ azione: 'INSERT', tabella: 'partecipazioni', artista_id: 'a', opera_id: 'o' })).toBe('/dashboard/opere/o')
    expect(auditRecordHref({ azione: 'UPDATE', tabella: 'artisti_note', artista_id: 'a', opera_id: null })).toBe('/dashboard/artisti/a')
    expect(auditRecordHref({ azione: 'DELETE', tabella: 'artisti', artista_id: 'a', opera_id: null })).toBeNull()
    expect(auditRecordHref({ azione: 'LOGIN', tabella: 'utenti', artista_id: null, opera_id: null })).toBeNull()
  })
})
