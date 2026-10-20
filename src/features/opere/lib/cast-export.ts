import { formatRuoloPrimarieta } from './cast-esterno'

/** Righe Excel del cast di un'opera: partecipazioni RASI + cast esterno inserito dagli operatori. */

type EpisodioExport = {
  numero_stagione: number | null
  numero_episodio: number | null
  titolo_episodio: string | null
} | null

export type PartecipazioneExport = {
  personaggio: string | null
  note: string | null
  artisti: { nome: string | null; cognome: string | null; nome_arte: string | null; codice_ipn?: string | null } | null
  ruoli_tipologie: { nome: string | null } | null
  episodi: EpisodioExport
}

export type CastEsternoExport = {
  nome: string
  personaggio: string | null
  primarieta: string
  ruolo?: string | null
  episodio_id: string | null
}

export type EpisodioRefExport = NonNullable<EpisodioExport> & { id: string }

export type CastExportRow = {
  Tipo: 'RASI' | 'Esterno'
  Nome: string
  "Nome d'arte": string
  'Codice IPN': string
  Ruolo: string
  Personaggio: string
  Stagione: number | ''
  Episodio: number | ''
  'Titolo episodio': string
  Note: string
}

function episodioFields(episodio: EpisodioExport): Pick<CastExportRow, 'Stagione' | 'Episodio' | 'Titolo episodio'> {
  return {
    Stagione: episodio?.numero_stagione ?? '',
    Episodio: episodio?.numero_episodio ?? '',
    'Titolo episodio': episodio?.titolo_episodio ?? '',
  }
}

export function buildCastExportRows(
  partecipazioni: PartecipazioneExport[],
  castEsterno: CastEsternoExport[],
  episodi: EpisodioRefExport[] = [],
): CastExportRow[] {
  const episodiById = new Map(episodi.map((episodio) => [episodio.id, episodio]))

  const rasi: CastExportRow[] = partecipazioni.map((p) => ({
    Tipo: 'RASI',
    Nome: [p.artisti?.nome, p.artisti?.cognome].filter(Boolean).join(' '),
    "Nome d'arte": p.artisti?.nome_arte ?? '',
    'Codice IPN': p.artisti?.codice_ipn ?? '',
    Ruolo: p.ruoli_tipologie?.nome ?? '',
    Personaggio: p.personaggio ?? '',
    ...episodioFields(p.episodi),
    Note: p.note ?? '',
  }))

  const esterni: CastExportRow[] = castEsterno.map((c) => ({
    Tipo: 'Esterno',
    Nome: c.nome,
    "Nome d'arte": '',
    'Codice IPN': '',
    Ruolo: formatRuoloPrimarieta(c.ruolo, c.primarieta),
    Personaggio: c.personaggio ?? '',
    ...episodioFields(c.episodio_id ? episodiById.get(c.episodio_id) ?? null : null),
    Note: '',
  }))

  const num = (value: number | '') => (value === '' ? -1 : value)
  return [...rasi, ...esterni].sort(
    (a, b) =>
      num(a.Stagione) - num(b.Stagione) ||
      num(a.Episodio) - num(b.Episodio) ||
      (a.Tipo === b.Tipo ? 0 : a.Tipo === 'RASI' ? -1 : 1) ||
      a.Nome.localeCompare(b.Nome, 'it'),
  )
}

export function castExportFileName(titolo: string | null | undefined, today = new Date()): string {
  const slug = (titolo || 'opera')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `cast_${slug || 'opera'}_${today.toISOString().slice(0, 10)}.xlsx`
}
