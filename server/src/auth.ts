import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from './supabase.js'

// Estende Request con userId, popolato dal middleware.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

/**
 * Middleware: richiede un Bearer token Supabase valido.
 * Popola `req.userId` per il lock e la tracciabilità del job.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token mancante' })
  }

  const token = authHeader.substring(7)
  try {
    const userId = await verifyToken(token)
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Token non valido' })
    }
    req.userId = userId
    next()
  } catch (error: any) {
    return res.status(401).json({ success: false, error: 'Errore verifica token' })
  }
}
