import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ThemeButton from './ThemeButton';
import { ThemeProvider } from './ThemeProvider';

// Mock next-themes to avoid SSR issues in tests
vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({
    resolvedTheme: 'light',
    setTheme: vi.fn(),
    theme: 'light',
    systemTheme: 'light',
  }),
}));

describe('ThemeButton', () => {
  it('renders a button', () => {
    render(
      <ThemeProvider>
        <ThemeButton />
      </ThemeProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('has aria-label for accessibility', () => {
    render(
      <ThemeProvider>
        <ThemeButton />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });
});
