import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  validateRoleChange,
  mergeAppMetadataWithRole,
} from './role-update'
import {
  readAppMetadataRole,
  readAuthoritativeUserRole,
  resolveUserRole,
  VALID_USER_ROLES,
} from '@/shared/lib/auth-permissions'
import { validateUserInvite } from './invite'
import { findUserByArtistaId } from './find-by-artista'
import {
  resolveAuthInviteOrigin,
  buildAuthInviteRedirectUrl,
  sendResendAccessEmail,
} from './resend-access'
// Lazy initialization of admin client
let supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Configurazione mancante: assicurati che NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY siano definiti in .env.local'
    )
  }

  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  return supabaseAdmin
}

// Helper to verify the requesting user is an admin
async function verifyAdminUser(req: NextRequest): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  const authHeader = req.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { isAdmin: false, error: 'Token di autorizzazione mancante' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return { isAdmin: false, error: 'Configurazione Supabase mancante' }
  }

  const token = authHeader.substring(7)
  const tempClient = createClient(supabaseUrl, anonKey)
  
  const { data: { user }, error } = await tempClient.auth.getUser(token)
  
  if (error || !user) {
    return { isAdmin: false, error: 'Token non valido o utente non trovato' }
  }

  const userRole = readAuthoritativeUserRole(user)
  const canManageUsers = userRole === 'admin' || userRole === 'operatore'
  
  if (!canManageUsers) {
    return { isAdmin: false, userId: user.id, error: 'Accesso negato: solo amministratori e operatori possono gestire gli utenti' }
  }

  return { isAdmin: userRole === 'admin', userId: user.id }
}

/**
 * GET /api/users
 * - Senza query: lista tutti gli utenti (admin e operatori)
 * - Con ?artista_id=: lookup account collegato a un artista
 */
