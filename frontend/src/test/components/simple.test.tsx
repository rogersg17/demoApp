import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Simple test component
function SimpleComponent() {
  return <div>Hello, Testing!</div>;
}

describe('Simple Component Test', () => {
  it('renders correctly', () => {
    render(<SimpleComponent />);
    expect(screen.getByText('Hello, Testing!')).toBeInTheDocument();
  });

  it('has correct text content', () => {
    render(<SimpleComponent />);
    const element = screen.getByText('Hello, Testing!');
    expect(element).toHaveTextContent('Hello, Testing!');
  });
});