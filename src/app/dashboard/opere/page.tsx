'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useInfiniteScroll } from '@/shared/hooks/useInfiniteScroll'
import { FloatingScrollUpButton } from '@/shared/components/floating-scroll-up-button'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/shared/lib/supabase-client'
import { Database } from '@/shared/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { SearchInput } from '@/shared/components/search-input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Plus, MoreHorizontal, Edit, Trash2, Eye, Download, Filter, Film, Tv, FileText, X, Database as DatabaseIcon, Loader2, AlertCircle, CheckCircle2, AlertTriangle, Music, ChevronLeft, ChevronRight } from 'lucide-react'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { createOpera, updateOpera, getOperaById, getPartecipazioniCountByOperaId, deleteOpera, getOpereForExport, formatOpereForExport, getIndividuazioniByOperaId, deleteIndividuazioniByOperaId, OPERE_INCOMPLETE_OR } from '@/features/opere/services/opere.service'
import { useExportProcess } from '@/shared/contexts/export-process-context'
import * as XLSX from 'xlsx'
import { getTitleById, mapImdbToOpera, mapImdbTypeToOperaTipo } from '@/features/opere/services/external/imdb.service'
import { operaHaEpisodi, TIPO_OPERA_LABELS, type TipoOpera } from '@/shared/lib/opere-utils'
import { notifyError, notifySuccess } from '@/shared/lib/toast'
import { useAuth } from '@/shared/contexts/auth-context'
import { canEditOpera } from '@/shared/lib/auth-permissions'

type Opera = Database['public']['Tables']['opere']['Row']

const PAGE_SIZE = 100

type PresenceField =
  | 'titolo_originale'
  | 'regista'
  | 'imdb_tconst'
  | 'codice_isan'
  | 'codice_opera'
  | 'anno_produzione'
  | 'has_episodes'

type StatoValidazione = 'da_validare' | 'validato'

/** Filtri unificati: tipo/stato a valore, oppure presenza campo. */
type FieldFilter =
  | { field: 'tipo'; value: TipoOpera }
  | { field: 'stato_validazione'; value: StatoValidazione }
  | { field: PresenceField; hasValue: boolean }

const FIELD_LABELS: Record<string, string> = {
  tipo: 'Tipo',
  stato_validazione: 'Stato',
  titolo_originale: 'Titolo Originale',
  regista: 'Regia',
  imdb_tconst: 'IMDB tconst',
  codice_isan: 'Codice ISAN',
  codice_opera: 'Codice Opera',
  anno_produzione: 'Anno',
  has_episodes: 'Episodi',
}

const STATO_VALIDAZIONE_LABELS: Record<StatoValidazione, string> = {
  da_validare: 'Da validare',
  validato: 'Validato',
}

function filterChipLabel(filter: FieldFilter): string {
  if (filter.field === 'tipo') return `Tipo: ${TIPO_OPERA_LABELS[filter.value] ?? filter.value}`
  if (filter.field === 'stato_validazione') return `Stato: ${STATO_VALIDAZIONE_LABELS[filter.value]}`
  if (filter.field === 'has_episodes') return `Episodi: ${filter.hasValue ? 'Con episodi' : 'Senza episodi'}`
  return `${FIELD_LABELS[filter.field]}: ${filter.hasValue ? 'Valorizzato' : 'Non valorizzato'}`
}

type FilterDimension = {
  id: 'tipo' | 'stato_validazione' | PresenceField
  label: string
  hint: string
  group: 'catalogo' | 'dati'
}

const FILTER_DIMENSIONS: FilterDimension[] = [
  { id: 'tipo', label: 'Tipo', hint: 'Film, serie, animazione…', group: 'catalogo' },
  { id: 'stato_validazione', label: 'Stato', hint: 'Da validare o validato', group: 'catalogo' },
  { id: 'titolo_originale', label: 'Titolo originale', hint: 'Presente o assente', group: 'dati' },
  { id: 'regista', label: 'Regia', hint: 'Presente o assente', group: 'dati' },
  { id: 'imdb_tconst', label: 'IMDb', hint: 'Codice tconst', group: 'dati' },
  { id: 'codice_isan', label: 'ISAN', hint: 'Codice ISAN', group: 'dati' },
  { id: 'codice_opera', label: 'Codice opera', hint: 'Presente o assente', group: 'dati' },
  { id: 'anno_produzione', label: 'Anno', hint: 'Presente o assente', group: 'dati' },
  { id: 'has_episodes', label: 'Episodi', hint: 'Con o senza episodi', group: 'dati' },
]

type FilterOption = { filter: FieldFilter; label: string; description?: string }

