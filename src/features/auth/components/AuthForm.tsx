'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithGoogle, signInWithPassword, signUpWithPassword } from '../services/auth.service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Separator } from '@/shared/components/ui/separator'
import { Music, Mail, Lock, LogIn, UserPlus } from 'lucide-react'

export function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const credentials = { email, password };
      if (isSignUp) {
        const { error } = await signUpWithPassword(credentials);
        if (error) throw error
        setMessage('Controlla la tua email per il link di conferma!')
      } else {
        const { error } = await signInWithPassword(credentials);
        if (error) throw error
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error
    } catch (error: unknown) {
      if (error instanceof Error) {
        setMessage(error.message)
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Music className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            RASI
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp ? 'Crea un nuovo account' : 'Accedi al tuo account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="password-input"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (isSignUp ? <UserPlus className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4 animate-spin" />) : (isSignUp ? <UserPlus className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />)}
              {isSignUp ? 'Registrati' : 'Accedi'}
            </Button>
            {message && <p data-testid="auth-message" className="text-sm text-center text-red-500">{message}</p>}
          </form>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-2 text-muted-foreground">
                Oppure continua con
              </span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogleAuth} data-testid="google-auth-button">
            <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
              <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fillOpacity="0.1" fill="#FFC107"/>
              <path d="M24 46c5.9 0 11.2-2.2 15-5.8l-6.4-6.4C30.1 37 27.1 38 24 38c-4.9 0-9.1-3.2-10.7-7.5H6.3v6.3C10.2 42.6 16.6 46 24 46z" fill="#4CAF50"/>
              <path d="M24 46c5.9 0 11.2-2.2 15-5.8l-6.4-6.4C30.1 37 27.1 38 24 38c-4.9 0-9.1-3.2-10.7-7.5H6.3v6.3C10.2 42.6 16.6 46 24 46z" fillOpacity="0.1" fill="#4CAF50"/>
              <path d="M43.6 29.5c2.3-2.7 3.9-6.1 3.9-9.9 0-1.3-.2-2.7-.5-4H24v8.5h11.8c-.5 2.9-2.2 5.4-4.7 7.1l6.5 6.3z" fill="#1976D2"/>
            </svg>
            Google
          </Button>
          <p className="text-center text-sm text-gray-600">
            {isSignUp ? (
              <>
                Hai già un account?{' '}
                <button type="button" onClick={() => setIsSignUp(false)} className="font-medium text-blue-600 hover:text-blue-500" data-testid="switch-to-signin">
                  Accedi
                </button>
              </>
            ) : (
              <>
                Non hai un account?{' '}
                <button type="button" onClick={() => setIsSignUp(true)} className="font-medium text-blue-600 hover:text-blue-500" data-testid="switch-to-signup">
                  Registrati
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
