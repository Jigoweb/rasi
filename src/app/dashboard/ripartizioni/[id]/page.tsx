'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/shared/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { ArrowLeft, Calendar, Euro } from 'lucide-react'

export default function RipartizioneDettaglioPage() {
  const params = useParams()
  const router = useRouter()
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)
  const [campagna, setCampagna] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCampagna = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('campagne_ripartizione')
      .select('*')
      .eq('id', id)
      .single()
    if (!error) setCampagna(data)
    setLoading(false)
  }, [id])

  useEffect(() => { if (id) fetchCampagna() }, [id, fetchCampagna])

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
        <Card><CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
          </div>
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dettaglio Ripartizione</h1>
          <p className="text-gray-600">{campagna?.nome || ''}</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/ripartizioni')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Indietro
        </Button>
      </div>

      {campagna ? (
        <Card>
          <CardHeader><CardTitle>{campagna.nome}</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-500">Stato</div>
                <div className="mt-1"><Badge variant="outline">{campagna.stato || '—'}</Badge></div>
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
        <Card><CardContent className="p-6 text-gray-500">Campagna non trovata.</CardContent></Card>
      )}
    </div>
  )
}
