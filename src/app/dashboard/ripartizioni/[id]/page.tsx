'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Calculator, CheckCircle2, Download, FileSearch, Loader2, Pencil, Send, Undo2 } from 'lucide-react'
import { supabase, type Database } from '@/shared/lib/supabase'
import { useAuth } from '@/shared/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { DashboardBreadcrumbs } from '@/shared/components/dashboard-breadcrumbs'
import { PageErrorState } from '@/shared/components/page-states'
import { RipartizioneStatusBadge } from '@/features/ripartizioni/components/RipartizioneStatusBadge'
import { NuovaRipartizioneDialog, type CampagnaDaModificare } from '@/features/ripartizioni/components/nuova-ripartizione-dialog'
import { ConfrontoExcelDialog } from '@/features/ripartizioni/components/confronto-excel-dialog'
import { classifyRipartizioneLoadError } from '@/features/ripartizioni/lib/ripartizione-detail-state'
import { formatCategoria, formatEuro, formatModalita, vociRiepilogo } from '@/features/ripartizioni/lib/ripartizione-display'
import type { Modalita } from '@/features/ripartizioni/lib/parametri'
import {
  avviaCalcolo,
  cambiaStato,
  esportaExcel,
  listaSorgenti,
  statoCalcolo,
  totaliPerArtista,
  totaliPerConfronto,
  ultimoCalcolo,
  type JobRipartizione,
  type SorgenteRipartizione,
  type TotaleArtistaRipartizione,
} from '@/features/ripartizioni/services/ripartizioni.service'

type CampagnaRipartizione = Database['public']['Tables']['campagne_ripartizione']['Row']
type Azione = 'approvata' | 'distribuita' | 'calcolata'

const CONFERME: Record<Azione, { titolo: string; testo: string; bottone: string }> = {
  approvata: {
    titolo: 'Approvare la ripartizione?',
    testo: 'Dopo l’approvazione gli artisti vedono i propri importi nell’area riservata e la ripartizione non si ricalcola più.',
    bottone: 'Approva',
  },
  distribuita: {
    titolo: 'Segnare la ripartizione come distribuita?',
    testo: 'Indica che gli importi sono stati pagati. Gli artisti continuano a vederli.',
    bottone: 'Segna distribuita',
  },
  calcolata: {
    titolo: 'Revocare l’approvazione?',
    testo: 'La ripartizione torna «calcolata»: gli artisti non vedono più gli importi e si può ricalcolare.',
    bottone: 'Revoca',
  },
}

