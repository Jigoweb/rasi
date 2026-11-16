import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { findActiveJob, userCanManageCampagnaProgrammazione } from '../jobs/store.js'
import { findActiveUploadJob } from '../jobs/upload-job-store.js'
import { runRiprocessoCampi } from '../jobs/riprocessa-campi.js'
import { isValidUploadStoragePath } from './upload-programmazioni.js'

export const riprocessaCampiRouter = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ROLES = new Set(['admin', 'operatore'])

/**
 * POST /api/riprocessa-campi
 * «Correggi dati dal file»: con `applica: false` restituisce l'anteprima
 * (righe ritrovate, cambi, esempi) senza scrivere; con `applica: true`
 * aggiorna data, orari e titoli e riallinea le individuazioni.
 * Solo admin e Operatore pro.
 */
riprocessaCampiRouter.post('/', requireAuth, async (req, res) => {
  const { campagne_programmazione_id, storage_path, file_name, applica } = req.body ?? {}

  if (!ROLES.has(req.userRole ?? '')) {
    return res.status(403).json({ success: false, error: 'Solo amministratori e Operatori pro possono correggere i dati' })
  }
  if (!campagne_programmazione_id || !UUID_RE.test(campagne_programmazione_id)) {
    return res.status(400).json({ success: false, error: 'campagne_programmazione_id non valido' })
  }
  if (!isValidUploadStoragePath(storage_path, req.userId!, campagne_programmazione_id)) {
    return res.status(400).json({ success: false, error: 'storage_path non valido' })
  }
  if (!file_name || typeof file_name !== 'string') {
    return res.status(400).json({ success: false, error: 'file_name non valido' })
  }

  try {
    const access = await userCanManageCampagnaProgrammazione(campagne_programmazione_id, req.userId!, req.userRole)
    if (!access) {
      return res.status(404).json({ success: false, error: 'Campagna non trovata o non autorizzata' })
    }
    if (await findActiveUploadJob(campagne_programmazione_id)) {
      return res.status(409).json({ success: false, error: 'Caricamento in corso su questa campagna: riprova al termine' })
    }
    if (await findActiveJob(campagne_programmazione_id)) {
      return res.status(409).json({ success: false, error: 'Individuazione in corso su questa campagna: riprova al termine' })
    }

    const esito = await runRiprocessoCampi({
      campagnaProgrammazioneId: campagne_programmazione_id,
      storagePath: storage_path,
      fileName: file_name,
      applica: applica === true,
      userId: req.userId!,
    })
    return res.json({ success: true, data: esito })
  } catch (error: any) {
    console.error('[riprocessa-campi]', error)
    return res.status(500).json({ success: false, error: error.message || 'Correzione non riuscita' })
  }
})
