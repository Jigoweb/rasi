import { useState, type Dispatch, type SetStateAction } from 'react'
import {
  deleteCampagnaProgrammazione,
  getDeleteCampagnaProgrammazioneInfo,
  type CampagnaProgrammazione,
  type DeleteCampagnaProgrammazioneInfo,
} from '@/features/programmazioni/services/programmazioni.service'
import { notifyError, notifySuccess } from '@/shared/lib/toast'

export type BulkDeleteItemInfo = {
  campagna: CampagnaProgrammazione
  info: DeleteCampagnaProgrammazioneInfo | null
  error?: string
}

interface UseProgrammazioniDeleteOptions {
  updateCampagne: Dispatch<SetStateAction<CampagnaProgrammazione[]>>
  onDeleted?: (ids: string[]) => void
}

export function useProgrammazioniDelete({ updateCampagne, onDeleted }: UseProgrammazioniDeleteOptions) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [campagnaToDelete, setCampagnaToDelete] = useState<CampagnaProgrammazione | null>(null)
  const [deleteInfo, setDeleteInfo] = useState<DeleteCampagnaProgrammazioneInfo | null>(null)
  const [isLoadingDeleteInfo, setIsLoadingDeleteInfo] = useState(false)
  const [isDeletingCampagna, setIsDeletingCampagna] = useState(false)

  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [bulkDeleteItems, setBulkDeleteItems] = useState<BulkDeleteItemInfo[]>([])
  const [isLoadingBulkDeleteInfo, setIsLoadingBulkDeleteInfo] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const openDeleteDialog = async (campagna: CampagnaProgrammazione) => {
    setCampagnaToDelete(campagna)
    setIsDeleteDialogOpen(true)
    setIsLoadingDeleteInfo(true)
    setDeleteInfo(null)

    try {
      const { data, error } = await getDeleteCampagnaProgrammazioneInfo(campagna.id)
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
    setIsDeleteDialogOpen(false)
    setCampagnaToDelete(null)
    setDeleteInfo(null)
  }

  const confirmDelete = async () => {
    if (!campagnaToDelete) return

    setIsDeletingCampagna(true)
    try {
      updateCampagne(prev => prev.map(c => (
        c.id === campagnaToDelete.id ? { ...c, stato: 'deleting' } : c
      )))

      const { error, blocked, blockReason } = await deleteCampagnaProgrammazione(campagnaToDelete.id)

      if (blocked) {
        notifyError('Eliminazione bloccata', blockReason)
        updateCampagne(prev => prev.map(c => (
          c.id === campagnaToDelete.id ? { ...c, stato: 'error' } : c
        )))
        return
      }

      if (error) throw error

      updateCampagne(prev => prev.filter(c => c.id !== campagnaToDelete.id))
      onDeleted?.([campagnaToDelete.id])
      closeDeleteDialog()
      notifySuccess('Campagna eliminata')
    } catch (error) {
      console.error('Error deleting campagna:', error)
      notifyError('Eliminazione campagna non riuscita', error)
      updateCampagne(prev => prev.map(c => (
        c.id === campagnaToDelete.id ? { ...c, stato: 'error' } : c
      )))
    } finally {
      setIsDeletingCampagna(false)
    }
  }

  const openBulkDeleteDialog = async (campagne: CampagnaProgrammazione[]) => {
    if (campagne.length === 0) return

    setIsBulkDeleteDialogOpen(true)
    setIsLoadingBulkDeleteInfo(true)
    setBulkDeleteItems(campagne.map(campagna => ({ campagna, info: null })))

    try {
      const results = await Promise.all(
        campagne.map(async (campagna) => {
          try {
            const { data, error } = await getDeleteCampagnaProgrammazioneInfo(campagna.id)
            if (error) throw error
            return { campagna, info: data } satisfies BulkDeleteItemInfo
          } catch (error) {
            return {
              campagna,
              info: null,
              error: error instanceof Error ? error.message : 'Errore caricamento dettagli',
            } satisfies BulkDeleteItemInfo
          }
        })
      )
      setBulkDeleteItems(results)
    } finally {
      setIsLoadingBulkDeleteInfo(false)
    }
  }

  const closeBulkDeleteDialog = () => {
    setIsBulkDeleteDialogOpen(false)
    setBulkDeleteItems([])
  }

  const confirmBulkDelete = async () => {
    const deletable = bulkDeleteItems.filter(item => item.info && item.info.scenario !== 'has_individuazione')
    if (deletable.length === 0) return

    setIsBulkDeleting(true)
    const deletedIds: string[] = []
    let blockedCount = 0
    let errorCount = 0

    try {
      const ids = deletable.map(item => item.campagna.id)
      updateCampagne(prev => prev.map(c => (
        ids.includes(c.id) ? { ...c, stato: 'deleting' } : c
      )))

      for (const item of deletable) {
        const { error, blocked, blockReason } = await deleteCampagnaProgrammazione(item.campagna.id)
        if (blocked) {
          blockedCount += 1
          updateCampagne(prev => prev.map(c => (
            c.id === item.campagna.id ? { ...c, stato: item.campagna.stato } : c
          )))
          notifyError(`Eliminazione bloccata: ${item.campagna.nome}`, blockReason)
          continue
        }
        if (error) {
          errorCount += 1
          updateCampagne(prev => prev.map(c => (
            c.id === item.campagna.id ? { ...c, stato: 'error' } : c
          )))
          continue
        }
        deletedIds.push(item.campagna.id)
      }

      if (deletedIds.length > 0) {
        updateCampagne(prev => prev.filter(c => !deletedIds.includes(c.id)))
        onDeleted?.(deletedIds)
      }

      closeBulkDeleteDialog()

      if (deletedIds.length > 0 && blockedCount === 0 && errorCount === 0) {
        notifySuccess(
          deletedIds.length === 1
            ? 'Campagna eliminata'
            : `${deletedIds.length} campagne eliminate`
        )
      } else if (deletedIds.length > 0) {
        notifySuccess(
          `${deletedIds.length} eliminate` +
          (blockedCount > 0 ? `, ${blockedCount} bloccate` : '') +
          (errorCount > 0 ? `, ${errorCount} con errore` : '')
        )
      } else if (errorCount > 0) {
        notifyError('Eliminazione bulk non riuscita')
      }
    } finally {
      setIsBulkDeleting(false)
    }
  }

  return {
    isDeleteDialogOpen,
    campagnaToDelete,
    deleteInfo,
    isLoadingDeleteInfo,
    isDeletingCampagna,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    isBulkDeleteDialogOpen,
    bulkDeleteItems,
    isLoadingBulkDeleteInfo,
    isBulkDeleting,
    openBulkDeleteDialog,
    closeBulkDeleteDialog,
    confirmBulkDelete,
  }
}
