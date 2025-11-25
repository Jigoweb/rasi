import { supabase } from '@/shared/lib/supabase'

interface EmailPasswordCredentials {
    email: string;
    password: string;
}

/**
 * Signs up a new user with email and password.
 * @param credentials - The user's email and password.
 * @returns An object with an error property if the sign-up fails.
 */
export const signUpWithPassword = async (credentials: EmailPasswordCredentials) => {
  const { email, password } = credentials
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${location.origin}/auth/callback`
    }
  })
  return { error }
}

/**
 * Signs in a user with email and password.
 * @param credentials - The user's email and password.
 * @returns An object with an error property if the sign-in fails.
 */
export const signInWithPassword = async (credentials: EmailPasswordCredentials) => {
  const { error } = await supabase.auth.signInWithPassword(credentials)
  return { error }
}

/**
 * Signs in a user with Google OAuth.
 * @returns An object with an error property if the sign-in fails.
 */
export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${location.origin}/auth/callback`
    }
  })
  return { error }
}
