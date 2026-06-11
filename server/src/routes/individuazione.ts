import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { createJob, findActiveJob } from '../jobs/store.js'
import { runIndividuazioneJob } from '../jobs/individuazione-runner.js'

export const individuazioneRouter = Router()

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/individuazione/start
 * Avvia (o riprende) l'individuazione di una campagna programmazione.
 * Risponde subito con il jobId; l'elaborazione prosegue in background.
 */
individuazioneRouter.post('/start', requireAuth, async (req, res) => {
  const {
    campagne_programmazione_id,
    soglia_titolo,
    artista_ids,
    nome_campagna,
    descrizione,
    resume,
  } = req.body ?? {}

  if (!campagne_programmazione_id || !UUID_RE.test(campagne_programmazione_id)) {
    return res.status(400).json({ success: false, error: 'campagne_programmazione_id non valido' })
  }

  try {
    // Evita doppi avvii concorrenti sulla stessa campagna.
    const active = await findActiveJob(campagne_programmazione_id)
    if (active) {
      return res.status(409).json({
        success: false,
        error: 'Esiste già un job attivo per questa campagna',
        error_code: 'JOB_ALREADY_RUNNING',
        job_id: active.id,
      })
    }

    const job = await createJob({
      tipo: 'individuazione',
      campagne_programmazione_id,
      created_by: req.userId ?? null,
    })

    // Fire-and-forget: non attendiamo il completamento del job.
    void runIndividuazioneJob({
      jobId: job.id,
      campagneProgrammazioneId: campagne_programmazione_id,
      userId: req.userId!,
      sogliaItolo: soglia_titolo,
      artistaIds: artista_ids ?? null,
      nomeCampagna: nome_campagna,
      descrizione,
      resume: resume === true,
    })

    return res.status(202).json({ success: true, job_id: job.id })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Errore avvio job' })
  }
})