function optionsForDimension(id: FilterDimension['id']): FilterOption[] {
  if (id === 'tipo') {
    return (Object.keys(TIPO_OPERA_LABELS) as TipoOpera[]).map((value) => ({
      filter: { field: 'tipo', value },
      label: TIPO_OPERA_LABELS[value],
    }))
  }
  if (id === 'stato_validazione') {
    return (Object.keys(STATO_VALIDAZIONE_LABELS) as StatoValidazione[]).map((value) => ({
      filter: { field: 'stato_validazione', value },
      label: STATO_VALIDAZIONE_LABELS[value],
      description: value === 'da_validare' ? 'Ancora da revisionare' : 'Scheda confermata',
    }))
  }
  if (id === 'has_episodes') {
    return [
      { filter: { field: 'has_episodes', hasValue: true }, label: 'Con episodi' },
      { filter: { field: 'has_episodes', hasValue: false }, label: 'Senza episodi' },
    ]
  }
  return [
    { filter: { field: id, hasValue: true }, label: 'Valorizzato', description: 'Campo compilato' },
    { filter: { field: id, hasValue: false }, label: 'Non valorizzato', description: 'Campo vuoto o assente' },
  ]
}

function isSameFilter(a: FieldFilter, b: FieldFilter): boolean {
  if (a.field !== b.field) return false
  if (a.field === 'tipo' && b.field === 'tipo') return a.value === b.value
  if (a.field === 'stato_validazione' && b.field === 'stato_validazione') return a.value === b.value
  if ('hasValue' in a && 'hasValue' in b) return a.hasValue === b.hasValue
  return false
}

