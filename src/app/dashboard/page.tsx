'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Users, FileText, Calendar, TrendingUp, Euro, Activity, Search } from 'lucide-react'

interface DashboardStats {
  artisti_attivi: number
  opere_totali: number
  programmazioni_mese: number
  campagne_attive: number
  importo_distribuito: number
  tasso_matching: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch dashboard statistics in parallel for better performance
        const [artistiResult, opereResult, programmazioniResult, campangeResult] = await Promise.all([
          supabase
            .from('artisti')
            .select('id', { count: 'exact', head: true })
            .eq('stato', 'attivo'),
          supabase
            .from('opere')
            .select('id', { count: 'exact', head: true }),
          // Mock programmazioni result as table is deprecated
          Promise.resolve({ count: 0, error: null }),
          /*
          supabase
            .from('programmazioni')
            .select('id', { count: 'exact', head: true })
            .gte('data_trasmissione', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          */
          supabase
            .from('campagne_individuazione')
            .select('id', { count: 'exact', head: true })
            .eq('stato', 'in_corso')
        ])

        // Use count results for better performance
        setStats({
          artisti_attivi: artistiResult.count || 0,
          opere_totali: opereResult.count || 0,
          programmazioni_mese: programmazioniResult.count || 0,
          campagne_attive: campangeResult.count || 0,
          importo_distribuito: 125000,
          tasso_matching: 94.2
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      title: 'Artisti Attivi',
      value: stats?.artisti_attivi || 0,
      icon: Users,
      description: 'Artisti con stato attivo',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Opere Catalogate',
      value: stats?.opere_totali || 0,
      icon: FileText,
      description: 'Opere nel database',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Programmazioni Mese',
      value: stats?.programmazioni_mese || 0,
      icon: Calendar,
      description: 'Trasmissioni questo mese',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Report Attivi',
      value: stats?.campagne_attive || 0,
      icon: Search,
      description: 'Report in corso',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Importo Distribuito',
      value: `€${(stats?.importo_distribuito || 0).toLocaleString()}`,
      icon: Euro,
      description: 'Totale anno corrente',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Tasso Matching',
      value: `${stats?.tasso_matching || 0}%`,
      icon: TrendingUp,
      description: 'Accuratezza individuazioni',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-600">Panoramica generale del sistema RASI</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 lg:space-y-8 p-4 lg:p-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-600 text-sm lg:text-base">Panoramica generale del sistema RASI</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Sistema Operativo
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-xl lg:text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Attività Recenti</CardTitle>
            <CardDescription className="text-sm">
              Ultime operazioni nel sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Nuovo artista registrato</p>
                  <p className="text-xs text-gray-500">Marco Rossi - 2 ore fa</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
                  <Activity className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Campagna completata</p>
                  <p className="text-xs text-gray-500">Individuazione Q4 2024 - 5 ore fa</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <div className="bg-purple-100 p-2 rounded-full flex-shrink-0">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Nuova opera catalogata</p>
                  <p className="text-xs text-gray-500">Il Commissario Montalbano - 1 giorno fa</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Statistiche Sistema</CardTitle>
            <CardDescription className="text-sm">
              Metriche di performance
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            <div className="space-y-3 lg:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uptime Sistema</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">99.9%</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database Records</span>
                <span className="text-sm text-gray-600 font-mono">
                  {((stats?.artisti_attivi || 0) + (stats?.opere_totali || 0)).toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Response Time</span>
                <span className="text-sm text-gray-600 font-mono">~150ms</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ultimo Backup</span>
                <span className="text-sm text-gray-600">2 ore fa</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}