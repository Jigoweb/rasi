import { Dispatch, SetStateAction, useState } from 'react'
import {
  deleteCampagnaIndividuazione,
  getDeleteCampagnaIndividuazioneInfo,
  type CampagnaIndividuazione,
  type DeleteCampagnaIndividuazioneInfo,
} from '@/features/individuazioni/services/individuazioni.service'
import { notifyError, notifySuccess } from '@/shared/lib/toast'

export type BulkDeleteIndividuazioneItem = {
  campagna: CampagnaIndividuazione
  info: DeleteCampagnaIndividuazioneInfo | null
  error?: string
}

interface UseIndividuazioniDeleteOptions {
  updateCampagne: Dispatch<SetStateAction<CampagnaIndividuazione[]>>
  onDeleted?: (ids: string[]) => void
}

export function useIndividuazioniDelete({ updateCampagne, onDeleted }: UseIndividuazioniDeleteOptions) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [campagnaToDelete, setCampagnaToDelete] = useState<CampagnaIndividuazione | null>(null)
  const [deleteInfo, setDeleteInfo] = useState<DeleteCampagnaIndividuazioneInfo | null>(null)
  const [isLoadingDeleteInfo, setIsLoadingDeleteInfo] = useState(false)
  const [isDeletingCampagna, setIsDeletingCampagna] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState<{ phase: string; deleted?: number; total?: number } | null>(null)

  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [bulkDeleteItems, setBulkDeleteItems] = useState<BulkDeleteIndividuazioneItem[]>([])
  const [isLoadingBulkDeleteInfo, setIsLoadingBulkDeleteInfo] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState<{
    current: number
    total: number
    campagnaNome: string
  } | null>(null)

  const openDeleteDialog = async (campagna: CampagnaIndividuazione) => {
    setCampagnaToDelete(campagna)
    setIsDeleteDialogOpen(true)
    setIsLoadingDeleteInfo(true)
    setDeleteInfo(null)
    setDeleteProgress(null)

    try {
      const { data, error } = await getDeleteCampagnaIndividuazioneInfo(campagna.id)
      if (error) throw error
      setDeleteInfo(data)
    } catch (error) {
      console.error('Error loading delete info:', error)
      notifyError('Impossibile caricare i dettagli di eliminazione', error)
    } finally {
      setIsLoadingDeleteInfo(false)
    }
  }

  const closeDeleteDialog = () => {
    if (isDeletingCampagna) return
    setIsDeleteDialogOpen(false)
    setCampagnaToDelete(null)
    setDeleteInfo(null)
    setDeleteProgress(null)
  }

  const confirmDelete = async () => {
    if (!campagnaToDelete) return

    setIsDeletingCampagna(true)
    setDeleteProgress({ phase: 'starting' })

    try {
      const { error } = await deleteCampagnaIndividuazione(
        campagnaToDelete.id,
        progress => setDeleteProgress(progress)
      )

      if (error) {
        notifyError("Errore durante l'eliminazione", error)
        return
      }

      updateCampagne(prev => prev.filter(c => c.id !== campagnaToDelete.id))
      onDeleted?.([campagnaToDelete.id])
      setIsDeleteDialogOpen(false)
      setCampagnaToDelete(null)
      setDeleteInfo(null)
      setDeleteProgress(null)
      notifySuccess('Campagna eliminata')
    } catch (error) {
      notifyError("Errore durante l'eliminazione", error)
    } finally {
      setIsDeletingCampagna(false)
      setDeleteProgress(null)
    }
  }

  const openBulkDeleteDialog = async (campagne: CampagnaIndividuazione[]) => {
    if (campagne.length === 0) return

    setIsBulkDeleteDialogOpen(true)
    setIsLoadingBulkDeleteInfo(true)
    setBulkDeleteItems(campagne.map(campagna => ({ campagna, info: null })))
    setBulkDeleteProgress(null)

    try {
      const results = await Promise.all(
        campagne.map(async (campagna) => {
          try {
            const { data, error } = await getDeleteCampagnaIndividuazioneInfo(campagna.id)
            if (error) throw error
            return { campagna, info: data } satisfies BulkDeleteIndividuazioneItem
          } catch (error) {
            return {
              campagna,
              info: null,
              error: error instanceof Error ? error.message : 'Errore caricamento dettagli',
            } satisfies BulkDeleteIndividuazioneItem
          }
        })
      )
      setBulkDeleteItems(results)
    } finally {
      setIsLoadingBulkDeleteInfo(false)
    }
  }

  const closeBulkDeleteDialog = () => {
    if (isBulkDeleting) return
    setIsBulkDeleteDialogOpen(false)
    setBulkDeleteItems([])
    setBulkDeleteProgress(null)
  }

  const confirmBulkDelete = async () => {
    const items = bulkDeleteItems.filter(item => item.info && !item.error)
    if (items.length === 0) return

    setIsBulkDeleting(true)
    const deletedIds: string[] = []
    let failures = 0

    try {
      for (let index = 0; index < items.length; index++) {
        const item = items[index]
        setBulkDeleteProgress({
          current: index + 1,
          total: items.length,
          campagnaNome: item.campagna.nome,
        })

        try {
          const { error } = await deleteCampagnaIndividuazione(item.campagna.id)
          if (error) throw error
          deletedIds.push(item.campagna.id)
        } catch (error) {
          failures += 1
          console.error('Bulk delete failed for', item.campagna.id, error)
        }
      }

      if (deletedIds.length > 0) {
        updateCampagne(prev => prev.filter(c => !deletedIds.includes(c.id)))
        onDeleted?.(deletedIds)
      }

      setIsBulkDeleteDialogOpen(false)
      setBulkDeleteItems([])
      setBulkDeleteProgress(null)

      if (failures === 0) {
        notifySuccess(
          deletedIds.length === 1
            ? 'Campagna eliminata'
            : `${deletedIds.length} campagne eliminate`
        )
      } else if (deletedIds.length > 0) {
        notifyError(
          `Eliminate ${deletedIds.length} campagne, ${failures} non riuscite`,
          `${failures} eliminazioni fallite`
        )
      } else {
        notifyError('Nessuna campagna eliminata', `${failures} eliminazioni fallite`)
      }
    } finally {
      setIsBulkDeleting(false)
      setBulkDeleteProgress(null)
    }
  }

  return {
    isDeleteDialogOpen,
    campagnaToDelete,
    deleteInfo,
    isLoadingDeleteInfo,
    isDeletingCampagna,
    deleteProgress,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    isBulkDeleteDialogOpen,
    bulkDeleteItems,
    isLoadingBulkDeleteInfo,
    isBulkDeleting,
    bulkDeleteProgress,
    openBulkDeleteDialog,
    closeBulkDeleteDialog,
    confirmBulkDelete,
  }
}