export default function RipartizioneDettaglioPage() {
  const params = useParams()
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string)
  const { isStaff, isAdmin } = useAuth()
  const [campagna, setCampagna] = useState<CampagnaRipartizione | null>(null)
  const [emittenteNome, setEmittenteNome] = useState<string | null>(null)
  const [sorgenti, setSorgenti] = useState<SorgenteRipartizione[]>([])
  const [totali, setTotali] = useState<TotaleArtistaRipartizione[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [job, setJob] = useState<JobRipartizione | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [conferma, setConferma] = useState<Azione | null>(null)
  const [busy, setBusy] = useState(false)
  const [modifica, setModifica] = useState(false)
  const [confronto, setConfronto] = useState(false)
  const [cerca, setCerca] = useState('')
  const polling = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCampagna = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoadFailed(false)
    try {
      const { data, error } = await supabase.from('campagne_ripartizione').select('*').eq('id', id).single()
      const outcome = classifyRipartizioneLoadError(error)
      if (outcome !== 'ok' || !data) {
        if (outcome === 'failed') console.error('Error fetching campagna ripartizione:', error)
        setCampagna(null)
        setLoadFailed(outcome === 'failed')
        return
      }
      setCampagna(data)
      const [src, tot] = await Promise.all([listaSorgenti(id), totaliPerArtista(id)])
      setSorgenti(src)
      setTotali(tot)
      if (data.emittente_id) {
        const { data: e } = await supabase.from('emittenti').select('nome').eq('id', data.emittente_id).maybeSingle()
        setEmittenteNome(e?.nome ?? null)
      }
    } catch (error) {
      console.error('Error fetching campagna ripartizione:', error)
      setCampagna(null)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  const segui = useCallback(
    (jobId: string) => {
      if (polling.current) clearTimeout(polling.current)
      const tick = async () => {
        try {
          const j = await statoCalcolo(jobId)
          setJob(j)
          if (j.stato === 'completed') {
            await fetchCampagna()
            return
          }
          if (j.stato === 'error') return
        } catch (e: any) {
          setErrore(e?.message ?? 'Stato del calcolo non disponibile')
          return
        }
        polling.current = setTimeout(tick, 2000)
      }
      void tick()
    },
    [fetchCampagna],
  )

  useEffect(() => {
    void fetchCampagna()
  }, [fetchCampagna])

  useEffect(() => {
    if (!id || !isStaff) return
    ultimoCalcolo(id)
      .then((j) => {
        setJob(j)
        if (j && (j.stato === 'queued' || j.stato === 'running')) segui(j.id)
      })
      .catch(() => undefined)
    return () => {
      if (polling.current) clearTimeout(polling.current)
    }
  }, [id, isStaff, segui])

  const calcola = async () => {
    if (!id) return
    setErrore(null)
    try {
      const jobId = await avviaCalcolo(id)
      setJob({ id: jobId, stato: 'queued', fase: 'in coda', righe_lette: 0, righe_scritte: 0, error: null })
      segui(jobId)
    } catch (e: any) {
      setErrore(e?.message ?? 'Avvio del calcolo non riuscito')
    }
  }

  const eseguiConferma = async () => {
    if (!id || !conferma) return
    setBusy(true)
    setErrore(null)
    try {
      await cambiaStato(id, conferma)
      await fetchCampagna()
    } catch (e: any) {
      setErrore(e?.message ?? 'Operazione non riuscita')
    } finally {
      setBusy(false)
      setConferma(null)
    }
  }

  const esporta = async () => {
    if (!campagna) return
    setBusy(true)
    setErrore(null)
    try {
      await esportaExcel(campagna)
    } catch (e: any) {
      setErrore(e?.message ?? 'Export non riuscito')
    } finally {
      setBusy(false)
    }
  }

  const stato = campagna?.stato ?? 'pianificata'
  const bloccata = stato === 'approvata' || stato === 'distribuita'
  const calcolata = stato !== 'pianificata'
  const inCorso = job?.stato === 'queued' || job?.stato === 'running'
  const statistiche = campagna?.statistiche_calcolo as Record<string, any> | null
  const voci = useMemo(() => vociRiepilogo(statistiche), [statistiche])
  const avvisi: string[] = Array.isArray(statistiche?.avvisi) ? statistiche!.avvisi : []

  const totaliFiltrati = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return q ? totali.filter((t) => `${t.nome} ${t.nomeArte ?? ''}`.toLowerCase().includes(q)) : totali
  }, [totali, cerca])

  const daModificare: CampagnaDaModificare | null = campagna && campagna.emittente_id && campagna.anno
    ? {
        id: campagna.id,
        nome: campagna.nome,
        emittenteId: campagna.emittente_id,
        anno: campagna.anno,
        fondo: Number(campagna.importo_totale_disponibile),
        modalita: (campagna.modalita as Modalita | null) ?? null,
        sorgenti: sorgenti.map((s) => s.id),
        descrizione: campagna.descrizione,
      }
    : null

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dettaglio Ripartizione</h1>
        <Card className="gap-4 py-4">
          <CardContent className="px-4">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-gray-200" />
              ))}
            </div>
          </CardContent>
        </Card>
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dettaglio Ripartizione</h1>
          <p className="text-gray-600">{campagna?.nome || ''}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/ripartizioni">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Indietro
          </Link>
        </Button>
      </div>

      {loadFailed ? (
        <PageErrorState
          title="Non siamo riusciti a caricare la campagna"
          description="Si è verificato un errore durante la lettura del dettaglio. La campagna potrebbe esistere comunque: riprova."
          onRetry={fetchCampagna}
        />
      ) : !campagna ? (
        <Card className="gap-4 py-4">
          <CardContent className="px-4 text-gray-500">Campagna non trovata.</CardContent>
        </Card>
      ) : (
        <>
          <Card className="gap-4 py-4">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle>{campagna.nome}</CardTitle>
              <div className="flex flex-wrap gap-2">
                {isStaff && !bloccata && daModificare && (
                  <Button variant="outline" onClick={() => setModifica(true)} disabled={inCorso}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifica
                  </Button>
                )}
                {isStaff && !bloccata && (
                  <Button onClick={calcola} disabled={inCorso || sorgenti.length === 0}>
                    {inCorso ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                    {calcolata ? 'Ricalcola' : 'Calcola'}
                  </Button>
                )}
                {isAdmin && stato === 'calcolata' && (
                  <Button variant="outline" onClick={() => setConferma('approvata')} disabled={inCorso}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approva
                  </Button>
                )}
                {isAdmin && stato === 'approvata' && (
                  <>
                    <Button variant="outline" onClick={() => setConferma('calcolata')}>
                      <Undo2 className="mr-2 h-4 w-4" />
                      Revoca approvazione
                    </Button>
                    <Button variant="outline" onClick={() => setConferma('distribuita')}>
                      <Send className="mr-2 h-4 w-4" />
                      Segna distribuita
                    </Button>
                  </>
                )}
                {calcolata && (
                  <>
                    <Button variant="outline" onClick={esporta} disabled={busy || inCorso}>
                      <Download className="mr-2 h-4 w-4" />
                      Esporta Excel
                    </Button>
                    <Button variant="outline" onClick={() => setConfronto(true)} disabled={inCorso}>
                      <FileSearch className="mr-2 h-4 w-4" />
                      Confronta con Excel RASI
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-4">
              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                <div>
                  <div className="font-medium text-gray-500">Stato</div>
                  <div className="mt-1">
                    <RipartizioneStatusBadge stato={campagna.stato} />
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-500">Fondo da ripartire</div>
                  <div className="mt-1 font-mono text-lg font-semibold">{formatEuro(campagna.importo_totale_disponibile)}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-500">Emittente e anno</div>
                  <div className="mt-1">
                    {emittenteNome ?? '—'} {campagna.anno ?? ''}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-500">Modalità</div>
                  <div className="mt-1">{formatModalita(campagna.modalita)}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-500">Ultimo calcolo</div>
                  <div className="mt-1">{campagna.data_calcolo ? new Date(campagna.data_calcolo).toLocaleString('it-IT') : '—'}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-500">Approvata il</div>
                  <div className="mt-1">{campagna.data_approvazione ? new Date(campagna.data_approvazione).toLocaleString('it-IT') : '—'}</div>
                </div>
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-500">Campagne di individuazione incluse</div>
                {sorgenti.length === 0 ? (
                  <p className="mt-1 text-amber-700">Nessuna: modifica la ripartizione e scegline almeno una.</p>
                ) : (
                  <ul className="mt-1 list-disc pl-5">
                    {sorgenti.map((s) => (
                      <li key={s.id}>{s.nome}</li>
                    ))}
                  </ul>
                )}
              </div>
              {job && (job.stato !== 'completed' || inCorso) && (
                <p className={`text-sm ${job.stato === 'error' ? 'text-destructive' : 'text-muted-foreground'}`} role="status">
                  {job.stato === 'error'
                    ? `Calcolo non riuscito: ${job.error ?? 'errore sconosciuto'}`
                    : `Calcolo in corso: ${job.fase ?? ''} · ${job.righe_lette.toLocaleString('it-IT')} righe lette · ${job.righe_scritte.toLocaleString('it-IT')} scritte`}
                </p>
              )}
              {errore && <p className="text-sm text-destructive">{errore}</p>}
            </CardContent>
          </Card>

          {voci.length > 0 && (
            <Card className="gap-4 py-4">
              <CardHeader>
                <CardTitle>Dati conteggi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm md:grid-cols-2">
                  {voci.map((v) => (
                    <div key={v.voce} className="flex justify-between gap-4 border-b py-1">
                      <dt className="text-gray-600">{v.voce}</dt>
                      <dd className="text-right font-mono">{v.valore}</dd>
                    </div>
                  ))}
                </dl>
                {avvisi.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-amber-800">
                    {avvisi.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {totali.length > 0 && (
            <Card className="gap-4 py-4">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle>Importi per artista ({totali.length.toLocaleString('it-IT')})</CardTitle>
                <Input
                  className="max-w-xs"
                  placeholder="Cerca artista"
                  aria-label="Cerca artista"
                  value={cerca}
                  onChange={(e) => setCerca(e.target.value)}
                />
              </CardHeader>
              <CardContent className="px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artista</TableHead>
                      <TableHead>Ruoli</TableHead>
                      <TableHead className="text-right">Utilizzazioni</TableHead>
                      <TableHead className="text-right">Da liquidare</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {totaliFiltrati.slice(0, 500).map((t) => (
                      <TableRow key={t.artistaId}>
                        <TableCell>
                          <Link className="hover:underline" href={`/dashboard/artisti/${t.artistaId}`}>
                            {t.nome}
                          </Link>
                          {t.nomeArte && <span className="text-muted-foreground"> ({t.nomeArte})</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {Object.entries(t.perCategoria)
                            .map(([c, v]) => `${formatCategoria(c)} ${formatEuro(v.importo)}`)
                            .join(' · ')}
                        </TableCell>
                        <TableCell className="text-right">{t.numeroIndividuazioni.toLocaleString('it-IT')}</TableCell>
                        <TableCell className="text-right font-mono">{formatEuro(t.importo)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {totaliFiltrati.length > 500 && (
                  <p className="mt-2 text-sm text-muted-foreground">Mostrati i primi 500: l’elenco completo è nell’export Excel.</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <NuovaRipartizioneDialog
        open={modifica}
        onOpenChange={setModifica}
        campagna={daModificare}
        onSaved={() => void fetchCampagna()}
      />
      <ConfrontoExcelDialog open={confronto} onOpenChange={setConfronto} totali={totaliPerConfronto(totali)} />
      <AlertDialog open={conferma !== null} onOpenChange={(v) => !v && !busy && setConferma(null)}>
        <AlertDialogContent>
          {conferma && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{CONFERME[conferma].titolo}</AlertDialogTitle>
                <AlertDialogDescription>{CONFERME[conferma].testo}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Annulla</AlertDialogCancel>
                <AlertDialogAction
                  disabled={busy}
                  onClick={(e) => {
                    e.preventDefault()
                    void eseguiConferma()
                  }}
                >
                  {CONFERME[conferma].bottone}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
