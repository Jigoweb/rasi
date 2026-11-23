import type { CategoriaRipartizione, Modalita } from './parametri'
import type { LetturaExcelRipartizione } from './excel-lettura'

export const CATEGORIA_LABELS: Record<CategoriaRipartizione, string> = {
  primario: 'Primario',
  comprimario: 'Comprimario',
  doppiatore_primario: 'Doppiatore primario',
  direzione_doppiaggio: 'Direzione doppiaggio',
  doppiatore_comprimario: 'Doppiatore comprimario',
}

export const MODALITA_LABELS: Record<Modalita, string> = {
  lineare: 'Canali lineari (73/10/9/8)',
  od_views: 'On demand per visualizzazioni',
  od_ricavi: 'On demand per ricavi',
  od_utilizzazioni: 'On demand per numero di utilizzazioni',
}

export function formatCategoria(value: string | null | undefined): string {
  return (value && CATEGORIA_LABELS[value as CategoriaRipartizione]) || value || '—'
}

export function formatModalita(value: string | null | undefined): string {
  return (value && MODALITA_LABELS[value as Modalita]) || 'Proposta dai dati al calcolo'
}

export function formatEuro(value: number | string | null | undefined, decimals = 2): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return '—'
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** Nome confrontabile: maiuscole, senza accenti né punteggiatura, parole in ordine alfabetico. */
export function chiaveNome(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ')
}

export interface TotalePiattaforma {
  artistaId: string
  nome: string
  /** Altri nomi con cui l'artista può comparire nel file (nome d'arte). */
  alias?: string[]
  importo: number
}

export interface RigaConfrontoArtista {
  nome: string
  artistaId: string | null
  file: number
  piattaforma: number
  differenza: number
  esito: 'entrambi' | 'solo_file' | 'solo_piattaforma'
}

export interface ConfrontoArtisti {
  righe: RigaConfrontoArtista[]
  totaleFile: number
  totalePiattaforma: number
  scostamento: number
  soloFile: number
  soloPiattaforma: number
}

/**
 * Confronta, artista per artista, l'Excel di RASI con i totali calcolati in
 * piattaforma. Gli artisti si abbinano per nome (o nome d'arte), ignorando
 * accenti, maiuscole e ordine di nome e cognome.
 */
export function confrontaArtisti(lettura: LetturaExcelRipartizione, totali: TotalePiattaforma[]): ConfrontoArtisti {
  const daFile = new Map<string, { nome: string; importo: number }>()
  for (const r of lettura.righe) {
    const k = chiaveNome(r.artista)
    if (!k) continue
    const v = daFile.get(k) ?? { nome: r.artista, importo: 0 }
    v.importo += r.file.finale
    daFile.set(k, v)
  }

  const righe: RigaConfrontoArtista[] = []
  const usate = new Set<string>()
  for (const t of totali) {
    const chiavi = [t.nome, ...(t.alias ?? [])].map(chiaveNome).filter(Boolean)
    const k = chiavi.find((c) => daFile.has(c) && !usate.has(c))
    if (k) {
      usate.add(k)
      const f = daFile.get(k)!.importo
      righe.push({ nome: t.nome, artistaId: t.artistaId, file: f, piattaforma: t.importo, differenza: t.importo - f, esito: 'entrambi' })
    } else {
      righe.push({ nome: t.nome, artistaId: t.artistaId, file: 0, piattaforma: t.importo, differenza: t.importo, esito: 'solo_piattaforma' })
    }
  }
  for (const [k, v] of daFile) {
    if (usate.has(k)) continue
    righe.push({ nome: v.nome, artistaId: null, file: v.importo, piattaforma: 0, differenza: -v.importo, esito: 'solo_file' })
  }
  righe.sort((a, b) => Math.abs(b.differenza) - Math.abs(a.differenza))
  const somma = (f: (r: RigaConfrontoArtista) => number) => righe.reduce((s, r) => s + f(r), 0)
  return {
    righe,
    totaleFile: somma((r) => r.file),
    totalePiattaforma: somma((r) => r.piattaforma),
    scostamento: somma((r) => Math.abs(r.differenza)),
    soloFile: righe.filter((r) => r.esito === 'solo_file').length,
    soloPiattaforma: righe.filter((r) => r.esito === 'solo_piattaforma').length,
  }
}

