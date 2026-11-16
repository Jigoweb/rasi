'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { DashboardBreadcrumbs } from '@/shared/components/dashboard-breadcrumbs'
import { useAuth } from '@/shared/contexts/auth-context'
import { getErrorMessage } from '@/shared/lib/toast'
import { listOpereDaApprovare, type OperaDaApprovare } from '@/features/approvazioni/services/approvazioni.service'

function formatData(value: string): string {
  return new Date(value).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * «Da approvare»: opere con modifiche di Operatore base o Tirocinante non
 * ancora riviste da un Operatore pro (fase 2b, revisione e validazione).
 */
export default function ApprovazioniPage() {
  const { isStaff, loading: authLoading } = useAuth()
  const [opere, setOpere] = useState<OperaDaApprovare[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: loadError } = await listOpereDaApprovare()
    setLoading(false)
    if (loadError) {
      setError(getErrorMessage(loadError))
      return
    }
    setError(null)
    setOpere(data)
  }, [])

  useEffect(() => {
    if (!authLoading && isStaff) void load()
  }, [authLoading, isStaff, load])

  if (!authLoading && !isStaff) {
    return <p className="text-sm text-muted-foreground">Solo amministratori e Operatori pro rivedono le modifiche.</p>
  }

  return (
    <div className="space-y-6">
      <DashboardBreadcrumbs items={[{ label: 'Da approvare' }]} />
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <ClipboardCheck className="h-7 w-7" />
          Da approvare
        </h1>
        <p className="text-gray-600">
          Opere modificate da Operatori base e Tirocinanti. Rivedi le modifiche, ripristina quelle sbagliate e valida l&apos;opera.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Opere in attesa</CardTitle>
          <CardDescription>{loading ? 'Caricamento…' : `${opere.length} opere`}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Caricamento
            </div>
          ) : opere.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna modifica da rivedere.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opera</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Modifiche</TableHead>
                  <TableHead>Autori</TableHead>
                  <TableHead>Ultima modifica</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opere.map((opera) => (
                  <TableRow key={opera.opera_id}>
                    <TableCell>
                      <Link href={`/dashboard/approvazioni/${opera.opera_id}`} className="font-medium hover:underline">
                        {opera.titolo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{opera.stato_validazione === 'validato' ? 'Validata' : 'Da validare'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{opera.modifiche}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{opera.autori.join(', ')}</TableCell>
                    <TableCell className="text-sm">{formatData(opera.ultima_modifica)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
