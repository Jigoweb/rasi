import fs from 'fs'
import path from 'path'
import {
  COLONNE_CONSENTITE,
  applicaPayloadEntita,
  diffCampi,
  diffDaPayload,
  filtraConsentiti,
  operazioneBatch,
  riepilogoBatch,
  validaProposta,
} from './modifica-payload'

describe('modifica-payload', () => {
  it('allinea la whitelist alla migration', () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), 'supabase/migrations/20261113115053_coda_approvazione_modifiche.sql'),
      'utf8',
    )
    const blocco = sql.slice(sql.indexOf('modifica_colonne_consentite'), sql.indexOf('modifica_espressione'))
    for (const colonne of Object.values(COLONNE_CONSENTITE)) {
      for (const colonna of colonne) {
        expect(blocco).toContain(`'${colonna}'`)
      }
    }
    expect(blocco).not.toContain('stato_validazione')
    expect(blocco).not.toContain('validato_da')
    expect(blocco).not.toContain('note_validazione')
  })

  it('tiene solo i campi cambiati e in whitelist', () => {
    const dopo = diffCampi(
      { titolo: 'Vecchio', tipo: 'film', stato_validazione: 'da_validare' },
      { titolo: 'Nuovo', tipo: 'film', stato_validazione: 'validato', sconosciuto: 'x' },
      COLONNE_CONSENTITE.opera,
    )
    expect(dopo).toEqual({ titolo: 'Nuovo' })
  })

  it('applica il payload e rifiuta un campo fuori whitelist senza toccare la riga', () => {
    const originale = { titolo: 'Vecchio', tipo: 'film' }
    const applicato = applicaPayloadEntita('opera', originale, { titolo: 'Nuovo' })
    expect(applicato.rifiutati).toEqual([])
    expect(applicato.riga).toEqual({ titolo: 'Nuovo', tipo: 'film' })
    expect(originale.titolo).toBe('Vecchio')

    const rifiutato = applicaPayloadEntita('opera', originale, { stato_validazione: 'validato' })
    expect(rifiutato.rifiutati).toEqual(['stato_validazione'])
    expect(rifiutato.riga).toEqual(originale)
  })

  it('rifiuta la proposta di eliminare un opera e un campo non consentito', () => {
    expect(validaProposta({
      entita: 'opera',
      operazione: 'delete',
    })).toEqual({ ok: false, error: 'Non si può proporre l\'eliminazione di un\'opera' })
    expect(validaProposta({
      entita: 'opera',
      operazione: 'update',
      dopo: { stato_validazione: 'validato' },
    }).ok).toBe(false)
    expect(validaProposta({
      entita: 'artista',
      operazione: 'update',
      dopo: { nome: 'Ada' },
    }).ok).toBe(false)
  })

  it('accetta un inserimento completo e un batch di episodi', () => {
    expect(validaProposta({
      entita: 'opera',
      operazione: 'insert',
      dopo: { titolo: 'Nuova', tipo: 'film' },
    })).toEqual({ ok: true })
    expect(validaProposta({
      entita: 'episodio',
      operazione: 'update',
      batch: true,
      righe: [
        {
          entita: 'episodio',
          operazione: 'insert',
          dopo: { opera_id: 'o1', numero_stagione: 1, numero_episodio: 2, titolo_episodio: 'Pilota' },
        },
        {
          entita: 'episodio',
          operazione: 'update',
          entitaId: 'e1',
          dopo: { titolo_episodio: 'Nuovo titolo' },
        },
      ],
    })).toEqual({ ok: true })
  })

  it('mostra il diff campo per campo e il riepilogo batch', () => {
    expect(diffDaPayload({
      prima: { titolo: 'Vecchio', regista: ['A'] },
      dopo: { titolo: 'Nuovo', regista: null },
    })).toEqual([
      { campo: 'titolo', etichetta: 'Titolo', prima: 'Vecchio', dopo: 'Nuovo' },
      { campo: 'regista', etichetta: 'Regia', prima: 'A', dopo: 'vuoto' },
    ])
    expect(riepilogoBatch({
      batch: true,
      righe: [
        { entita: 'cast_esterno', operazione: 'insert', dopo: { nome: 'Ada' } },
        { entita: 'partecipazione', operazione: 'insert', dopo: { artista_id: 'a' } },
        { entita: 'episodio', operazione: 'update', entitaId: 'e', dopo: { titolo_episodio: 'x' } },
      ],
    })).toBe('3 righe: 2 inserimenti, 1 modifiche')
    expect(operazioneBatch([
      { operazione: 'insert' },
      { operazione: 'update' },
    ])).toBe('update')
    expect(filtraConsentiti('partecipazione', {
      ruolo_id: 'r',
      personaggio: 'Ada',
      note: 'riservata',
      stato_validazione: 'validato',
    })).toEqual({ ruolo_id: 'r', personaggio: 'Ada' })
  })
})