# 🎨 Integrazione Front-End: Processamento Individuazioni

## 📋 Panoramica

Questo documento spiega come integrare il processamento delle individuazioni nel front-end.

---

## 🔧 Componenti Disponibili

### 1. **Endpoint API**
- **URL**: `POST /api/campagne-individuazione/process`
- **Funzione**: Processa una campagna_programmazione e crea tutte le individuazioni

### 2. **Funzioni SQL** (già create nel database)
- `match_programmazione_to_partecipazioni()` - Trova matching per una programmazione
- `process_campagna_individuazione()` - Processa tutta la campagna

---

## 💻 Integrazione Front-End

### Step 1: Crea il Service

Crea un file per il service delle campagne individuazione:

**File**: `src/features/campagne/services/campagne-individuazione.service.ts`

```typescript
export interface ProcessCampagnaIndividuazioneRequest {
  campagne_programmazione_id: string
  nome_campagna_individuazione?: string
  descrizione?: string
}

export interface ProcessCampagnaIndividuazioneResponse {
  success: boolean
  data?: {
    campagne_individuazione_id: string
    statistiche: {
      programmazioni_processate: number
      programmazioni_totali: number
      individuazioni_create: number
      match_trovati: number
      match_scartati_duplicati: number
      tempo_processamento_ms: number
      errore: boolean
      data_processamento: string
    }
    campagna?: any
  }
  error?: string
}

export const processCampagnaIndividuazione = async (
  request: ProcessCampagnaIndividuazioneRequest
): Promise<ProcessCampagnaIndividuazioneResponse> => {
  try {
    const response = await fetch('/api/campagne-individuazione/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Errore durante il processamento',
      }
    }

    return data as ProcessCampagnaIndividuazioneResponse
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Errore di connessione',
    }
  }
}
```

---

### Step 2: Crea il Componente Button

**File**: `src/app/dashboard/campagne/[id]/components/ProcessIndividuazioniButton.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { processCampagnaIndividuazione } from '@/features/campagne/services/campagne-individuazione.service'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner' // o il tuo sistema di notifiche

interface ProcessIndividuazioniButtonProps {
  campagneProgrammazioneId: string
  disabled?: boolean
}

export function ProcessIndividuazioniButton({
  campagneProgrammazioneId,
  disabled = false,
}: ProcessIndividuazioniButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleProcess = async () => {
    if (!campagneProgrammazioneId) {
      toast.error('ID campagna mancante')
      return
    }

    setLoading(true)

    try {
      const result = await processCampagnaIndividuazione({
        campagne_programmazione_id: campagneProgrammazioneId,
      })

      if (result.success && result.data) {
        toast.success(
          `Processamento completato! Create ${result.data.statistiche.individuazioni_create} individuazioni`
        )

        // Redirect alla pagina della campagna individuazione
        router.push(`/dashboard/campagne/${result.data.campagne_individuazione_id}`)
      } else {
        toast.error(result.error || 'Errore durante il processamento')
      }
    } catch (error: any) {
      toast.error(error.message || 'Errore inatteso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleProcess}
      disabled={disabled || loading}
      className="w-full"
    >
      {loading ? (
        <>
          <span className="mr-2">⏳</span>
          Processando...
        </>
      ) : (
        <>
          <span className="mr-2">🚀</span>
          Crea Individuazioni
        </>
      )}
    </Button>
  )
}
```

---

### Step 3: Usa il Componente nella Pagina

**File**: `src/app/dashboard/campagne/[id]/page.tsx`

Aggiungi il button nella pagina della campagna programmazione:

```typescript
import { ProcessIndividuazioniButton } from './components/ProcessIndividuazioniButton'

export default function CampagnaDettaglioPage({ params }: { params: { id: string } }) {
  // ... tuo codice esistente

  return (
    <div>
      {/* ... altri componenti ... */}
      
      {/* Aggiungi questo button dove serve */}
      <ProcessIndividuazioniButton 
        campagneProgrammazioneId={params.id}
        disabled={campagna.stato !== 'approvata'} // esempi di condizioni
      />
    </div>
  )
}
```

---

## 📊 Gestione Stati e Feedback

### Esempio con Dialog di Conferma

