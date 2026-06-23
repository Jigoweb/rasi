import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseServer } from '@/shared/lib/supabase-server'

const AUTH_REQUIRED_ERROR = 'Autenticazione richiesta'
const CAMPAIGN_ACCESS_ERROR = 'Campagna non trovata o non autorizzata'

type AuthSuccess = {
  authenticated: true
  userId: string
}

type AuthFailure = {
  authenticated: false
  response: NextResponse
}

export type CampagneIndividuazioneAuthResult = AuthSuccess | AuthFailure

type CampaignAuthorizationSuccess = {
  authorized: true
  campagneProgrammazioneId: string
  campagneIndividuazioneId?: string
}

type CampaignAuthorizationFailure = {
  authorized: false
  response: NextResponse
}

export type CampagneIndividuazioneAuthorizationResult =
  | CampaignAuthorizationSuccess
  | CampaignAuthorizationFailure

const authRequiredResponse = () =>
  NextResponse.json(
    { success: false, error: AUTH_REQUIRED_ERROR },
    { status: 401 }
  )

const campaignAccessDeniedResponse = () =>
  NextResponse.json(
    { success: false, error: CAMPAIGN_ACCESS_ERROR },
    { status: 404 }
  )

const authorizationQueryErrorResponse = () =>
  NextResponse.json(
    { success: false, error: 'Errore verifica autorizzazione campagna' },
    { status: 500 }
  )

const getBearerToken = (authorizationHeader: string | null): string | null => {
  if (!authorizationHeader) return null

  const [scheme, token, ...rest] = authorizationHeader.trim().split(/\s+/)
  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) return null

  return token
}

export const requireCampagneIndividuazioneAuth = async (
  req: NextRequest
): Promise<CampagneIndividuazioneAuthResult> => {
  const token = getBearerToken(req.headers.get('authorization'))
  if (!token) return { authenticated: false, response: authRequiredResponse() }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error } = await authClient.auth.getUser(token)

    if (error || !user?.id) {
      return { authenticated: false, response: authRequiredResponse() }
    }

    return { authenticated: true, userId: user.id }
  } catch {
    return { authenticated: false, response: authRequiredResponse() }
  }
}

export const requireCampagnaProgrammazioneOwner = async (
  campagneProgrammazioneId: string,
  userId: string
): Promise<CampagneIndividuazioneAuthorizationResult> => {
  const { data, error } = await (supabaseServer as any)
    .from('campagne_programmazione')
    .select('id')
    .eq('id', campagneProgrammazioneId)
    .eq('created_by', userId)
    .maybeSingle()

  if (error) {
    console.error('Errore verifica owner campagna:', error)
    return { authorized: false, response: authorizationQueryErrorResponse() }
  }

  if (!data?.id) {
    return { authorized: false, response: campaignAccessDeniedResponse() }
  }

  return { authorized: true, campagneProgrammazioneId: data.id }
}

export const requireCampagnaIndividuazioneAccess = async (
  campagneIndividuazioneId: string,
  userId: string,
  expectedCampagneProgrammazioneId?: string
): Promise<CampagneIndividuazioneAuthorizationResult> => {
  const { data, error } = await (supabaseServer as any)
    .from('campagne_individuazione')
    .select('id, campagne_programmazione_id')
    .eq('id', campagneIndividuazioneId)
    .maybeSingle()

  if (error) {
    console.error('Errore verifica accesso campagna individuazione:', error)
    return { authorized: false, response: authorizationQueryErrorResponse() }
  }

  const campagneProgrammazioneId = data?.campagne_programmazione_id
  if (
    !data?.id ||
    !campagneProgrammazioneId ||
    (expectedCampagneProgrammazioneId &&
      campagneProgrammazioneId !== expectedCampagneProgrammazioneId)
  ) {
    return { authorized: false, response: campaignAccessDeniedResponse() }
  }

  const ownerAuthorization = await requireCampagnaProgrammazioneOwner(
    campagneProgrammazioneId,
    userId
  )
  if (!ownerAuthorization.authorized) return ownerAuthorization

  return {
    authorized: true,
    campagneIndividuazioneId: data.id,
    campagneProgrammazioneId,
  }
}