/** Voci del riepilogo («Dati conteggi») da mostrare ed esportare. */
export function vociRiepilogo(statistiche: unknown): { voce: string; valore: string }[] {
  const s = (statistiche ?? {}) as Record<string, any>
  if (!s || typeof s !== 'object' || s.fondo === undefined) return []
  const num = (v: unknown, d = 0) =>
    typeof v === 'number' ? v.toLocaleString('it-IT', { maximumFractionDigits: d }) : '—'
  const voci: { voce: string; valore: string }[] = [
    { voce: 'Modalità', valore: formatModalita(s.modalita) },
    { voce: 'Fondo da ripartire', valore: formatEuro(s.fondo) },
    { voce: 'Utilizzazioni', valore: num(s.utilizzazioni) },
    { voce: 'Artisti', valore: num(s.artisti) },
  ]
  if (s.escluse?.senza_categoria) voci.push({ voce: 'Righe con ruolo non ripartibile', valore: num(s.escluse.senza_categoria) })
  if (s.escluse?.tetto_ruoli) voci.push({ voce: 'Righe escluse per il tetto di 3 ruoli', valore: num(s.escluse.tetto_ruoli) })
  if (s.quoteLineari) {
    const nomi: Record<string, string> = {
      tutte: 'Quota su tutte le utilizzazioni',
      generaliste: 'Quota canali generalisti',
      oltre60: 'Quota opere oltre 60 minuti',
      primaSerata: 'Quota prima serata (19:00–23:30)',
    }
    for (const [k, q] of Object.entries(s.quoteLineari as Record<string, any>)) {
      voci.push({
        voce: `${nomi[k] ?? k} (${Math.round((q.percentuale ?? 0) * 100)}%)`,
        valore: q.assegnata ? `${formatEuro(q.importo)} su ${num(q.righe)} righe = ${formatEuro(q.perRiga, 4)} a riga` : 'non assegnata (rientra nel resto)',
      })
    }
  }
  if (s.totaleViews !== null && s.totaleViews !== undefined) voci.push({ voce: 'Totale visualizzazioni', valore: num(s.totaleViews) })
  if (s.righeViewsMancanti) {
    voci.push({ voce: 'Righe senza visualizzazioni (10% della media)', valore: `${num(s.righeViewsMancanti)} × ${num(s.viewsAssegnatePerRigaMancante, 2)}` })
  }
  if (s.totaleRicavi !== null && s.totaleRicavi !== undefined) voci.push({ voce: 'Totale ricavi', valore: formatEuro(s.totaleRicavi) })
  if (s.quotaPerUnita !== null && s.quotaPerUnita !== undefined) voci.push({ voce: 'Quota per unità', valore: num(s.quotaPerUnita, 8) })
  voci.push(
    { voce: 'Totale 1ª ripartizione', valore: formatEuro(s.totalePrima) },
    { voce: 'Totale 2ª ripartizione', valore: formatEuro(s.totaleSeconda) },
    { voce: 'Resto per utilizzazione', valore: formatEuro(s.restoPerUtilizzazione, 4) },
  )
  if (s.totaleBonusDirezione) voci.push({ voce: '+10% direzione del doppiaggio', valore: formatEuro(s.totaleBonusDirezione) })
  if (s.minimo) voci.push({ voce: `Minimo ${formatEuro(s.minimo.soglia)}: righe integrate`, valore: `${num(s.minimo.righe)} portate a ${formatEuro(s.minimo.valore, 4)}` })
  voci.push(
    { voce: 'Totale prima del ricalcolo', valore: formatEuro(s.totalePrimaDelRicalcolo) },
    { voce: 'Coefficiente di ricalcolo', valore: `${num((s.coefficienteRicalcolo ?? 0) * 100, 4)}%` },
    { voce: 'Totale da liquidare', valore: formatEuro(s.totaleFinale) },
  )
  return voci
}