```typescript
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'

export function ProcessIndividuazioniDialog({ campagneProgrammazioneId }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleProcess = async () => {
    setLoading(true)
    // ... logica processamento
    setOpen(false)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Crea Individuazioni</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conferma Processamento</DialogTitle>
          <DialogDescription>
            Questa operazione creerà le individuazioni per tutte le programmazioni 
            di questa campagna. Il processo potrebbe richiedere alcuni minuti.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annulla
          </Button>
          <Button onClick={handleProcess} disabled={loading}>
            {loading ? 'Processando...' : 'Conferma'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 📈 Monitoraggio Progresso

### Opzione 1: Polling dello Stato

```typescript
const checkProcessStatus = async (campagneIndividuazioneId: string) => {
  const { data } = await supabase
    .from('campagne_individuazione')
    .select('stato, statistiche')
    .eq('id', campagneIndividuazioneId)
    .single()

  return data
}

// Usa in un useEffect per polling
useEffect(() => {
  if (!campagneIndividuazioneId) return

  const interval = setInterval(async () => {
    const status = await checkProcessStatus(campagneIndividuazioneId)
    if (status?.stato === 'completata' || status?.stato === 'annullata') {
      clearInterval(interval)
      // Aggiorna UI
    }
  }, 2000) // Check ogni 2 secondi

  return () => clearInterval(interval)
}, [campagneIndividuazioneId])
```

### Opzione 2: WebSocket/Realtime (Futuro)

Se implementi Supabase Realtime, puoi ascoltare gli aggiornamenti in tempo reale:

```typescript
const subscription = supabase
  .channel('campagne_individuazione')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'campagne_individuazione',
      filter: `id=eq.${campagneIndividuazioneId}`,
    },
    (payload) => {
      // Aggiorna UI con nuovo stato
    }
  )
  .subscribe()
```

---

## 🎨 Esempio Completo: Card con Statistiche

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { ProcessIndividuazioniButton } from './ProcessIndividuazioniButton'
import { supabase } from '@/shared/lib/supabase'

export function CampagnaIndividuazioniCard({ campagnaId }: { campagnaId: string }) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [campagnaId])

  const loadStats = async () => {
    const { data } = await supabase
      .from('campagne_individuazione')
      .select('statistiche, stato')
      .eq('campagne_programmazione_id', campagnaId)
      .single()

    setStats(data)
    setLoading(false)
  }

  if (loading) return <div>Caricamento...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Individuazioni</CardTitle>
      </CardHeader>
      <CardContent>
        {stats ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Stato:</span>
              <Badge>{stats.stato}</Badge>
            </div>
            {stats.statistiche && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Individuazioni create</p>
                  <p className="text-2xl font-bold">
                    {stats.statistiche.individuazioni_create || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Programmazioni processate</p>
                  <p className="text-2xl font-bold">
                    {stats.statistiche.programmazioni_processate || 0}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <ProcessIndividuazioniButton campagneProgrammazioneId={campagnaId} />
        )}
      </CardContent>
    </Card>
  )
}
```

---

## ✅ Checklist Integrazione

- [ ] Creare service `campagne-individuazione.service.ts`
- [ ] Creare componente `ProcessIndividuazioniButton.tsx`
- [ ] Aggiungere button nella pagina campagna
- [ ] Aggiungere gestione errori e loading
- [ ] Aggiungere feedback visivo (toast/notifiche)
- [ ] Testare con una campagna di prova
- [ ] Aggiungere redirect dopo processamento
- [ ] (Opzionale) Aggiungere monitoraggio progresso

---

## 🔍 Test dell'Endpoint

Puoi testare l'endpoint direttamente con curl:

```bash
curl -X POST http://localhost:3000/api/campagne-individuazione/process \
  -H "Content-Type: application/json" \
  -d '{
    "campagne_programmazione_id": "uuid-della-campagna"
  }'
```

---

## ⚠️ Note Importanti

1. **Performance**: Il processamento può richiedere tempo (secondi/minuti) a seconda del numero di programmazioni
2. **Idempotenza**: Chiamare più volte la stessa funzione non crea duplicati
3. **Errori**: Gli errori vengono loggati e ritornati nella response
4. **Stato**: Lo stato della campagna viene aggiornato: `in_corso` → `completata` o `annullata`

---

## 📚 Risorse

- Documentazione completa: `docs/LOGICA_INDIVIDUAZIONI.md`
- Funzioni SQL: Già create nel database
- Endpoint API: `POST /api/campagne-individuazione/process`

