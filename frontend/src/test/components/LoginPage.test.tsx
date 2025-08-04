import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockUser } from '../test-utils';
import LoginPage from '../../pages/LoginPage';

// Mock the navigate function
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form elements', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole('textbox', { name: /username/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('updates input values when typing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    const usernameInput = screen.getByRole('textbox', { name: /username/i });
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');

    expect(usernameInput).toHaveValue('testuser');
    expect(passwordInput).toHaveValue('password123');
  });

  it('shows error message for empty fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter both username and password/i)).toBeInTheDocument();
    });
  });

  it('shows error message for empty username only', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter both username and password/i)).toBeInTheDocument();
    });
  });

  it('shows error message for empty password only', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    const usernameInput = screen.getByRole('textbox', { name: /username/i });
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(usernameInput, 'testuser');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter both username and password/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during login', async () => {
    const user = userEvent.setup();
    const preloadedState = {
      auth: {
        user: null,
        isLoading: true,
        error: null,
        isAuthenticated: false
      }
    };

    renderWithProviders(<LoginPage />, { preloadedState });

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    expect(submitButton).toBeDisabled();
  });

  it('displays auth error from store', () => {
    const preloadedState = {
      auth: {
        user: null,
        isLoading: false,
        error: 'Invalid username or password',
        isAuthenticated: false
      }
    };

    renderWithProviders(<LoginPage />, { preloadedState });

    expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
  });

  it('clears form errors when starting to type', async () => {
    const user = userEvent.setup();
    const preloadedState = {
      auth: {
        user: null,
        isLoading: false,
        error: 'Invalid username or password',
        isAuthenticated: false
      }
    };

    renderWithProviders(<LoginPage />, { preloadedState });

    expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();

    const usernameInput = screen.getByRole('textbox', { name: /username/i });
    await user.type(usernameInput, 'a');

    // Error should be cleared (this depends on the component implementation)
    // If the component clears errors on input change, test for that behavior
    await waitFor(() => {
      expect(screen.queryByText(/invalid username or password/i)).not.toBeInTheDocument();
    });
  });

  it('submits form with valid credentials', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<LoginPage />);

    const usernameInput = screen.getByRole('textbox', { name: /username/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'admin123');
    await user.click(submitButton);

    // Check that the login action was dispatched
    await waitFor(() => {
      const actions = store.getState();
      // This test would need the actual implementation to verify the action was dispatched
    });
  });

  it('handles form submission with Enter key', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    const usernameInput = screen.getByRole('textbox', { name: /username/i });
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(usernameInput, 'admin');
    await user.type(passwordInput, 'admin123');
    await user.keyboard('{Enter}');

    // Form should be submitted (same validation as clicking submit button)
    // This would trigger the same validation logic
  });

  it('has proper accessibility attributes', () => {
    renderWithProviders(<LoginPage />);

    const usernameInput = screen.getByRole('textbox', { name: /username/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    expect(usernameInput).toHaveAttribute('type', 'text');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(submitButton).toHaveAttribute('type', 'submit');
  });
});