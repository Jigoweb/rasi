'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { useAuth } from '@/shared/contexts/auth-context'
import {
  ETICHETTA_ENTITA,
  ETICHETTA_OPERAZIONE,
  diffDaPayload,
  riepilogoBatch,
  type EntitaProposta,
  type OperazioneProposta,
} from '@/features/approvazioni/lib/modifica-payload'
import {
  approvaModifica,
  listProposteInAttesa,
  respingiModifica,
  type Proposta,
} from '@/features/approvazioni/services/proposte.service'

function formattaQuando(iso: string): string {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return iso
  return data.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
}

export function ApprovazioniQueue() {
  const { isStaff, loading } = useAuth()
  const [proposte, setProposte] = useState<Proposta[]>([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [note, setNote] = useState<Record<string, string>>({})
  const [inCorso, setInCorso] = useState<string | null>(null)

  const ricarica = useCallback(async () => {
    const { data, error } = await listProposteInAttesa()
    if (error) {
      setErrore(error.message)
      setProposte([])
      return
    }
    setErrore(null)
    setProposte(data)
  }, [])

  useEffect(() => {
    if (loading || !isStaff) {
      setCaricamento(false)
      return
    }
    let attivo = true
    setCaricamento(true)
    ricarica().finally(() => {
      if (attivo) setCaricamento(false)
    })
    return () => {
      attivo = false
    }
  }, [loading, isStaff, ricarica])

  const revisiona = async (id: string, azione: 'approva' | 'respingi') => {
    setInCorso(id)
    const nota = note[id]?.trim() || null
    const { error } = azione === 'approva'
      ? await approvaModifica(id, nota)
      : await respingiModifica(id, nota)
    setInCorso(null)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(azione === 'approva' ? 'Modifica approvata' : 'Modifica respinta')
    await ricarica()
  }

  if (loading || caricamento) {
    return <p className="text-sm text-muted-foreground">Caricamento...</p>
  }

  if (!isStaff) {
    return <p className="text-sm">Non hai i permessi per rivedere le proposte.</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Approvazioni</h1>
        <p className="text-sm text-muted-foreground">
          Modifiche proposte da Operatore base e Tirocinante. {proposte.length} in attesa.
        </p>
      </div>

      {errore && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {errore}
        </p>
      )}

      {proposte.length === 0 && !errore && (
        <p className="text-sm text-muted-foreground">Nessuna modifica in attesa.</p>
      )}

      <ul className="space-y-4">
        {proposte.map((proposta) => {
          const entita = (proposta.entita in ETICHETTA_ENTITA
            ? proposta.entita
            : 'opera') as EntitaProposta
          const operazione = (proposta.operazione in ETICHETTA_OPERAZIONE
            ? proposta.operazione
            : 'update') as OperazioneProposta
          const diff = diffDaPayload(proposta.payload)
          const batch = riepilogoBatch(proposta.payload)
          return (
            <li key={proposta.id} className="rounded-lg border bg-white p-4 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  {ETICHETTA_OPERAZIONE[operazione]} · {ETICHETTA_ENTITA[entita]}
                </p>
                <p className="text-xs text-muted-foreground">{formattaQuando(proposta.creata_il)}</p>
              </div>
              {proposta.opera_id && (
                <p className="text-sm">
                  <Link className="underline" href={`/dashboard/opere/${proposta.opera_id}`}>
                    Apri l&apos;opera
                  </Link>
                </p>
              )}
              {batch && <p className="text-sm">{batch}</p>}
              {diff.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-1 pr-3 font-medium">Campo</th>
                      <th className="py-1 pr-3 font-medium">Prima</th>
                      <th className="py-1 font-medium">Dopo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.map((campo) => (
                      <tr key={campo.campo} className="border-t">
                        <td className="py-1 pr-3">{campo.etichetta}</td>
                        <td className="py-1 pr-3">{campo.prima}</td>
                        <td className="py-1">{campo.dopo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {proposta.operazione === 'delete' && (
                <p className="text-sm">La riga verrà eliminata.</p>
              )}
              <label className="block text-sm">
                Nota per chi ha proposto (facoltativa)
                <Textarea
                  className="mt-1"
                  value={note[proposta.id] ?? ''}
                  onChange={(event) => setNote((current) => ({ ...current, [proposta.id]: event.target.value }))}
                />
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={inCorso === proposta.id}
                  onClick={() => revisiona(proposta.id, 'approva')}
                >
                  Approva
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={inCorso === proposta.id}
                  onClick={() => revisiona(proposta.id, 'respingi')}
                >
                  Respingi
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
