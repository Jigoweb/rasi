
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthForm } from './AuthForm';
import * as authService from '../services/auth.service';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock auth services
jest.mock('../services/auth.service', () => ({
  signUpWithPassword: jest.fn(),
  signInWithPassword: jest.fn(),
  signInWithGoogle: jest.fn(),
}));

describe('AuthForm', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (authService.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });
    (authService.signUpWithPassword as jest.Mock).mockResolvedValue({ error: null });
    (authService.signInWithGoogle as jest.Mock).mockResolvedValue({ error: null });
    jest.clearAllMocks();
  });

  it('should render the sign-in form by default', () => {
    render(<AuthForm />);
    expect(screen.getByText('Accedi al tuo account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accedi/i })).toBeInTheDocument();
  });

  it('should switch to the sign-up form', () => {
    render(<AuthForm />);
    const switchButton = screen.getByTestId('switch-to-signup');
    fireEvent.click(switchButton);
    expect(screen.getByText('Crea un nuovo account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrati/i })).toBeInTheDocument();
  });

  it('should handle sign-in successfully and redirect', async () => {
    render(<AuthForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Accedi/i }));

    await waitFor(() => {
      expect(authService.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should show an error message on sign-in failure', async () => {
    const errorMessage = 'Invalid login credentials';
    (authService.signInWithPassword as jest.Mock).mockResolvedValue({ error: { message: errorMessage } });

    render(<AuthForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /Accedi/i }));

    await waitFor(() => {
      expect(screen.getByTestId('auth-message')).toHaveTextContent(errorMessage);
    });
  });

  it('should handle sign-up successfully and show a confirmation message', async () => {
    render(<AuthForm />);
    fireEvent.click(screen.getByTestId('switch-to-signup')); // Switch to sign-up

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'newpassword123' } });
    fireEvent.click(screen.getByRole('button', { name: /Registrati/i }));

    await waitFor(() => {
      expect(authService.signUpWithPassword).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'newpassword123',
      });
      expect(screen.getByTestId('auth-message')).toHaveTextContent('Controlla la tua email per il link di conferma!');
    });
  });

  it('should show an error message on sign-up failure', async () => {
    const errorMessage = 'User already registered';
    (authService.signUpWithPassword as jest.Mock).mockResolvedValue({ error: { message: errorMessage } });

    render(<AuthForm />);
    fireEvent.click(screen.getByTestId('switch-to-signup')); // Switch to sign-up

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'exists@example.com' } });
    fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Registrati/i }));

    await waitFor(() => {
      expect(screen.getByTestId('auth-message')).toHaveTextContent(errorMessage);
    });
  });

  it('should call google sign-in service when the google button is clicked', async () => {
    render(<AuthForm />);
    const googleButton = screen.getByTestId('google-auth-button');
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(authService.signInWithGoogle).toHaveBeenCalled();
    });
  });
});
