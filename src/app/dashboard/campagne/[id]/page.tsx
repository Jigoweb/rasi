'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/shared/lib/supabase'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Calendar, ArrowLeft } from 'lucide-react'

export default function CampagnaDettaglioPage() {
  const params = useParams()
  const router = useRouter()
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)
  const [campagna, setCampagna] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCampagna = useCallback(async () => {
    setLoading(true)
    // Campagne possono essere di 2 tabelle: individuazione o ripartizione
    const { data: ind, error: e1 } = await (supabase as any).from('campagne_individuazione').select('*').eq('id', id).single()
    const { data: rip, error: e2 } = await (supabase as any).from('campagne_ripartizione').select('*').eq('id', id).single()
    const data = ind ?? rip
    setCampagna(data || null)
    setLoading(false)
  }, [id])

  useEffect(() => { if (id) fetchCampagna() }, [id, fetchCampagna])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dettaglio Campagna</h1>
            <p className="text-gray-600">Caricamento dati</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dettaglio Campagna</h1>
          <p className="text-gray-600">Informazioni complete</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Indietro
          </Button>
        </div>
      </div>

      {campagna ? (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Nome Campagna</div>
                <div className="text-lg font-medium">{campagna.nome}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Stato</div>
                <div className="mt-1"><Badge variant="outline">{campagna.stato}</Badge></div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Data Inizio</div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /><span>{formatDate(campagna.data_inizio)}</span></div>
              </div>
              {campagna.data_fine && (
                <div>
                  <div className="text-sm font-medium text-gray-500">Data Fine</div>
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /><span>{formatDate(campagna.data_fine)}</span></div>
                </div>
              )}
              {campagna.descrizione && (
                <div className="col-span-2">
                  <div className="text-sm font-medium text-gray-500">Descrizione</div>
                  <div className="text-sm text-gray-700 mt-1">{campagna.descrizione}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">Campagna non trovata</CardContent>
        </Card>
      )}
    </div>
  )
}

