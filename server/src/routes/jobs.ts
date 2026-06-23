import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { getJobForUser } from '../jobs/store.js'

export const jobsRouter = Router()

/**
 * GET /api/jobs/:id
 * Stato/avanzamento di un job. Il client fa polling di questo endpoint.
 */
jobsRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const job = await getJobForUser(req.params.id, req.userId!)
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job non trovato' })
    }
    return res.json({ success: true, data: job })
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Errore lettura job' })
  }
})
