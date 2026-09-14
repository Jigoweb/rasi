import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArtistaInviteHeader } from './artista-invite-header'

const mockGetSession = jest.fn()

jest.mock('@/shared/contexts/auth-context', () => ({
  useAuth: () => ({ canManageUsers: true, loading: false }),
}))

jest.mock('@/shared/lib/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))

describe('ArtistaInviteHeader', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
    })
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('shows Reset accesso for a linked artist who already signed in', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          linked: true,
          user: {
            id: 'u-active',
            email: 'active@example.com',
            invited_at: '2026-01-01T00:00:00Z',
            last_sign_in_at: '2026-01-02T00:00:00Z',
          },
        },
      }),
    })

    render(<ArtistaInviteHeader artistaId="art-1" contactEmail="active@example.com" />)

    expect(await screen.findByRole('button', { name: /reset accesso/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^invita$/i })).not.toBeInTheDocument()
  })

  it('sends resend_invite for a registered user without last_sign_in', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            linked: true,
            user: {
              id: '95afd848-815b-4f63-8fe3-6c3ff0dda7d5',
              email: 'artist-registered@example.com',
              invited_at: '2026-01-01T00:00:00Z',
              last_sign_in_at: null,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, method: 'recovery' }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            linked: true,
            user: {
              id: '95afd848-815b-4f63-8fe3-6c3ff0dda7d5',
              email: 'artist-registered@example.com',
              invited_at: '2026-01-01T00:00:00Z',
              last_sign_in_at: null,
            },
          },
        }),
      })

    render(<ArtistaInviteHeader artistaId="art-1" />)

    const button = await screen.findByRole('button', { name: /reinvia/i })
    await userEvent.click(button)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'resend_invite',
            userId: '95afd848-815b-4f63-8fe3-6c3ff0dda7d5',
          }),
        })
      )
    })

    expect(
      await screen.findByText('Email per reimpostare la password inviata')
    ).toBeInTheDocument()
  })
})
