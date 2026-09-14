export type ArtistaInviteStatus = 'non_invitato' | 'in_attesa' | 'attivo'

export type LinkedInviteUser = {
  id: string
  email: string | null
  invited_at: string | null
  last_sign_in_at: string | null
}

export type ArtistaAccessAction = 'invite' | 'resend' | 'reset'

export type ArtistaInviteStatusResult = {
  status: ArtistaInviteStatus
  label: string
  user: LinkedInviteUser | null
  accessAction: ArtistaAccessAction
  accessActionLabel: string
}

/**
 * Deriva lo stato accesso portale da un utente Auth collegato (o null).
 */
export function deriveArtistaInviteStatus(
  linkedUser: LinkedInviteUser | null
): ArtistaInviteStatusResult {
  if (!linkedUser) {
    return {
      status: 'non_invitato',
      label: 'Non invitato',
      user: null,
      accessAction: 'invite',
      accessActionLabel: 'Invita',
    }
  }

  if (!linkedUser.last_sign_in_at) {
    return {
      status: 'in_attesa',
      label: 'Invito in attesa',
      user: linkedUser,
      accessAction: 'resend',
      accessActionLabel: 'Reinvia',
    }
  }

  return {
    status: 'attivo',
    label: 'Attivo',
    user: linkedUser,
    accessAction: 'reset',
    accessActionLabel: 'Reset accesso',
  }
}