function FilterPopover({
  activeFilters,
  onAdd,
}: {
  activeFilters: FieldFilter[]
  onAdd: (f: FieldFilter) => void
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'dimensions' | FilterDimension['id']>('dimensions')

  const close = () => {
    setOpen(false)
    setStep('dimensions')
  }

  const pick = (filter: FieldFilter) => {
    onAdd(filter)
    close()
  }

  const activeFor = (field: FieldFilter['field']) => activeFilters.find((f) => f.field === field)
  const dimension = step === 'dimensions' ? null : FILTER_DIMENSIONS.find((item) => item.id === step) ?? null
  const options = dimension ? optionsForDimension(dimension.id) : []

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setStep('dimensions')
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Filter className="h-4 w-4 mr-2" />
          Aggiungi filtro
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 overflow-hidden" align="end">
        {step === 'dimensions' ? (
          <div>
            <div className="border-b px-3 py-2.5">
              <p className="text-sm font-medium">Aggiungi filtro</p>
              <p className="text-xs text-muted-foreground">Scegli un criterio, poi il valore</p>
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              <p className="px-3 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Catalogo
              </p>
              {FILTER_DIMENSIONS.filter((item) => item.group === 'catalogo').map((item) => {
                const active = activeFor(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStep(item.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {active ? filterChipLabel(active).split(': ').slice(1).join(': ') : item.hint}
                      </span>
                    </span>
                    {active ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : null}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                )
              })}
              <div className="my-1 border-t" />
              <p className="px-3 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Completezza dati
              </p>
              {FILTER_DIMENSIONS.filter((item) => item.group === 'dati').map((item) => {
                const active = activeFor(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStep(item.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {active ? filterChipLabel(active).split(': ').slice(1).join(': ') : item.hint}
                      </span>
                    </span>
                    {active ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : null}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-1 border-b px-1.5 py-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setStep('dimensions')}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Indietro
              </Button>
              <div className="min-w-0 flex-1 pr-2">
                <p className="truncate text-sm font-medium">{dimension?.label}</p>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {options.map((option) => {
                const selected = activeFilters.some((f) => isSameFilter(f, option.filter))
                return (
                  <button
                    key={`${option.filter.field}-${'value' in option.filter ? option.filter.value : option.filter.hasValue}`}
                    type="button"
                    onClick={() => pick(option.filter)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{option.label}</span>
                      {option.description ? (
                        <span className="block text-xs text-muted-foreground">{option.description}</span>
                      ) : null}
                    </span>
                    {selected ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : null}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default function OperePage() {
  const router = useRouter()
  // Operatore base e Tirocinante: niente eliminazione, niente modifica delle opere validate.
  const { userRole, canEditOpereSection, canValidateOpere } = useAuth()
  const canEditRow = (opera: { stato_validazione?: string | null }) =>
    canEditOpera(userRole, opera.stato_validazione)
  const searchParams = useSearchParams()
  const [opere, setOpere] = useState<Opera[]>([])
  const [loading, setLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FieldFilter[]>([])
  const [incompleteMode, setIncompleteMode] = useState(
    () => searchParams?.get('incomplete') === '1'
  )
  const [selectedOpera, setSelectedOpera] = useState<Opera | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [isLoadingImdb, setIsLoadingImdb] = useState(false)
  const [imdbError, setImdbError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  
  // Delete confirmation states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [operaToDelete, setOperaToDelete] = useState<Opera | null>(null)
  const [deleteCheckStatus, setDeleteCheckStatus] = useState<'idle' | 'checking' | 'can_delete' | 'has_partecipazioni' | 'has_individuazioni'>('idle')
  const [partecipazioniCount, setPartecipazioniCount] = useState(0)
  const [individuazioniCount, setIndividuazioniCount] = useState(0)
  const [deleteIndividuazioniToo, setDeleteIndividuazioniToo] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { startExport } = useExportProcess()
  const requestIdRef = useRef(0)
  const opereLengthRef = useRef(0)

  useEffect(() => {
    opereLengthRef.current = opere.length
  }, [opere.length])

  const applyFiltersToQuery = useCallback((query: ReturnType<typeof supabase.from>) => {
    let q = query
    for (const f of filters) {
      if (f.field === 'tipo') {
        q = q.eq('tipo', f.value)
        continue
      }
      if (f.field === 'stato_validazione') {
        q = q.eq('stato_validazione', f.value)
        continue
      }
      const hasValue = f.hasValue
      switch (f.field) {
        case 'titolo_originale':
          if (hasValue) q = q.not('titolo_originale', 'is', null).neq('titolo_originale', '')
          else q = q.or('titolo_originale.is.null,titolo_originale.eq.')
          break
        case 'regista':
          if (hasValue) q = q.not('regista', 'is', null).neq('regista', '{}')
          else q = q.or('regista.is.null,regista.eq.{}')
          break
        case 'imdb_tconst':
          if (hasValue) q = q.not('imdb_tconst', 'is', null).neq('imdb_tconst', '')
          else q = q.or('imdb_tconst.is.null,imdb_tconst.eq.')
          break
        case 'codice_isan':
          if (hasValue) q = q.not('codice_isan', 'is', null).neq('codice_isan', '')
          else q = q.or('codice_isan.is.null,codice_isan.eq.')
          break
        case 'codice_opera':
          if (hasValue) q = q.not('codice_opera', 'is', null).neq('codice_opera', '')
          else q = q.or('codice_opera.is.null,codice_opera.eq.')
          break
        case 'anno_produzione':
          if (hasValue) q = q.not('anno_produzione', 'is', null)
          else q = q.is('anno_produzione', null)
          break
        case 'has_episodes':
          q = q.eq('has_episodes', hasValue)
          break
      }
    }
    return q
  }, [filters])

  const buildOpereQuery = useCallback((from: number, to: number) => {
    let query = supabase
      .from('opere')
      .select('*')
      .order('anno_produzione', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to)

    if (searchQuery.trim()) {
      query = query.or(
        `titolo.ilike.%${searchQuery.trim()}%,codice_opera.ilike.%${searchQuery.trim()}%,titolo_originale.ilike.%${searchQuery.trim()}%`,
      )
    }

    query = applyFiltersToQuery(query)
    if (incompleteMode) {
      query = query.or(OPERE_INCOMPLETE_OR)
    }
    return query
  }, [applyFiltersToQuery, incompleteMode, searchQuery])

  const clearIncompleteMode = () => {
    setIncompleteMode(false)
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.delete('incomplete')
    const qs = params.toString()
    router.replace(qs ? `/dashboard/opere?${qs}` : '/dashboard/opere')
  }

  const fetchOpere = useCallback(async () => {
    const requestId = ++requestIdRef.current
    try {
      setIsSearching(true)
      setHasMore(true)
      const isInitialLoad =
        opereLengthRef.current === 0 &&
        !searchQuery &&
        filters.length === 0 &&
        !incompleteMode
      if (isInitialLoad) setLoading(true)

      const { data, error } = await buildOpereQuery(0, PAGE_SIZE - 1)
      if (requestId !== requestIdRef.current) return
      if (error) throw error
      setOpere(data || [])
      setHasMore((data?.length ?? 0) === PAGE_SIZE)
    } catch (error) {
      if (requestId !== requestIdRef.current) return
      console.error('Error fetching opere:', error)
      notifyError('Impossibile caricare le opere', error)
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
        setIsSearching(false)
        setLoadingMore(false)
      }
    }
  }, [buildOpereQuery, filters.length, incompleteMode, searchQuery])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading || isSearching) return
    const requestId = requestIdRef.current
    const from = opereLengthRef.current
    setLoadingMore(true)
    try {
      const { data, error } = await buildOpereQuery(from, from + PAGE_SIZE - 1)
      if (requestId !== requestIdRef.current) return
      if (error) throw error
      const rows = data || []
      setOpere((prev) => [...prev, ...rows])
      setHasMore(rows.length === PAGE_SIZE)
    } catch (error) {
      if (requestId !== requestIdRef.current) return
      console.error('Error loading more opere:', error)
      notifyError('Impossibile caricare altre opere', error)
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false)
    }
  }, [buildOpereQuery, hasMore, isSearching, loading, loadingMore])

  const loadMoreRef = useInfiniteScroll<HTMLDivElement>({
    enabled: hasMore && !loading && opere.length > 0,
    isLoading: loadingMore || isSearching,
    onLoadMore: loadMore,
  })

  useEffect(() => {
    fetchOpere()
  }, [fetchOpere])

  useEffect(() => {
    if (searchParams?.get('incomplete') === '1') {
      setIncompleteMode(true)
    }
  }, [searchParams])

  useEffect(() => {
    const editId = searchParams?.get('edit')
    if (editId && !showForm) {
      ;(async () => {
        const { data } = await getOperaById(editId)
        if (data) {
          openEditForm(data as Opera)
        }
      })()
    }
  }, [searchParams, showForm])

  const addFilter = (filter: FieldFilter) => {
    setFilters(prev => {
      const without = prev.filter(x => x.field !== filter.field)
      return [...without, filter]
    })
  }

  const removeFilter = (field: string) => {
    setFilters(prev => prev.filter(f => f.field !== field))
  }

  const hasActiveFilters = Boolean(searchQuery || filters.length > 0 || incompleteMode)

  const getTypeBadge = (tipo: string) => {
    switch (tipo) {
      case 'film':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Film className="h-3 w-3 mr-1" />
            Film
          </Badge>
        )
      case 'serie_tv':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Tv className="h-3 w-3 mr-1" />
            Serie TV
          </Badge>
        )
      case 'animazione':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Film className="h-3 w-3 mr-1" />
            Animazione
          </Badge>
        )
      case 'musicale':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Music className="h-3 w-3 mr-1" />
            Opera musicale
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            {tipo}
          </Badge>
        )
    }
  }

  const exportData = async () => {
    await startExport(
      'opere-export',
      'Banca Dati Opere',
      'xlsx',
      async (onProgress, signal) => {
        const { data, error } = await getOpereForExport((progress) => {
          onProgress({
            fetched: progress.fetched,
            total: progress.total,
            percentage: progress.percentage,
            phase: progress.phase,
            estimatedTimeRemaining: progress.estimatedTimeRemaining
          })
        }, signal)

        if (signal.aborted) throw new Error('Export cancelled')
        if (error) throw error
        if (!data || data.length === 0) throw new Error('Nessun dato da esportare')

        onProgress({ fetched: data.length, total: data.length, percentage: 85, phase: 'formatting' })
        const formattedData = formatOpereForExport(data)

        if (signal.aborted) throw new Error('Export cancelled')

        onProgress({ fetched: data.length, total: data.length, percentage: 95, phase: 'generating' })
        const worksheet = XLSX.utils.json_to_sheet(formattedData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Opere')

        // Auto-size columns
        const maxWidth = 50
        const colWidths = Object.keys(formattedData[0] || {}).map(key => ({
          wch: Math.min(maxWidth, Math.max(key.length,
            ...formattedData.slice(0, 100).map(row => String(row[key as keyof typeof row] || '').length)
          ))
        }))
        worksheet['!cols'] = colWidths

        onProgress({ fetched: data.length, total: data.length, percentage: 100, phase: 'done' })

        const fileName = `opere_${new Date().toISOString().split('T')[0]}`
        XLSX.writeFile(workbook, `${fileName}.xlsx`, { bookType: 'xlsx' })
      }
    )
  }

  const schema = z.object({
    codice_opera: z.string().optional().or(z.literal('')),
    titolo: z.string().min(1, 'Titolo obbligatorio'),
    titolo_originale: z.string().optional().or(z.literal('')),
    alias_titoli: z.string().optional().or(z.literal('')), // Comma-separated, will be converted to array
    tipo: z.enum(['film', 'serie_tv', 'animazione', 'musicale'], {
      required_error: 'Tipo obbligatorio'
    }),
    has_episodes: z.boolean().optional(),
    anno_produzione: z
      .union([z.string(), z.number()])
      .optional()
      .transform((val) => {
        if (val === undefined || val === '') return undefined
        const n = typeof val === 'string' ? Number(val) : val
        return Number.isNaN(n) ? undefined : n
      }),
    regista: z.string().optional().or(z.literal('')), // Comma-separated, will be converted to array
    codice_isan: z.string().optional().or(z.literal('')),
    imdb_tconst: z.string().optional().or(z.literal('')),
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      codice_opera: '',
      titolo: '',
      titolo_originale: '',
      alias_titoli: '',
      tipo: undefined as any,
      has_episodes: false,
      anno_produzione: undefined,
      regista: '',
      codice_isan: '',
      imdb_tconst: '',
    }
  })

  const openCreateForm = () => {
    setFormMode('create')
    setSelectedOpera(null)
    setImdbError(null)
    setFormError(null)
    form.reset({
      codice_opera: '',
      titolo: '',
      titolo_originale: '',
      alias_titoli: '',
      tipo: undefined as any,
      has_episodes: false,
      anno_produzione: undefined,
      regista: '',
      codice_isan: '',
      imdb_tconst: '',
    })
    setShowForm(true)
  }

  const openEditForm = (opera: Opera) => {
    setFormMode('edit')
    setSelectedOpera(opera)
    setImdbError(null)
    setFormError(null)
    form.reset({
      codice_opera: opera.codice_opera || '',
      titolo: opera.titolo,
      titolo_originale: opera.titolo_originale || '',
      alias_titoli: Array.isArray(opera.alias_titoli) ? opera.alias_titoli.join(', ') : '',
      tipo: opera.tipo as any,
      has_episodes: opera.has_episodes ?? (opera.tipo === 'serie_tv'),
      anno_produzione: opera.anno_produzione ?? undefined,
      regista: Array.isArray(opera.regista) ? opera.regista.join(', ') : '',
      codice_isan: opera.codice_isan || '',
      imdb_tconst: opera.imdb_tconst || '',
    })
    setShowForm(true)
  }

  const openDeleteDialog = async (opera: Opera) => {
    setOperaToDelete(opera)
    setDeleteCheckStatus('checking')
    setIndividuazioniCount(0)
    setDeleteIndividuazioniToo(false)
    setShowDeleteDialog(true)

    // Check if opera has participations
    const { count, error } = await getPartecipazioniCountByOperaId(opera.id)

    if (error) {
      console.error('Error checking partecipazioni:', error)
      setDeleteCheckStatus('idle')
      return
    }

    if (count > 0) {
      setPartecipazioniCount(count)
      setDeleteCheckStatus('has_partecipazioni')
      return
    }

    // No partecipazioni: check for residual individuazioni (blocked by FK opera_id RESTRICT)
    const { data: indData, error: indError } = await getIndividuazioniByOperaId(opera.id)
    if (indError) {
      console.error('Error checking individuazioni:', indError)
      notifyError('Impossibile verificare le individuazioni collegate', indError)
      setDeleteCheckStatus('can_delete')
      return
    }
    const indCount = indData?.length ?? 0
    setIndividuazioniCount(indCount)
    setDeleteCheckStatus(indCount > 0 ? 'has_individuazioni' : 'can_delete')
  }

  const handleDeleteOpera = async () => {
    if (!operaToDelete) return

    setIsDeleting(true)

    // If there are residual individuazioni and user confirmed deletion, remove them first
    if (deleteIndividuazioniToo && individuazioniCount > 0) {
      const { error: indError } = await deleteIndividuazioniByOperaId(operaToDelete.id)
      if (indError) {
        console.error('Error deleting individuazioni:', indError)
        notifyError('Eliminazione individuazioni collegate non riuscita', indError)
        setIsDeleting(false)
        return
      }
    }

    const { error } = await deleteOpera(operaToDelete.id)

    if (error) {
      console.error('Error deleting opera:', error)
      notifyError('Eliminazione opera non riuscita', error)
      setIsDeleting(false)
      return
    }

    notifySuccess('Opera eliminata')

    // Refresh list and close dialog
    await fetchOpere()
    setShowDeleteDialog(false)
    setOperaToDelete(null)
    setDeleteCheckStatus('idle')
    setIndividuazioniCount(0)
    setDeleteIndividuazioniToo(false)
    setIsDeleting(false)
  }

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false)
    setOperaToDelete(null)
    setDeleteCheckStatus('idle')
    setPartecipazioniCount(0)
    setIndividuazioniCount(0)
    setDeleteIndividuazioniToo(false)
  }

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      setFormError(null)
      // Convert comma-separated strings to arrays
      const aliasArray = values.alias_titoli 
        ? values.alias_titoli.split(',').map(s => s.trim()).filter(Boolean) 
        : null
      const registaArray = values.regista 
        ? values.regista.split(',').map(s => s.trim()).filter(Boolean) 
        : null

      const hasEpisodes = values.has_episodes ?? (values.tipo === 'serie_tv')
      const payload = {
        codice_opera: values.codice_opera || null,
        titolo: values.titolo,
        titolo_originale: values.titolo_originale || null,
        alias_titoli: aliasArray && aliasArray.length > 0 ? aliasArray : null,
        tipo: values.tipo,
        has_episodes: hasEpisodes,
        anno_produzione: values.anno_produzione ?? null,
        regista: registaArray && registaArray.length > 0 ? registaArray : null,
        codice_isan: values.codice_isan || null,
        imdb_tconst: values.imdb_tconst || null,
        codici_esterni: values.imdb_tconst ? { imdb: values.imdb_tconst } : {},
      } as any

      if (formMode === 'create') {
        const { error } = await createOpera(payload)
        if (error) throw error
      } else if (selectedOpera) {
        const { error } = await updateOpera(selectedOpera.id, payload)
        if (error) throw error
      }
      setShowForm(false)
      fetchOpere()
    } catch (e: any) {
      const msg = e?.message || e?.details || 'Errore nel salvataggio dell\'opera'
      setFormError(msg)
      console.error('Errore salvataggio opera', e)
    }
  }

  

  const fetchImdbById = async () => {
    const id = (form.getValues().imdb_tconst || '').trim()
    if (!id) {
      setImdbError('Inserisci un ID IMDb valido (es. tt1234567)')
      return
    }
    
    // Validate format
    if (!id.startsWith('tt') || id.length < 7) {
      setImdbError('L\'ID IMDb deve iniziare con "tt" seguito da numeri (es. tt1234567)')
      return
    }
    
    setIsLoadingImdb(true)
    setImdbError(null)
    
    try {
      const { ok, result } = await getTitleById(id)
      
      if (!ok || !result) {
        setImdbError('Opera non trovata su IMDb. Verifica l\'ID e riprova.')
        return
      }
      
      const mapped = mapImdbToOpera({ 
        title: result.title, 
        originalTitle: result.originalTitle, 
        year: result.year, 
        type: result.type, 
        id: result.id 
      })
      const tipoValue = mapImdbTypeToOperaTipo(result.type)
      
      // Set values from IMDb; leave tipo untouched when unmapped (episode / unknown)
      form.setValue('titolo', mapped.titolo || '', { shouldValidate: true })
      form.setValue('titolo_originale', mapped.titolo_originale || '', { shouldValidate: true })
      if (tipoValue) {
        form.setValue('tipo', tipoValue, { shouldValidate: true })
        form.setValue('has_episodes', tipoValue === 'serie_tv', { shouldValidate: true })
      }
      form.setValue('anno_produzione', mapped.anno_produzione ?? undefined, { shouldValidate: true })
      form.setValue('imdb_tconst', mapped.imdb_tconst || '', { shouldValidate: true })
      
      // Also set regista if available
      if (result.directorsFormatted) {
        form.setValue('regista', result.directorsFormatted, { shouldValidate: true })
      }
      
    } catch (e) {
      console.error('Error fetching from IMDb:', e)
      setImdbError('Errore durante il caricamento. Riprova più tardi.')
    } finally {
      setIsLoadingImdb(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Opere</h1>
            <p className="text-gray-600">Gestione del catalogo opere</p>
          </div>
        </div>
        <Card className="gap-4 py-4">
          <CardContent className="px-4">
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
      {/* Header */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Opere</h1>
          <p className="text-gray-600">Gestione del catalogo opere</p>
          <div className="mt-2 flex gap-2 lg:hidden">
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              Esporta Excel
            </Button>
            {canEditOpereSection && (
              <Button onClick={openCreateForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nuova Opera
              </Button>
            )}
          </div>
        </div>
        <div className="hidden lg:flex gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Esporta Excel
          </Button>
          {canEditOpereSection && (
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Opera
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="gap-4 py-4">
        <CardContent className="px-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                onSearch={setSearchQuery}
                initialValue={searchQuery}
                placeholder="Cerca per titolo, titolo originale..."
              />
            </div>
            <FilterPopover activeFilters={filters} onAdd={addFilter} />
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('')
                setFilters([])
                if (incompleteMode) clearIncompleteMode()
              }}
              disabled={!hasActiveFilters}
            >
              Reset
            </Button>
          </div>
          {/* Filter Chips */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {incompleteMode && (
                <button
                  type="button"
                  onClick={clearIncompleteMode}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 text-xs font-medium text-amber-900 hover:bg-amber-100"
                >
                  Incomplete (Data Health)
                  <X className="h-3 w-3 opacity-70" />
                </button>
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-background px-3 text-xs hover:bg-accent"
                >
                  <span className="text-muted-foreground">Ricerca</span>
                  <span className="font-medium">{searchQuery}</span>
                  <X className="h-3 w-3 opacity-70" />
                </button>
              )}
              {filters.map((f) => {
                const [key, ...rest] = filterChipLabel(f).split(': ')
                const value = rest.join(': ')
                return (
                  <button
                    key={f.field}
                    type="button"
                    onClick={() => removeFilter(f.field)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-background px-3 text-xs hover:bg-accent"
                  >
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium">{value}</span>
                    <X className="h-3 w-3 opacity-70" />
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Works Table */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          {/* Desktop */}
          <div className="hidden lg:block relative overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="py-3 px-4 pl-6">Titolo</TableHead>
                <TableHead className="py-3 px-4">Regia</TableHead>
                <TableHead className="py-3 px-4 w-32">Tipo</TableHead>
                <TableHead className="py-3 px-4 w-20 text-center">Episodi</TableHead>
                <TableHead className="py-3 px-4 w-20 text-center">Anno</TableHead>
                <TableHead className="py-3 px-4">Titolo Originale</TableHead>
                <TableHead className="py-3 px-4 pr-6 text-right sticky right-0 bg-background z-10 w-[1%]">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opere.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nessuna opera trovata con i criteri di ricerca attuali
                  </TableCell>
                </TableRow>
              ) : (
                opere.map((opera) => (
                  <TableRow
                    key={opera.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    tabIndex={0}
                    onClick={(e) => { 
                      e.preventDefault()
                      e.stopPropagation()
                      router.push(`/dashboard/opere/${opera.id}`)
                    }}
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        router.push(`/dashboard/opere/${opera.id}`)
                      }
                    }}
                  >
                    <TableCell className="py-4 px-4 pl-6">
                      <div className="font-medium">{opera.titolo}</div>
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      {Array.isArray(opera.regista) && opera.regista.length > 0 ? (
                        <span className="text-muted-foreground">{opera.regista.join(', ')}</span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      {getTypeBadge(opera.tipo)}
                    </TableCell>
                    <TableCell className="py-4 px-4 text-center">
                      {operaHaEpisodi(opera) ? (
                        <Badge variant="secondary" className="text-xs">Sì</Badge>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-4 text-center font-mono text-muted-foreground">
                      {opera.anno_produzione || '—'}
                    </TableCell>
                    <TableCell className="py-4 px-4">
                      {opera.titolo_originale ? (
                        <span className="text-muted-foreground italic">{opera.titolo_originale}</span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-4 pr-6 sticky right-0 bg-background z-10 w-[1%]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-label="Azioni" variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { 
                            e.stopPropagation()
                            router.push(`/dashboard/opere/${opera.id}`)
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Dettaglio
                          </DropdownMenuItem>
                          {canEditRow(opera) && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditForm(opera) }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifica
                            </DropdownMenuItem>
                          )}
                          {canValidateOpere && (
                            <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); openDeleteDialog(opera) }}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Elimina
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4 p-4">
            {opere.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nessuna opera trovata</div>
            ) : (
              opere.map((opera) => (
                <Card
                  key={opera.id}
                  className="p-4 cursor-pointer"
                  tabIndex={0}
                  onClick={(e) => { 
                    e.preventDefault()
                    e.stopPropagation()
                    router.push(`/dashboard/opere/${opera.id}`)
                  }}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      router.push(`/dashboard/opere/${opera.id}`)
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{opera.titolo}</div>
                      {opera.titolo_originale && (
                        <div className="text-xs text-gray-600 italic">{opera.titolo_originale}</div>
                      )}
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {getTypeBadge(opera.tipo)}
                        <span className="text-xs text-gray-600">{opera.anno_produzione || '—'}</span>
                        {operaHaEpisodi(opera) && (
                          <Badge variant="secondary" className="text-xs">Episodi</Badge>
                        )}
                      </div>
                      {Array.isArray(opera.regista) && opera.regista.length > 0 && (
                        <div className="text-xs text-gray-600 mt-1">
                          Regia: {opera.regista.join(', ')}
                        </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-label="Azioni" variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { 
                          e.stopPropagation()
                          router.push(`/dashboard/opere/${opera.id}`)
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Dettaglio
                        </DropdownMenuItem>
                        {canEditRow(opera) && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditForm(opera) }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Modifica
                          </DropdownMenuItem>
                        )}
                        {canValidateOpere && (
                          <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); openDeleteDialog(opera) }}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Elimina
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))
            )}
          </div>
          {opere.length > 0 && (
            <div className="border-t px-4 py-3">
              <div ref={loadMoreRef} className="flex min-h-8 items-center justify-center" aria-hidden={!loadingMore}>
                {loadingMore ? (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Caricamento…
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Opera Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Dettagli Opera</DialogTitle>
            <DialogDescription>
              Informazioni complete per &quot;{selectedOpera?.titolo}&quot;
            </DialogDescription>
          </DialogHeader>
          
          {selectedOpera && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Codice Opera</label>
                  <p className="font-mono">{selectedOpera.codice_opera}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Tipo</label>
                  <div className="mt-1">{getTypeBadge(selectedOpera.tipo)}</div>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Titolo</label>
                  <p className="text-lg font-medium">{selectedOpera.titolo}</p>
                </div>
                {selectedOpera.titolo_originale && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Titolo Originale</label>
                    <p className="italic">{selectedOpera.titolo_originale}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Anno Produzione</label>
                  <p>{selectedOpera.anno_produzione}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Chiudi
                </Button>
                <Button
                  disabled={!selectedOpera || !canEditRow(selectedOpera)}
                  onClick={() => selectedOpera && openEditForm(selectedOpera)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica
                </Button>
                <Button
                  variant="secondary"
                  disabled={!selectedOpera || !canEditRow(selectedOpera)}
                  onClick={async () => {
                    if (!selectedOpera?.imdb_tconst) return
                    const { ok, result } = await getTitleById(selectedOpera.imdb_tconst)
                    if (ok && result) {
                      const mapped = mapImdbToOpera({ title: result.title, originalTitle: result.originalTitle, year: result.year, type: result.type, id: result.id })
                      await updateOpera(selectedOpera.id, {
                        titolo: mapped.titolo,
                        titolo_originale: mapped.titolo_originale || null,
                        ...(mapped.tipo ? { tipo: mapped.tipo } : {}),
                        anno_produzione: mapped.anno_produzione ?? null,
                        imdb_tconst: mapped.imdb_tconst,
                        codici_esterni: mapped.codici_esterni,
                      } as any)
                      await fetchOpere()
                      setShowDetails(false)
                    }
                  }}
                >
                  Importa da IMDB
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'Nuova Opera' : 'Modifica Opera'}</DialogTitle>
            <DialogDescription>
              {formMode === 'create' ? 'I campi con * sono obbligatori' : 'Modifica i dati dell\'opera'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {formError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {formError}
                </div>
              )}
              
              {/* Sezione: Caricamento rapido da IMDB */}
              <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <DatabaseIcon className="h-4 w-4" />
                  Caricamento rapido da IMDb
                </h3>
                <FormField
                  control={form.control}
                  name="imdb_tconst"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''}
                            placeholder="tt1234567" 
                            className="flex-1 font-mono"
                            disabled={isLoadingImdb}
                          />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="secondary" 
                          onClick={fetchImdbById}
                          disabled={isLoadingImdb || !field.value}
                        >
                          {isLoadingImdb ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Caricamento...
                            </>
                          ) : (
                            'Carica da IMDb'
                          )}
                        </Button>
                      </div>
                      {imdbError && (
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          {imdbError}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Inserisci l'ID IMDb (es. tt0068646) per auto-compilare i campi
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sezione: Titoli */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Titoli</h3>
                
                <FormField
                  control={form.control}
                  name="titolo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titolo italiano *</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder="es. Il Padrino" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="titolo_originale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titolo originale</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder="es. The Godfather" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alias_titoli"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titoli alternativi</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder="es. Alias 1, Alias 2, Alias 3" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Separa con virgola</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sezione: Informazioni */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Informazioni</h3>
                
                <div className="grid grid-cols-2 gap-4 items-start">
                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v)
                            if (v === 'serie_tv') {
                              form.setValue('has_episodes', true)
                            } else {
                              form.setValue('has_episodes', false)
                            }
                          }}
                        >
                          <SelectTrigger className="h-10 w-full">
                            <SelectValue placeholder="Seleziona" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="film">Film</SelectItem>
                            <SelectItem value="serie_tv">Serie TV</SelectItem>
                            <SelectItem value="animazione">Animazione</SelectItem>
                            <SelectItem value="musicale">Opera musicale</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="has_episodes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="invisible">Ha episodi</FormLabel>
                        <FormControl>
                          <label className="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors hover:bg-accent/50 hover:border-accent-foreground/20">
                            <Checkbox
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                            />
                            <span>Ha episodi?</span>
                          </label>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="regista"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regista</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder="es. Francis Ford Coppola" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Per più registi, separa con virgola</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="anno_produzione"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anno</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ''}
                          placeholder="es. 2024"
                          min={1900}
                          max={2030}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sezione: Codici */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Codici identificativi</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="codice_opera"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Codice Opera</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="es. OP_12345" className="font-mono" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="codice_isan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Codice ISAN</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="es. 0000-0000-0000-0000" className="font-mono" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Annulla
                </Button>
                <Button type="submit">
                  {formMode === 'create' ? 'Crea Opera' : 'Salva Modifiche'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={closeDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Conferma Eliminazione
            </DialogTitle>
            <DialogDescription>
              {operaToDelete && (
                <>Stai per eliminare l&apos;opera <strong>&quot;{operaToDelete.titolo}&quot;</strong></>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {deleteCheckStatus === 'checking' && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifica partecipazioni in corso...
              </div>
            )}

            {deleteCheckStatus === 'has_partecipazioni' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Impossibile eliminare</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Questa opera ha <strong>{partecipazioniCount} partecipazion{partecipazioniCount === 1 ? 'e' : 'i'}</strong> associate. 
                      Rimuovi prima tutte le partecipazioni dalla pagina di dettaglio dell&apos;opera.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {deleteCheckStatus === 'has_individuazioni' && (
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">
                    Questa azione è irreversibile. Tutti i dati dell&apos;opera verranno eliminati permanentemente.
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-orange-800">Presenti individuazioni storiche</p>
                      <p className="text-sm text-orange-700 mt-1">
                        Quest&apos;opera è presente in{' '}
                        <strong>{individuazioniCount} individuazion{individuazioniCount === 1 ? 'e' : 'i'}</strong> di campagne precedenti.
                        Le individuazioni verranno mantenute con tutti i dati dello snapshot, ma perderanno il collegamento all&apos;opera nel catalogo.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 pl-1">
                  <Checkbox
                    id="delete-individuazioni"
                    checked={deleteIndividuazioniToo}
                    onCheckedChange={(v) => setDeleteIndividuazioniToo(!!v)}
                  />
                  <label htmlFor="delete-individuazioni" className="text-sm text-gray-700 cursor-pointer leading-snug">
                    Elimina anche le <strong>{individuazioniCount} individuazion{individuazioniCount === 1 ? 'e' : 'i'}</strong> residue (opzionale)
                  </label>
                </div>
              </div>
            )}

            {deleteCheckStatus === 'can_delete' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  Questa azione è irreversibile. Tutti i dati dell&apos;opera verranno eliminati permanentemente, inclusi eventuali episodi associati.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDeleteDialog}>
              Annulla
            </Button>
            {(deleteCheckStatus === 'can_delete' || deleteCheckStatus === 'has_individuazioni') && (
              <Button
                variant="destructive"
                onClick={handleDeleteOpera}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina Opera
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {opere.length > PAGE_SIZE ? <FloatingScrollUpButton /> : null}
    </div>
  )
}
