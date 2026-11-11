'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/shared/lib/supabase'
import { Database } from '@/shared/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { DashboardBreadcrumbs } from '@/shared/components/dashboard-breadcrumbs'
import { PageErrorState } from '@/shared/components/page-states'
import { RipartizioneStatusBadge } from '@/features/ripartizioni/components/RipartizioneStatusBadge'
import { classifyRipartizioneLoadError } from '@/features/ripartizioni/lib/ripartizione-detail-state'
import { ArrowLeft, Calendar, Euro } from 'lucide-react'

type CampagnaRipartizione = Database['public']['Tables']['campagne_ripartizione']['Row']

export default function RipartizioneDettaglioPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)
  const [campagna, setCampagna] = useState<CampagnaRipartizione | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const fetchCampagna = useCallback(async () => {
    if (!id) {
      setCampagna(null)
      setLoadFailed(false)
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadFailed(false)
    try {
      const { data, error } = await supabase
        .from('campagne_ripartizione')
        .select('*')
        .eq('id', id)
        .single()
      const outcome = classifyRipartizioneLoadError(error)
      if (outcome === 'failed') {
        console.error('Error fetching campagna ripartizione:', error)
        setCampagna(null)
        setLoadFailed(true)
      } else if (outcome === 'missing') {
        setCampagna(null)
        setLoadFailed(false)
      } else {
        setCampagna(data)
        setLoadFailed(false)
      }
    } catch (error) {
      console.error('Error fetching campagna ripartizione:', error)
      setCampagna(null)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchCampagna() }, [fetchCampagna])

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('it-IT') : '—'

  const formatImporto = (v: unknown) => {
    const n = parseFloat(String(v))
    return isNaN(n) ? '—' : `€${n.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dettaglio Ripartizione</h1>
        <Card className="gap-4 py-4"><CardContent className="px-4">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
          </div>
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardBreadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Ripartizioni', href: '/dashboard/ripartizioni' },
          { label: campagna?.nome || 'Dettaglio ripartizione' },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dettaglio Ripartizione</h1>
          <p className="text-gray-600">{campagna?.nome || ''}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/ripartizioni">
            <ArrowLeft className="h-4 w-4 mr-2" />Indietro
          </Link>
        </Button>
      </div>

      {loadFailed ? (
        <PageErrorState
          title="Non siamo riusciti a caricare la campagna"
          description="Si è verificato un errore durante la lettura del dettaglio. La campagna potrebbe esistere comunque: riprova."
          onRetry={fetchCampagna}
        />
      ) : campagna ? (
        <Card className="gap-4 py-4">
          <CardHeader><CardTitle>{campagna.nome}</CardTitle></CardHeader>
          <CardContent className="space-y-4 px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Stato</div>
                <div className="mt-1"><RipartizioneStatusBadge stato={campagna.stato} /></div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Importo Totale Disponibile</div>
                <div className="flex items-center gap-2 mt-1">
                  <Euro className="h-4 w-4 text-gray-400" />
                  <span className="font-mono font-semibold text-lg">
                    {formatImporto(campagna.importo_totale_disponibile)}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Periodo Inizio</div>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(campagna.periodo_riferimento_inizio)}</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Periodo Fine</div>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(campagna.periodo_riferimento_fine)}</span>
                </div>
              </div>
              {campagna.descrizione && (
                <div className="col-span-2">
                  <div className="text-sm font-medium text-gray-500">Descrizione</div>
                  <div className="text-sm text-gray-700 mt-1">{campagna.descrizione}</div>
                </div>
              )}
              {campagna.configurazione_calcolo && (
                <div className="col-span-2">
                  <div className="text-sm font-medium text-gray-500 mb-1">Parametri Calcolo</div>
                  <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-auto">
                    {JSON.stringify(campagna.configurazione_calcolo, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-gray-500">Creata il</div>
                <div className="mt-1 text-sm text-gray-700">
                  {campagna.created_at ? new Date(campagna.created_at).toLocaleString('it-IT') : '—'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-4 py-4"><CardContent className="px-4 text-gray-500">Campagna non trovata.</CardContent></Card>
      )}
    </div>
  )
}