export async function GET(req: NextRequest) {
  try {
    const { error } = await verifyAdminUser(req)

    if (error) {
      return NextResponse.json({ success: false, error }, { status: 403 })
    }

    const artistaId = req.nextUrl.searchParams.get('artista_id')

    // Use admin API to list all users
    const adminClient = getSupabaseAdmin()
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()

    if (listError) {
      console.error('Errore listUsers:', listError)
      return NextResponse.json({ success: false, error: listError.message }, { status: 500 })
    }

    if (artistaId) {
      const linked = findUserByArtistaId(users, artistaId)
      if (!linked) {
        return NextResponse.json({
          success: true,
          data: { linked: false },
        })
      }
      return NextResponse.json({
        success: true,
        data: { linked: true, user: linked },
      })
    }

    // Ruolo solo da app_metadata. Assente o non valido → collecting (fail-closed).
    const mappedUsers = users.map(u => {
      const ruolo = resolveUserRole(readAppMetadataRole(u.app_metadata))
      // Un utente si considera "verificato" solo se ha effettivamente
      // accettato l'invito/confermato la mail (last_sign_in_at presente),
      // oppure se non è un invitato (nessun invited_at).
      const isPendingInvite = !!u.invited_at && !u.last_sign_in_at
      return {
        id: u.id,
        email: u.email,
        ruolo,
        artista_id: u.user_metadata?.artista_id || null,
        email_verified: u.email_confirmed_at !== null && !isPendingInvite,
        invited_at: u.invited_at || null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }
    })

    return NextResponse.json({ 
      success: true, 
      data: mappedUsers 
    })

  } catch (error: any) {
    console.error('Errore inatteso GET /api/users:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/users
 * Invita un utente via email.
 * Body: { email: string, ruolo?: UserRole, artista_id?: string }
 * - artista: artista_id obbligatorio, collegato a un record artisti esistente
 * - admin/operatore: solo email
 * Admin può invitare admin, operatore e artista.
 * Operatore può invitare operatore e artista.
 */
export async function POST(req: NextRequest) {
  try {
    const { isAdmin, error } = await verifyAdminUser(req)

    // verifyAdminUser restituisce error solo se non è admin/operatore
    // isAdmin=false + no error = è un operatore (canManageUsers=true)
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 403 })
    }

    const body = await req.json()
    const { email, artista_id, ruolo, action, userId: targetUserId } = body
    const inviteRedirectTo = buildAuthInviteRedirectUrl(
      resolveAuthInviteOrigin(
        process.env.NEXT_PUBLIC_SITE_URL,
        req.headers.get('origin')
      )
    )

    // Reinvio invito o reset accesso per utente Auth già esistente
    if (action === 'resend_invite') {
      if (!targetUserId) {
        return NextResponse.json({ success: false, error: 'userId è obbligatorio per reinvio' }, { status: 400 })
      }
      const adminClient = getSupabaseAdmin()
      const { data: { user: targetUser }, error: getUserError } = await adminClient.auth.admin.getUserById(targetUserId)
      if (getUserError || !targetUser) {
        return NextResponse.json({ success: false, error: 'Utente non trovato' }, { status: 404 })
      }
      const resend = await sendResendAccessEmail(
        {
          id: targetUser.id,
          email: targetUser.email,
          email_confirmed_at: targetUser.email_confirmed_at,
          last_sign_in_at: targetUser.last_sign_in_at,
          app_metadata: (targetUser.app_metadata ?? null) as Record<string, unknown> | null,
          user_metadata: (targetUser.user_metadata ?? null) as Record<string, unknown> | null,
        },
        resolveAuthInviteOrigin(
          process.env.NEXT_PUBLIC_SITE_URL,
          req.headers.get('origin')
        ),
        {
          inviteUserByEmail: (targetEmail, options) =>
            adminClient.auth.admin.inviteUserByEmail(targetEmail, options),
          resetPasswordForEmail: (targetEmail, options) =>
            adminClient.auth.resetPasswordForEmail(targetEmail, options),
          updateUserAccess: async (userId, attributes) => {
            const { error } = await adminClient.auth.admin.updateUserById(userId, attributes)
            return { error }
          },
        }
      )
      if (!resend.ok) {
        return NextResponse.json(
          { success: false, error: resend.error },
          { status: resend.status }
        )
      }
      return NextResponse.json({ success: true, method: resend.method })
    }

    const validation = validateUserInvite({
      actorIsAdmin: isAdmin,
      email,
      ruolo,
      artista_id,
    })

    if (!validation.ok) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: validation.status }
      )
    }

    const adminClient = getSupabaseAdmin()
    const { data: { users: existingUsers } } = await adminClient.auth.admin.listUsers()

    const existingEmail = existingUsers.find(u => u.email === validation.email)
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: `L'email ${validation.email} è già registrata nel sistema` },
        { status: 409 }
      )
    }

    let artistaNome: string | null = null

    if (validation.ruolo === 'artista' && validation.artistaId) {
      const { data: artista, error: artistaError } = await adminClient
        .from('artisti')
        .select('id, nome, cognome, codice_ipn')
        .eq('id', validation.artistaId)
        .single()

      if (artistaError || !artista) {
        return NextResponse.json(
          { success: false, error: 'Record artista non trovato' },
          { status: 404 }
        )
      }

      const alreadyLinked = existingUsers.find(
        u => u.user_metadata?.artista_id === validation.artistaId
      )

      if (alreadyLinked) {
        return NextResponse.json(
          { success: false, error: `Questo artista è già collegato all'utente ${alreadyLinked.email}` },
          { status: 409 }
        )
      }

      artistaNome = `${artista.nome} ${artista.cognome}`
    }

    // inviteUserByEmail scrive `data` in user_metadata. Il ruolo va solo in app_metadata.
    const inviteUserMetadata: Record<string, unknown> = {}
    if (validation.artistaId) {
      inviteUserMetadata.artista_id = validation.artistaId
    }

    const { data: invitedUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      validation.email,
      {
        data: inviteUserMetadata,
        redirectTo: inviteRedirectTo
      }
    )

    if (inviteError || !invitedUser?.user) {
      console.error('Errore inviteUserByEmail:', inviteError)
      return NextResponse.json({ success: false, error: inviteError?.message || 'Invito non riuscito' }, { status: 500 })
    }

    const { error: roleError } = await adminClient.auth.admin.updateUserById(
      invitedUser.user.id,
      {
        app_metadata: mergeAppMetadataWithRole(
          invitedUser.user.app_metadata as Record<string, unknown> | undefined,
          validation.ruolo
        ),
      }
    )

    if (roleError) {
      console.error('Errore assegnazione app_metadata.ruolo:', roleError)
      return NextResponse.json(
        {
          success: false,
          error: 'Invito creato ma il ruolo non è stato salvato in app_metadata. Riassegna il ruolo prima che l’utente acceda.',
          data: { id: invitedUser.user.id, email: invitedUser.user.email },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: invitedUser.user.id,
        email: invitedUser.user.email,
        ruolo: validation.ruolo,
        artista_id: validation.artistaId,
        artista_nome: artistaNome,
      }
    })

  } catch (error: any) {
    console.error('Errore inatteso POST /api/users:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/users
 * Aggiorna ruolo o email di un utente.
 * - Cambio ruolo: admin (qualsiasi); operatore fino a operatore (mai admin)
 * - Cambio email: admin e operatori
 * Body: { userId: string, ruolo?: string, email?: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { isAdmin, userId: actorUserId, error } = await verifyAdminUser(req)

    // Blocca utenti senza permessi (non admin/operatore)
    if (error || !actorUserId) {
      return NextResponse.json({ success: false, error: error || 'Accesso negato' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, ruolo, email } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId è obbligatorio' },
        { status: 400 }
      )
    }

    if (!ruolo && !email) {
      return NextResponse.json(
        { success: false, error: 'Specificare almeno ruolo o email da aggiornare' },
        { status: 400 }
      )
    }

    const adminClient = getSupabaseAdmin()
    const updates: {
      app_metadata?: Record<string, unknown>
      email?: string
    } = {}

    if (ruolo) {
      const { data: { user: targetUser }, error: getUserError } =
        await adminClient.auth.admin.getUserById(userId)

      if (getUserError || !targetUser) {
        return NextResponse.json({ success: false, error: 'Utente non trovato' }, { status: 404 })
      }

      const currentRole = readAppMetadataRole(targetUser.app_metadata)
      if (!currentRole || !(VALID_USER_ROLES as readonly string[]).includes(currentRole)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Ruolo autoritativo assente in app_metadata. Eseguire il backfill prima di modificare i ruoli.',
          },
          { status: 409 }
        )
      }

      const validation = validateRoleChange({
        actorIsAdmin: isAdmin,
        actorUserId,
        targetUserId: userId,
        targetCurrentRole: currentRole,
        newRole: ruolo,
      })

      if (!validation.ok) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: validation.status }
        )
      }

      updates.app_metadata = mergeAppMetadataWithRole(
        targetUser.app_metadata as Record<string, unknown> | undefined,
        validation.ruolo
      )
    }

    if (email) updates.email = email

    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      updates
    )

    if (updateError) {
      console.error('Errore updateUserById:', updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        ruolo: readAppMetadataRole(updatedUser.user.app_metadata) || 'collecting',
      }
    })

  } catch (error: any) {
    console.error('Errore inatteso PATCH /api/users:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/users
 * Elimina un utente (solo admin, non può eliminare se stesso)
 * Body: { userId: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { isAdmin, userId: adminUserId, error } = await verifyAdminUser(req)

    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        error: error || 'Solo gli amministratori possono eliminare utenti'
      }, { status: 403 })
    }

    const body = await req.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId è obbligatorio' },
        { status: 400 }
      )
    }

    if (userId === adminUserId) {
      return NextResponse.json(
        { success: false, error: 'Non puoi eliminare il tuo stesso account' },
        { status: 400 }
      )
    }

    const adminClient = getSupabaseAdmin()
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Errore deleteUser:', deleteError)
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Errore inatteso DELETE /api/users:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

