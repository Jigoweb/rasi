import { useCallback, useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/shared/lib/supabase'
import { useExportProcess } from '@/shared/contexts/export-process-context'
import {
  formatIndividuazioniForExport,
  getCampagnaIndividuazione,
  getIndividuazioni,
  getIndividuazioniForExport,
  type CampagnaIndividuazione,
  type Individuazione,
  type SearchField,
} from '@/features/individuazioni/services/individuazioni.service'

type ExportFormat = 'csv' | 'xlsx'
const pageSize = 100

export function useIndividuazioneDetail(campagnaId: string) {
  const [campagna, setCampagna] = useState<CampagnaIndividuazione | null>(null)
  const [individuazioni, setIndividuazioni] = useState<Individuazione[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showTimeEstimateDialog, setShowTimeEstimateDialog] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null)
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null)
  const [isCalculatingEstimate, setIsCalculatingEstimate] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [searchField, setSearchField] = useState<SearchField>('titolo')
  const [statoFilter, setStatoFilter] = useState<string>('all')
  const exportButtonRef = useRef<HTMLDivElement>(null)
  const { startExport, state: exportState } = useExportProcess()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    if (!campagnaId) return

    async function loadCampagna() {
      setLoading(true)
      try {
        const { data, error } = await getCampagnaIndividuazione(campagnaId)
        if (error) {
          logError('Errore caricamento campagna:', error)
          setCampagna(null)
          return
        }
        setCampagna(data ?? null)
      } catch (error) {
        logError('Errore caricamento campagna:', error)
        setCampagna(null)
      } finally {
        setLoading(false)
      }
    }

    void loadCampagna()
  }, [campagnaId])

  const loadIndividuazioni = useCallback(async () => {
    const isFirstPage = page === 1
    if (isFirstPage) {
      setLoadingData(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const { data, error, count, totalPages: pages } = await getIndividuazioni(campagnaId, {
        page,
        pageSize,
        search: debouncedSearchTerm || undefined,
        searchField,
        stato: statoFilter !== 'all' ? statoFilter : undefined,
        withCount: isFirstPage,
      })
      if (error) {
        logError('Errore caricamento individuazioni:', error)
        if (isFirstPage) resetIndividuazioni()
        return
      }
      setIndividuazioni(prev => isFirstPage ? data ?? [] : [...prev, ...(data ?? [])])
      if (isFirstPage) {
        setTotalPages(pages)
        setTotalCount(count || 0)
      }
    } catch (error) {
      logError('Errore caricamento individuazioni:', error)
      if (isFirstPage) resetIndividuazioni()
    } finally {
      if (isFirstPage) {
        setLoadingData(false)
      } else {
        setLoadingMore(false)
      }
    }
  }, [campagnaId, debouncedSearchTerm, page, searchField, statoFilter])

  useEffect(() => {
    if (!campagna) return
    void loadIndividuazioni()
  }, [campagna, loadIndividuazioni])

  const handleSearch = useCallback((value: string) => setSearchTerm(value), [])

  const handleSearchFieldChange = useCallback((value: SearchField) => {
    setSearchField(value)
    setSearchTerm('')
    setPage(1)
  }, [])

  const handleStatoFilterChange = useCallback((value: string) => {
    setStatoFilter(value)
    setPage(1)
  }, [])

  const hasMore = totalCount > individuazioni.length

  const loadMore = useCallback(() => {
    if (loadingData || loadingMore || !hasMore) return
    setPage(prev => prev + 1)
  }, [hasMore, loadingData, loadingMore])

  const handleExportDialogOpenChange = useCallback((open: boolean) => {
    if (!isCalculatingEstimate && exportState.status === 'idle') {
      setShowExportDialog(open)
    }
  }, [exportState.status, isCalculatingEstimate])

  const estimateExportTime = useCallback(async (): Promise<number> => {
    try {
      const { count } = await (supabase as any)
        .from('individuazioni')
        .select('*', { count: 'exact', head: true })
        .eq('campagna_individuazioni_id', campagnaId)
      const total = count || 0
      if (total === 0) return 0
      return Math.ceil(total / 100 + total / 1000 + 5)
    } catch (error) {
      console.error('Error estimating export time:', error)
      return 60
    }
  }, [campagnaId])

  const handleFormatSelect = useCallback(async (format: ExportFormat) => {
    setSelectedFormat(format)
    setShowExportDialog(false)
    setIsCalculatingEstimate(true)
    try {
      setEstimatedTime(await estimateExportTime())
      setShowTimeEstimateDialog(true)
    } catch (error) {
      console.error('Error calculating estimate:', error)
      setEstimatedTime(60)
      setShowTimeEstimateDialog(true)
    } finally {
      setIsCalculatingEstimate(false)
    }
  }, [estimateExportTime])

  const handleConfirmExport = useCallback(async () => {
    if (!selectedFormat || !campagna) return

    const format = selectedFormat
    setShowTimeEstimateDialog(false)

    await startExport(
      campagnaId,
      campagna.nome || 'Campagna',
      format,
      async (onProgress, signal) => {
        const { data, error } = await getIndividuazioniForExport(campagnaId, progress => {
          onProgress({
            fetched: progress.fetched,
            total: progress.total,
            percentage: progress.percentage,
            phase: progress.phase,
            estimatedTimeRemaining: progress.estimatedTimeRemaining,
          })
        }, signal)

        if (signal.aborted) throw new Error('Export cancelled')
        if (error) throw error
        if (!data || data.length === 0) throw new Error('Nessun dato da esportare')

        onProgress({ fetched: data.length, total: data.length, percentage: 90, phase: 'formatting' })
        const formattedData = formatIndividuazioniForExport(data)
        if (signal.aborted) throw new Error('Export cancelled')

        onProgress({ fetched: data.length, total: data.length, percentage: 95, phase: 'generating' })
        const worksheet = XLSX.utils.json_to_sheet(formattedData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Individuazioni')
        worksheet['!cols'] = getColumnWidths(formattedData)

        const fileName = `individuazioni_${campagna.nome?.replace(/[^a-z0-9]/gi, '_') || campagnaId}_${new Date().toISOString().split('T')[0]}`
        if (signal.aborted) throw new Error('Export cancelled')
        onProgress({ fetched: data.length, total: data.length, percentage: 100, phase: 'done' })

        if (format === 'csv') {
          XLSX.writeFile(workbook, `${fileName}.csv`, { bookType: 'csv' })
        } else {
          XLSX.writeFile(workbook, `${fileName}.xlsx`, { bookType: 'xlsx' })
        }
      }
    )
  }, [campagna, campagnaId, selectedFormat, startExport])

  function resetIndividuazioni() {
    setIndividuazioni([])
    setTotalPages(0)
    setTotalCount(0)
  }

  return {
    campagna,
    individuazioni,
    loading,
    loadingData,
    loadingMore,
    showExportDialog,
    showTimeEstimateDialog,
    selectedFormat,
    estimatedTime,
    isCalculatingEstimate,
    exportButtonRef,
    page,
    pageSize,
    totalPages,
    totalCount,
    hasMore,
    searchTerm,
    searchField,
    statoFilter,
    setPage,
    setShowExportDialog,
    setShowTimeEstimateDialog,
    handleSearch,
    handleSearchFieldChange,
    handleStatoFilterChange,
    loadMore,
    handleExportDialogOpenChange,
    handleFormatSelect,
    handleConfirmExport,
  }
}

function getColumnWidths(formattedData: Record<string, unknown>[]) {
  return Object.keys(formattedData[0] || {}).map(key => ({
    wch: Math.min(50, Math.max(key.length, ...formattedData.map(row => String(row[key] || '').length))),
  }))
}

function logError(message: string, error: unknown) {
  const errorMessage = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null
      ? JSON.stringify(error)
      : String(error)
  console.error(message, errorMessage, error)
}
