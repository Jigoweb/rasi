import { supabase } from '@/shared/lib/supabase';
import { signUpWithPassword, signInWithPassword, signInWithGoogle } from './auth.service';

// Mock Supabase client
jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  },
}));

describe('Auth Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signUpWithPassword', () => {
    it('should call supabase.auth.signUp with correct credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({ error: null });

      await signUpWithPassword(credentials);

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: credentials.email,
        password: credentials.password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });
    });

    it('should return an error if signUp fails', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const mockError = new Error('Sign up failed');
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({ error: mockError });

      const { error } = await signUpWithPassword(credentials);

      expect(error).toBe(mockError);
    });
  });

  describe('signInWithPassword', () => {
    it('should call supabase.auth.signInWithPassword with correct credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });

      await signInWithPassword(credentials);

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith(credentials);
    });

    it('should return an error if signIn fails', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      const mockError = new Error('Sign in failed');
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: mockError });

      const { error } = await signInWithPassword(credentials);

      expect(error).toBe(mockError);
    });
  });

  describe('signInWithGoogle', () => {
    it('should call supabase.auth.signInWithOAuth with google provider', async () => {
      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({ error: null });

      await signInWithGoogle();

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${location.origin}/auth/callback`,
        },
      });
    });

    it('should return an error if google signIn fails', async () => {
      const mockError = new Error('Google sign in failed');
      (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({ error: mockError });

      const { error } = await signInWithGoogle();

      expect(error).toBe(mockError);
    });
  });
});
