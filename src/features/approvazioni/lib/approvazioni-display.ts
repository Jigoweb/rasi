import type { Json } from '@/shared/lib/supabase'
import { buildAuditDiff, formatAzione, formatTabella, type AuditDiffRow } from '@/features/registro-attivita/lib/audit-log-display'

export type ModificaPerRevisione = {
  id: number
  occurred_at: string
  user_email: string | null
  user_ruolo: string | null
  azione: string
  tabella: string
  record_label: string | null
  campi_modificati: string[] | null
  old_data: Json | null
  new_data: Json | null
  esito: string | null
}

export const RUOLO_AUTORE_LABELS: Record<string, string> = {
  operatore_base: 'Operatore base',
  tirocinante: 'Tirocinante',
}

/** Campi interni che il revisore non deve vedere nel confronto. */
const CAMPI_NASCOSTI = new Set(['opera_id', 'episodio_id', 'artista_id', 'ruolo_id', 'partecipazione_id', 'metadati'])

export type ModificaVista = {
  id: number
  titolo: string
  sottotitolo: string
  diff: AuditDiffRow[]
  esito: 'in_attesa' | 'approvata' | 'ripristinata'
}

/** Riga leggibile per la pagina di revisione: cosa, chi, quando, prima/dopo. */
export function describeModifica(modifica: ModificaPerRevisione): ModificaVista {
  const autore = modifica.user_email ?? 'utente sconosciuto'
  const ruolo = modifica.user_ruolo ? RUOLO_AUTORE_LABELS[modifica.user_ruolo] ?? modifica.user_ruolo : ''
  const quando = new Date(modifica.occurred_at).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const diff = buildAuditDiff(modifica).filter((row) => !CAMPI_NASCOSTI.has(row.campo))
  const esito = modifica.esito === 'approvata' || modifica.esito === 'ripristinata' ? modifica.esito : 'in_attesa'
  return {
    id: modifica.id,
    titolo: `${formatAzione(modifica.azione)} · ${formatTabella(modifica.tabella)}${modifica.record_label ? ` · ${modifica.record_label}` : ''}`,
    sottotitolo: `${autore}${ruolo ? ` (${ruolo})` : ''} · ${quando}`,
    diff,
    esito,
  }
}

/** Testo della conferma prima di ripristinare, in base all'azione. */
export function confermaRipristino(azione: string): string {
  if (azione === 'INSERT') return 'La riga creata verrà eliminata.'
  if (azione === 'DELETE') return 'La riga eliminata verrà reinserita con i valori che aveva.'
  return 'I campi torneranno ai valori precedenti.'
}
