'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { DashboardBreadcrumbs } from '@/shared/components/dashboard-breadcrumbs'
import { useAuth } from '@/shared/contexts/auth-context'
import { getErrorMessage, notifySuccess } from '@/shared/lib/toast'
import { formatCampo } from '@/features/registro-attivita/lib/audit-log-display'
import {
  approvaModificheOpera,
  listModificheOpera,
  ripristinaModifica,
  type ModificaOperatore,
} from '@/features/approvazioni/services/approvazioni.service'
import { confermaRipristino, describeModifica } from '@/features/approvazioni/lib/approvazioni-display'

const ESITO_LABELS = { in_attesa: 'Da rivedere', approvata: 'Approvata', ripristinata: 'Ripristinata' } as const

/**
 * Revisione delle modifiche di Operatore base e Tirocinante su un'opera:
 * prima/dopo per ogni modifica, ripristino della singola modifica, poi
 * «Approva e valida» (o solo «Approva»).
 */
export default function RevisioneOperaPage() {
  const params = useParams()
  const router = useRouter()
  const operaId = Array.isArray(params?.operaId) ? params.operaId[0] : (params?.operaId as string)
  const { isStaff, loading: authLoading } = useAuth()
  const [modifiche, setModifiche] = useState<ModificaOperatore[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [daRipristinare, setDaRipristinare] = useState<ModificaOperatore | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: loadError } = await listModificheOpera(operaId)
    setLoading(false)
    if (loadError) {
      setError(getErrorMessage(loadError))
      return
    }
    setError(null)
    setModifiche(data)
  }, [operaId])

  useEffect(() => {
    if (!authLoading && isStaff && operaId) void load()
  }, [authLoading, isStaff, operaId, load])

  const viste = useMemo(() => modifiche.map((m) => ({ modifica: m, vista: describeModifica(m) })), [modifiche])
  const inAttesa = viste.filter(({ vista }) => vista.esito === 'in_attesa').length
  const titoloOpera = modifiche.find((m) => m.tabella === 'opere')?.record_label ?? 'Opera'

  const ripristina = async () => {
    if (!daRipristinare) return
    setBusy(true)
    const { error: rpcError } = await ripristinaModifica(daRipristinare.id)
    setBusy(false)
    setDaRipristinare(null)
    if (rpcError) {
      setError(getErrorMessage(rpcError))
      return
    }
    notifySuccess('Modifica ripristinata')
    await load()
  }

  const approva = async (valida: boolean) => {
    setBusy(true)
    const { data, error: rpcError } = await approvaModificheOpera(operaId, valida)
    setBusy(false)
    if (rpcError) {
      setError(getErrorMessage(rpcError))
      return
    }
    notifySuccess(valida ? `Opera validata (${data?.approvate ?? 0} modifiche approvate)` : `${data?.approvate ?? 0} modifiche approvate`)
    if (valida) router.push('/dashboard/approvazioni')
    else await load()
  }

  if (!authLoading && !isStaff) {
    return <p className="text-sm text-muted-foreground">Solo amministratori e Operatori pro rivedono le modifiche.</p>
  }

  return (
    <div className="space-y-6">
      <DashboardBreadcrumbs items={[{ label: 'Da approvare', href: '/dashboard/approvazioni' }, { label: titoloOpera }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revisione modifiche</h1>
          <p className="text-gray-600">
            <Link href={`/dashboard/opere/${operaId}`} className="hover:underline">Apri la scheda dell&apos;opera</Link>
            {' · '}
            {inAttesa} da rivedere
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy || loading || inAttesa === 0} onClick={() => void approva(false)}>
            Approva senza validare
          </Button>
          <Button disabled={busy || loading} onClick={() => void approva(true)}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Approva e valida
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Caricamento
        </div>
      ) : viste.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna modifica di Operatori base o Tirocinanti su questa opera.</p>
      ) : (
        <div className="space-y-3">
          {viste.map(({ modifica, vista }) => (
            <Card key={vista.id} className={vista.esito === 'in_attesa' ? '' : 'opacity-70'}>
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-base">{vista.titolo}</CardTitle>
                    <CardDescription>{vista.sottotitolo}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{ESITO_LABELS[vista.esito]}</Badge>
                    {vista.esito === 'in_attesa' && (
                      <Button variant="outline" size="sm" disabled={busy} onClick={() => setDaRipristinare(modifica)}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Ripristina
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {vista.diff.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun campo visibile.</p>
                ) : (
                  <table className="w-full text-sm" aria-label={`Campi di ${vista.titolo}`}>
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-1 pr-4 font-normal">Campo</th>
                        <th className="py-1 pr-4 font-normal">Prima</th>
                        <th className="py-1 font-normal">Dopo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vista.diff.map((row) => (
                        <tr key={row.campo} className="border-t align-top">
                          <td className="py-1 pr-4 font-medium">{formatCampo(row.campo)}</td>
                          <td className="py-1 pr-4 text-red-700 line-through decoration-red-300">{row.prima}</td>
                          <td className="py-1 text-green-700">{row.dopo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={daRipristinare !== null} onOpenChange={(open) => { if (!open && !busy) setDaRipristinare(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ripristinare questa modifica?</DialogTitle>
            <DialogDescription>
              {daRipristinare ? confermaRipristino(daRipristinare.azione) : ''} Se nel frattempo la riga è stata cambiata di nuovo,
              il ripristino viene annullato.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDaRipristinare(null)} disabled={busy}>Annulla</Button>
            <Button onClick={() => void ripristina()} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ripristina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
