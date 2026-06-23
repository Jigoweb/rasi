import { useCallback, useEffect, useState } from 'react'
import {
  getCampagneIndividuazione,
  getIndividuazioneProcessingProgress,
  type CampagnaIndividuazione,
  type IndividuazioneProcessingProgress,
} from '@/features/individuazioni/services/individuazioni.service'

interface UseIndividuazioniListOptions {
  resumeById: (campagneProgrammazioneId: string, nome?: string) => Promise<unknown>
  canStartProcess: (campagneProgrammazioneId: string) => boolean
}

export function useIndividuazioniList({
  resumeById,
  canStartProcess,
}: UseIndividuazioniListOptions) {
  const [campagne, setCampagne] = useState<CampagnaIndividuazione[]>([])
  const [loading, setLoading] = useState(true)
  const [resumingId, setResumingId] = useState<string | null>(null)
  const [processingProgressMap, setProcessingProgressMap] = useState<Record<string, IndividuazioneProcessingProgress | null>>({})
  const [loadingProgressMap, setLoadingProgressMap] = useState<Record<string, boolean>>({})

  const loadCampagne = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await getCampagneIndividuazione()
      if (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null
            ? JSON.stringify(error)
            : String(error)
        console.error('Errore caricamento campagne:', errorMessage, error)
        setCampagne([])
        return
      }
      setCampagne(data ?? [])
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : String(error)
      console.error('Errore caricamento campagne:', errorMessage, error)
      setCampagne([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProcessingProgress = useCallback(async (campagnaId: string) => {
    if (loadingProgressMap[campagnaId]) return

    setLoadingProgressMap(prev => ({ ...prev, [campagnaId]: true }))
    try {
      const { data, error } = await getIndividuazioneProcessingProgress(campagnaId)
      if (error) throw error
      setProcessingProgressMap(prev => ({ ...prev, [campagnaId]: data }))
    } catch (error) {
      console.error('Error fetching processing progress:', error)
    } finally {
      setLoadingProgressMap(prev => ({ ...prev, [campagnaId]: false }))
    }
  }, [loadingProgressMap])

  const handleResume = useCallback(async (campagna: CampagnaIndividuazione) => {
    if (!canStartProcess(campagna.campagne_programmazione_id)) return
    setResumingId(campagna.id)
    try {
      await resumeById(
        campagna.campagne_programmazione_id,
        campagna.campagne_programmazione?.nome ?? campagna.nome
      )
      await loadCampagne()
    } finally {
      setResumingId(null)
    }
  }, [canStartProcess, loadCampagne, resumeById])

  useEffect(() => {
    loadCampagne()
  }, [loadCampagne])

  useEffect(() => {
    campagne
      .filter(c => c.stato === 'in_corso' && !processingProgressMap[c.id] && !loadingProgressMap[c.id])
      .forEach(campagna => {
        void fetchProcessingProgress(campagna.id)
      })
  }, [campagne, fetchProcessingProgress, loadingProgressMap, processingProgressMap])

  return {
    campagne,
    setCampagne,
    loading,
    resumingId,
    processingProgressMap,
    loadingProgressMap,
    loadCampagne,
    fetchProcessingProgress,
    handleResume,
  }
}
