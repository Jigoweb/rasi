'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Database, FileText, Users, Calendar, Search, Play, Download } from 'lucide-react'

type PredefinedQuery = {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ElementType;
  sql: string;
};

export default function QueryPage() {
  const [activeQuery, setActiveQuery] = useState<string | null>(null)

  const predefinedQueries: PredefinedQuery[] = [
    {
      id: 'artisti-attivi',
      title: 'Artisti Attivi',
      description: 'Lista di tutti gli artisti con stato attivo',
      category: 'Artisti',
      icon: Users,
      sql: `SELECT 
  codice_artista,
  nome,
  cognome,
  nome_arte,
  data_iscrizione
FROM artisti 
WHERE stato = 'attivo'
ORDER BY cognome, nome;`
    },
    {
      id: 'opere-per-anno',
      title: 'Opere per Anno',
      description: 'Conteggio opere catalogate per anno di produzione',
      category: 'Opere',
      icon: FileText,
      sql: `SELECT 
  anno_produzione,
  COUNT(*) as numero_opere,
  COUNT(CASE WHEN tipo = 'film' THEN 1 END) as film,
  COUNT(CASE WHEN tipo = 'serie_tv' THEN 1 END) as serie_tv,
  COUNT(CASE WHEN tipo = 'documentario' THEN 1 END) as documentari
FROM opere 
GROUP BY anno_produzione 
ORDER BY anno_produzione DESC;`
    },
    {
      id: 'programmazioni-fascia',
      title: 'Programmazioni per Fascia',
      description: 'Distribuzione delle programmazioni per fascia oraria',
      category: 'Programmazioni',
      icon: Calendar,
      sql: `SELECT 
  fascia_oraria,
  COUNT(*) as numero_programmazioni,
  AVG(durata_minuti) as durata_media,
  MIN(data_trasmissione) as prima_data,
  MAX(data_trasmissione) as ultima_data
FROM programmazioni 
WHERE fascia_oraria IS NOT NULL
GROUP BY fascia_oraria 
ORDER BY numero_programmazioni DESC;`
    },
    {
      id: 'campagne-stato',
      title: 'Report per Stato',
      description: 'Report dello stato dei report di individuazione',
      category: 'Report',
      icon: Search,
      sql: `SELECT 
  stato,
  COUNT(*) as numero_campagne,
  AVG(EXTRACT(days FROM (COALESCE(data_fine, CURRENT_DATE) - data_inizio))) as durata_media_giorni
FROM campagne_individuazione 
GROUP BY stato 
ORDER BY numero_campagne DESC;`
    },
    {
      id: 'opere-genere',
      title: 'Opere per Genere',
      description: 'Analisi della distribuzione per genere',
      category: 'Opere',
      icon: FileText,
      sql: `SELECT 
  genere,
  COUNT(*) as numero_opere
FROM (
  SELECT UNNEST(generi) as genere
  FROM opere 
  WHERE generi IS NOT NULL
) as generi_espansi
GROUP BY genere 
ORDER BY numero_opere DESC
LIMIT 20;`
    },
    {
      id: 'artisti-iscrizioni-mensili',
      title: 'Iscrizioni Mensili',
      description: 'Trend delle iscrizioni artisti per mese',
      category: 'Artisti',
      icon: Users,
      sql: `SELECT 
  EXTRACT(year FROM data_iscrizione) as anno,
  EXTRACT(month FROM data_iscrizione) as mese,
  COUNT(*) as nuove_iscrizioni,
  COUNT(CASE WHEN stato = 'attivo' THEN 1 END) as attualmente_attivi
FROM artisti 
WHERE data_iscrizione >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY EXTRACT(year FROM data_iscrizione), EXTRACT(month FROM data_iscrizione)
ORDER BY anno DESC, mese DESC;`
    }
  ]

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Artisti':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'Opere':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'Programmazioni':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'Report':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const executeQuery = (queryId: string) => {
    setActiveQuery(queryId)
    // In a real implementation, this would execute the SQL query
    console.log('Executing query:', queryId)
  }

  const exportQuery = (query: PredefinedQuery) => {
    const sqlContent = `-- ${query.title}\n-- ${query.description}\n\n${query.sql}`
    const blob = new Blob([sqlContent], { type: 'text/sql' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${query.id}.sql`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Query Builder</h1>
          <p className="text-gray-600">Esegui query predefinite e analizza i dati del sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-gray-400" />
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Database Connesso
          </Badge>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">Query Predefinite</h3>
              <p className="text-sm text-blue-700 mt-1">
                Utilizza le query predefinite per analizzare rapidamente i dati del sistema RASI. 
                Ogni query è ottimizzata per performance e include esempi di analisi comuni.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {predefinedQueries.map((query) => (
          <Card key={query.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <query.icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{query.title}</CardTitle>
                    <Badge variant="outline" className={`text-xs mt-1 ${getCategoryColor(query.category)}`}>
                      {query.category}
                    </Badge>
                  </div>
                </div>
              </div>
              <CardDescription className="text-sm">
                {query.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                  {query.sql.substring(0, 120)}...
                </pre>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => executeQuery(query.id)}
                  disabled={activeQuery === query.id}
                >
                  <Play className="h-3 w-3 mr-1" />
                  {activeQuery === query.id ? 'In Esecuzione...' : 'Esegui'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => exportQuery(query)}
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Results Section */}
      {activeQuery && (
        <Card>
          <CardHeader>
            <CardTitle>Risultati Query</CardTitle>
            <CardDescription>
              Risultati per: {predefinedQueries.find(q => q.id === activeQuery)?.title}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">Funzionalità in Sviluppo</h3>
              <p className="text-sm text-gray-600">
                L&apos;esecuzione delle query e la visualizzazione dei risultati saranno implementate nella prossima versione.
                Per ora è possibile esportare le query SQL e eseguirle manualmente nel database.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Query Disponibili</p>
                <p className="text-2xl font-bold">{predefinedQueries.length}</p>
              </div>
              <Database className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categorie</p>
                <p className="text-2xl font-bold">
                  {new Set(predefinedQueries.map(q => q.category)).size}
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ultima Esecuzione</p>
                <p className="text-sm text-gray-600">Mai</p>
              </div>
              <Play className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}