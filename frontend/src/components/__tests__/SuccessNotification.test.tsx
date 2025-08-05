import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SuccessNotification from '../SuccessNotification';
import type { SuccessInfo } from '../../utils/errorUtils';

// Mock the CSS import
vi.mock('../SuccessNotification.css', () => ({}));

describe('SuccessNotification', () => {
  const mockOnDismiss = vi.fn();
  
  const createSuccessInfo = (overrides?: Partial<SuccessInfo>): SuccessInfo => ({
    message: 'Test success message',
    timestamp: new Date(),
    autoHide: false, // Disable auto-hide for testing
    ...overrides
  });

  beforeEach(() => {
    mockOnDismiss.mockClear();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders success notification with message', () => {
    const success = createSuccessInfo();
    
    render(
      <SuccessNotification 
        success={success} 
        onDismiss={mockOnDismiss} 
      />
    );

    expect(screen.getByText('Test success message')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('shows operation when provided', () => {
    const success = createSuccessInfo({
      operation: 'save-settings'
    });
    
    render(
      <SuccessNotification 
        success={success} 
        onDismiss={mockOnDismiss} 
      />
    );

    expect(screen.getByText('Operation: save-settings')).toBeInTheDocument();
  });

  it('shows expandable details when provided', () => {
    const success = createSuccessInfo({
      details: 'Settings saved to server successfully'
    });
    
    render(
      <SuccessNotification 
        success={success} 
        onDismiss={mockOnDismiss} 
      />
    );

    const expandButton = screen.getByText('Show Details');
    expect(expandButton).toBeInTheDocument();

    fireEvent.click(expandButton);
    
    expect(screen.getByText('Settings saved to server successfully')).toBeInTheDocument();
    expect(screen.getByText('Hide Details')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const success = createSuccessInfo();
    
    render(
      <SuccessNotification 
        success={success} 
        onDismiss={mockOnDismiss} 
      />
    );

    const dismissButton = screen.getByLabelText('Dismiss success notification');
    fireEvent.click(dismissButton);

    // Wait for animation
    vi.advanceTimersByTime(300);
    
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-hides when autoHide is not set to false', async () => {
    const success = createSuccessInfo({
      autoHide: undefined, // undefined means it will auto-hide (default behavior)
      hideDelay: 2000
    });
    
    render(
      <SuccessNotification 
        success={success} 
        onDismiss={mockOnDismiss} 
      />
    );

    // Fast-forward past the hide delay
    vi.advanceTimersByTime(2000);
    
    // Wait for animation
    vi.advanceTimersByTime(300);
    
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not auto-hide when autoHide is false', async () => {
    const success = createSuccessInfo({
      autoHide: false,
      hideDelay: 2000
    });
    
    render(
      <SuccessNotification 
        success={success} 
        onDismiss={mockOnDismiss} 
      />
    );

    // Fast-forward past the hide delay
    vi.advanceTimersByTime(2000);
    
    // Wait additional time
    vi.advanceTimersByTime(1000);
    
    // Should not have been called
    expect(mockOnDismiss).not.toHaveBeenCalled();
  });

  it('does not render when success is null', () => {
    const { container } = render(
      <SuccessNotification 
        success={null} 
        onDismiss={mockOnDismiss} 
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('formats timestamp correctly', () => {
    const testDate = new Date('2023-01-01T12:00:00Z');
    const success = createSuccessInfo({
      details: 'Test details',
      timestamp: testDate
    });
    
    render(
      <SuccessNotification 
        success={success} 
        onDismiss={mockOnDismiss} 
      />
    );

    // Expand details to see timestamp
    fireEvent.click(screen.getByText('Show Details'));
    
    expect(screen.getByText(/Completed at:/)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const success = createSuccessInfo();
    
    render(
      <SuccessNotification 
        success={success} 
        onDismiss={mockOnDismiss}
        className="custom-class"
      />
    );

    const notification = document.querySelector('.success-notification');
    expect(notification).toHaveClass('custom-class');
  });
});
