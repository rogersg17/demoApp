import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import TestExecutionPanel from '../../components/TestExecutionPanel';

describe('TestExecutionPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders nothing when not executing and no progress', () => {
    const { container } = render(
      <TestExecutionPanel progress={null} isExecuting={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders execution panel when executing', () => {
    render(<TestExecutionPanel progress={null} isExecuting={true} />);
    
    expect(screen.getByText(/test execution/i)).toBeInTheDocument();
    expect(screen.getByText(/0:00/)).toBeInTheDocument();
  });

  it('displays progress information correctly', () => {
    const mockProgress = {
      current: 5,
      total: 10,
      currentTest: 'user-login.spec.ts',
      elapsedTime: 45
    };

    render(
      <TestExecutionPanel progress={mockProgress} isExecuting={true} />
    );

    expect(screen.getByText(/5.*10/)).toBeInTheDocument(); // "5 of 10" or similar
    expect(screen.getByText(/50%/)).toBeInTheDocument();
    expect(screen.getByText(/user-login\.spec\.ts/)).toBeInTheDocument();
  });

  it('calculates progress percentage correctly', () => {
    const mockProgress = {
      current: 7,
      total: 20,
      elapsedTime: 120
    };

    render(
      <TestExecutionPanel progress={mockProgress} isExecuting={true} />
    );

    // 7/20 = 35%
    expect(screen.getByText(/35%/)).toBeInTheDocument();
  });

  it('updates elapsed time during execution', () => {
    render(<TestExecutionPanel progress={null} isExecuting={true} />);
    
    expect(screen.getByText(/0:00/)).toBeInTheDocument();

    // Fast-forward 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText(/0:03/)).toBeInTheDocument();

    // Fast-forward 65 seconds total (1:05)
    act(() => {
      vi.advanceTimersByTime(62000);
    });

    expect(screen.getByText(/1:05/)).toBeInTheDocument();
  });

  it('resets elapsed time when execution stops', () => {
    const { rerender } = render(
      <TestExecutionPanel progress={null} isExecuting={true} />
    );

    // Fast-forward some time
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText(/0:10/)).toBeInTheDocument();

    // Stop execution
    rerender(<TestExecutionPanel progress={null} isExecuting={false} />);

    expect(screen.queryByText(/0:10/)).not.toBeInTheDocument();
  });

  it('formats time correctly', () => {
    render(<TestExecutionPanel progress={null} isExecuting={true} />);

    // Test various time formats
    act(() => {
      vi.advanceTimersByTime(9000); // 9 seconds
    });
    expect(screen.getByText(/0:09/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(51000); // 60 seconds total (1:00)
    });
    expect(screen.getByText(/1:00/)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(605000); // 665 seconds total (11:05)
    });
    expect(screen.getByText(/11:05/)).toBeInTheDocument();
  });

  it('shows completion status when tests are complete', () => {
    const mockProgress = {
      current: 10,
      total: 10,
      elapsedTime: 120,
      completed: true
    };

    render(
      <TestExecutionPanel progress={mockProgress} isExecuting={false} />
    );

    expect(screen.getByText(/100%/)).toBeInTheDocument();
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  it('handles zero total tests gracefully', () => {
    const mockProgress = {
      current: 0,
      total: 0,
      elapsedTime: 0
    };

    render(
      <TestExecutionPanel progress={mockProgress} isExecuting={true} />
    );

    // Should not crash and should show some sensible default
    expect(screen.getByText(/0.*0/)).toBeInTheDocument();
    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });

  it('displays current test name when provided', () => {
    const mockProgress = {
      current: 3,
      total: 8,
      currentTest: 'complex-integration.spec.ts',
      elapsedTime: 30
    };

    render(
      <TestExecutionPanel progress={mockProgress} isExecuting={true} />
    );

    expect(screen.getByText(/complex-integration\.spec\.ts/)).toBeInTheDocument();
  });

  it('does not show current test when not provided', () => {
    const mockProgress = {
      current: 3,
      total: 8,
      elapsedTime: 30
    };

    render(
      <TestExecutionPanel progress={mockProgress} isExecuting={true} />
    );

    // Should not show any test file name
    expect(screen.queryByText(/\.spec\.ts/)).not.toBeInTheDocument();
  });

  it('cleans up timer on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    const { unmount } = render(
      <TestExecutionPanel progress={null} isExecuting={true} />
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});