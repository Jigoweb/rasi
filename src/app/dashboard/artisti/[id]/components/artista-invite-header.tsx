'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/shared/contexts/auth-context'
import { supabase } from '@/shared/lib/supabase-client'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { AlertCircle, CheckCircle2, Loader2, Mail, RefreshCw } from 'lucide-react'
import {
  deriveArtistaInviteStatus,
  type ArtistaInviteStatusResult,
  type LinkedInviteUser,
} from '@/features/artisti/lib/artista-invite-status'

type Props = {
  artistaId: string
  contactEmail?: string | null
}

function statusBadgeClass(status: ArtistaInviteStatusResult['status']): string {
  switch (status) {
    case 'attivo':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'in_attesa':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export function ArtistaInviteHeader({ artistaId, contactEmail }: Props) {
  const { canManageUsers, loading: authLoading } = useAuth()
  const [statusResult, setStatusResult] = useState<ArtistaInviteStatusResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const refreshStatus = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoadError('Sessione scaduta')
        setStatusResult(deriveArtistaInviteStatus(null))
        return
      }

      const response = await fetch(
        `/api/users?artista_id=${encodeURIComponent(artistaId)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Errore nel caricamento stato invito')
      }

      const linkedUser: LinkedInviteUser | null = result.data?.linked
        ? {
            id: result.data.user.id,
            email: result.data.user.email ?? null,
            invited_at: result.data.user.invited_at ?? null,
            last_sign_in_at: result.data.user.last_sign_in_at ?? null,
          }
        : null

      setStatusResult(deriveArtistaInviteStatus(linkedUser))
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Errore sconosciuto')
      setStatusResult(deriveArtistaInviteStatus(null))
    } finally {
      setLoading(false)
    }
  }, [artistaId])

  useEffect(() => {
    if (!authLoading && canManageUsers) {
      refreshStatus()
    }
  }, [authLoading, canManageUsers, refreshStatus])

  if (authLoading || !canManageUsers) {
    return null
  }

  const emailMismatch = !!(
    contactEmail &&
    inviteEmail &&
    contactEmail !== inviteEmail
  )

  function openInviteDialog() {
    setInviteEmail(contactEmail || '')
    setActionError(null)
    setActionSuccess(null)
    setDialogOpen(true)
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) {
      setActionError('Inserisci un indirizzo email')
      return
    }
    setSubmitting(true)
    setActionError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessione scaduta')

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          artista_id: artistaId,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Invito non inviato')

      setActionSuccess('Invito inviato')
      setDialogOpen(false)
      await refreshStatus()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Errore invito')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    const userId = statusResult?.user?.id
    if (!userId) return
    setSubmitting(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessione scaduta')

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resend_invite',
          userId,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Reinvio fallito')

      setActionSuccess(
        result.method === 'recovery'
          ? 'Email per reimpostare la password inviata'
          : 'Invito reinviato'
      )
      await refreshStatus()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Errore reinvio')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {loading || !statusResult ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Badge variant="outline" className={statusBadgeClass(statusResult.status)}>
              Portale: {statusResult.label}
            </Badge>
            {statusResult.user?.email && statusResult.status !== 'non_invitato' && (
              <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                {statusResult.user.email}
              </span>
            )}
            {statusResult.accessAction === 'invite' && (
              <Button size="sm" variant="outline" onClick={openInviteDialog} disabled={submitting}>
                <Mail className="h-4 w-4 mr-1" />
                Invita
              </Button>
            )}
            {(statusResult.accessAction === 'resend' || statusResult.accessAction === 'reset') && (
              <Button size="sm" variant="outline" onClick={handleResend} disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                {statusResult.accessActionLabel}
              </Button>
            )}
          </>
        )}
      </div>

      {(actionSuccess || actionError || loadError) && (
        <div className="w-full sm:w-auto text-xs">
          {actionSuccess && (
            <span className="text-green-700 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {actionSuccess}
            </span>
          )}
          {(actionError || loadError) && (
            <span className="text-red-600 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {actionError || loadError}
            </span>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invita al portale</DialogTitle>
            <DialogDescription>
              Invia un invito email per creare l&apos;account artista collegato a questo record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="artista@example.com"
                autoFocus
              />
            </div>
            {emailMismatch && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                L&apos;email inserita è diversa da quella nei contatti dell&apos;artista
                ({contactEmail}).
              </p>
            )}
            {actionError && (
              <p className="text-sm text-red-600">{actionError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Annulla
            </Button>
            <Button onClick={handleInvite} disabled={submitting || !inviteEmail.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Invio...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Invia invito
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
