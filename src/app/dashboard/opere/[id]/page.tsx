'use client'

import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { Database } from '@/shared/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { getOperaById, getPartecipazioniByOperaId, getEpisodiByOperaId } from '@/features/opere/services/opere.service'
import { getTitleById, mapImdbToOpera } from '@/features/opere/services/external/imdb.service'
import { ArrowLeft, Film, Tv, FileText, Hash, Calendar, User, BadgeInfo, PlayCircle } from 'lucide-react'

type Opera = Database['public']['Tables']['opere']['Row']

export default function OperaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const operaId = params.id as string

  const [opera, setOpera] = useState<Opera | null>(null)
  const [partecipazioni, setPartecipazioni] = useState<any[]>([])
  const [episodi, setEpisodi] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: oData, error: oErr } = await getOperaById(operaId)
      if (oErr) {
        if (oErr.code === 'PGRST116') {
          setError('Opera non trovata')
          return
        }
        throw oErr
      }
      setOpera(oData || null)

      const { data: pData, error: pErr } = await getPartecipazioniByOperaId(operaId)
      if (pErr) throw pErr
      setPartecipazioni(pData || [])

      if ((oData?.tipo || '').toLowerCase() === 'serie_tv') {
        const { data: eData, error: eErr } = await getEpisodiByOperaId(operaId)
        if (eErr) throw eErr
        setEpisodi(eData || [])
      } else {
        setEpisodi([])
      }
    } catch (e) {
      setError('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }, [operaId])

  useEffect(() => {
    if (operaId) fetchData()
  }, [operaId, fetchData])

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'film':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Film className="mr-1 h-3 w-3" />Film</Badge>
      case 'serie_tv':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><Tv className="mr-1 h-3 w-3" />Serie TV</Badge>
      case 'documentario':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><FileText className="mr-1 h-3 w-3" />Documentario</Badge>
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">{tipo}</Badge>
    }
  }

  const schema = z.object({
    codice_opera: z.string().min(1, 'Codice opera obbligatorio'),
    titolo: z.string().min(1, 'Titolo obbligatorio'),
    tipo: z.enum(['film', 'serie_tv', 'documentario', 'cartoon', 'altro'], { required_error: 'Tipo obbligatorio' }),
    titolo_originale: z.string().optional().or(z.literal('')),
    anno_produzione: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => {
        if (val === undefined || val === '') return undefined
        const n = typeof val === 'string' ? Number(val) : val
        return Number.isNaN(n) ? undefined : n
      }),
    imdb_tconst: z.string().optional(),
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      codice_opera: opera?.codice_opera || '',
      titolo: opera?.titolo || '',
      tipo: (opera?.tipo as any) || undefined,
      titolo_originale: opera?.titolo_originale || '',
      anno_produzione: opera?.anno_produzione ?? undefined,
      imdb_tconst: opera?.imdb_tconst || '',
    },
  })

  useEffect(() => {
    if (opera && showEditForm) {
      form.reset({
        codice_opera: opera.codice_opera,
        titolo: opera.titolo,
        tipo: opera.tipo as any,
        titolo_originale: opera.titolo_originale || '',
        anno_produzione: opera.anno_produzione ?? undefined,
        imdb_tconst: opera.imdb_tconst || '',
      })
    }
  }, [opera, showEditForm])

  // Post-hook conditional renders
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">Caricamento...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg text-red-600 mb-4">{error}</div>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna Indietro
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!opera) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">Opera non trovata</div>
      </div>
    )
  }


  const onSubmit = async (values: z.infer<typeof schema>) => {
    const payload = {
      codice_opera: values.codice_opera,
      titolo: values.titolo,
      tipo: values.tipo,
      titolo_originale: values.titolo_originale || null,
      anno_produzione: values.anno_produzione ?? null,
      imdb_tconst: values.imdb_tconst || null,
      codici_esterni: values.imdb_tconst ? { imdb: values.imdb_tconst } : undefined,
    } as any
    const { error: err } = await import('@/features/opere/services/opere.service').then(m => m.updateOpera(opera.id, payload))
    if (!err) {
      setOpera({ ...opera, ...payload })
      setShowEditForm(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.back()} variant="outline" size="sm" className="w-fit">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna Indietro
          </Button>
          <div>
            <h1 className="text-xl lg:text-3xl font-bold">{opera.titolo}</h1>
            {opera.titolo_originale && (
              <p className="text-lg text-muted-foreground">{opera.titolo_originale}</p>
            )}
          </div>
        </div>
        {getTipoBadge(opera.tipo)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><BadgeInfo className="mr-2 h-5 w-5" />Informazioni Opera</CardTitle>
        </CardHeader>
        <CardContent className="p-4 lg:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground"><Hash className="mr-2 h-4 w-4" />Codice Opera</div>
              <div className="font-medium break-all">{opera.codice_opera}</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground"><Calendar className="mr-2 h-4 w-4" />Anno Produzione</div>
              <div className="font-medium">{opera.anno_produzione ?? '-'}</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground"><FileText className="mr-2 h-4 w-4" />IMDb tconst</div>
              <div className="font-medium">{opera.imdb_tconst || '-'}</div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {opera.imdb_tconst && (
              <Button variant="secondary" onClick={async () => {
                const { ok, result } = await getTitleById(opera.imdb_tconst!)
                if (ok && result) {
                  const mapped = mapImdbToOpera({ title: result.title, originalTitle: result.originalTitle, year: result.year, type: result.type, id: result.id })
                  setOpera({ ...opera, titolo: mapped.titolo, titolo_originale: mapped.titolo_originale || null, tipo: mapped.tipo, anno_produzione: mapped.anno_produzione ?? null })
                }
              }}>Importa da IMDb</Button>
            )}
            <Button onClick={() => setShowEditForm(true)}>Modifica</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5" />Partecipazioni</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artista</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead>Personaggio</TableHead>
                  <TableHead>Episodio</TableHead>
                  <TableHead>Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(partecipazioni || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">Nessuna partecipazione trovata</TableCell>
                  </TableRow>
                ) : (
                  partecipazioni.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.artisti ? (<div className="font-medium">{p.artisti.nome} {p.artisti.cognome}{p.artisti.nome_arte ? ` (${p.artisti.nome_arte})` : ''}</div>) : '—'}
                      </TableCell>
                      <TableCell>{p.ruoli_tipologie ? p.ruoli_tipologie.nome : '—'}</TableCell>
                      <TableCell>{p.personaggio || '—'}</TableCell>
                      <TableCell>{p.episodi ? `S${p.episodi.numero_stagione} E${p.episodi.numero_episodio} – ${p.episodi.titolo_episodio || ''}` : '—'}</TableCell>
                      <TableCell>{p.stato_validazione || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="lg:hidden p-4 space-y-3">
            {(partecipazioni || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nessuna partecipazione trovata</div>
            ) : (
              partecipazioni.map((p: any) => (
                <Card key={p.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="font-medium">{p.artisti ? `${p.artisti.nome} ${p.artisti.cognome}` : '—'}</div>
                    <div className="text-sm text-muted-foreground">{p.ruoli_tipologie ? p.ruoli_tipologie.nome : '—'}</div>
                    <div className="text-sm">{p.personaggio || '—'}</div>
                    <div className="text-xs text-muted-foreground">{p.episodi ? `S${p.episodi.numero_stagione} E${p.episodi.numero_episodio}` : '—'}</div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {(opera.tipo || '').toLowerCase() === 'serie_tv' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><PlayCircle className="mr-2 h-5 w-5" />Episodi</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stagione</TableHead>
                    <TableHead>Episodio</TableHead>
                    <TableHead>Titolo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Durata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(episodi || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">Nessun episodio associato</TableCell>
                    </TableRow>
                  ) : (
                    episodi.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.numero_stagione}</TableCell>
                        <TableCell>{e.numero_episodio}</TableCell>
                        <TableCell>{e.titolo_episodio || '—'}</TableCell>
                        <TableCell>{e.data_prima_messa_in_onda ? new Date(e.data_prima_messa_in_onda).toLocaleDateString('it-IT') : '—'}</TableCell>
                        <TableCell>{e.durata_minuti || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="lg:hidden p-4 space-y-3">
              {(episodi || []).length === 0 ? (
                <div className="text-center py-8 text-gray-500">Nessun episodio associato</div>
              ) : (
                episodi.map((e: any) => (
                  <Card key={e.id}>
                    <CardContent className="p-4 space-y-1">
                      <div className="font-medium">S{e.numero_stagione} E{e.numero_episodio}</div>
                      <div className="text-sm">{e.titolo_episodio || '—'}</div>
                      <div className="text-xs text-muted-foreground">{e.data_prima_messa_in_onda ? new Date(e.data_prima_messa_in_onda).toLocaleDateString('it-IT') : '—'}</div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Modifica Opera</DialogTitle>
            <DialogDescription>Aggiorna i dati dell’opera</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="codice_opera"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice Opera</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="titolo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titolo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleziona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="film">Film</SelectItem>
                        <SelectItem value="serie_tv">Serie TV</SelectItem>
                        <SelectItem value="documentario">Documentario</SelectItem>
                        <SelectItem value="cartoon">Cartoon</SelectItem>
                        <SelectItem value="altro">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="titolo_originale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titolo Originale</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="anno_produzione"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anno Produzione</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="imdb_tconst"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IMDB ID (tt...)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditForm(false)}>Annulla</Button>
                <Button type="submit">Salva</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
