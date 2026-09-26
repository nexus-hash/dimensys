import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { ToastProvider } from '../Toast';
import { toast, dismissToast, getToastSnapshot } from '../toastStore';

afterEach(() => {
  // Drain the module-level queue between tests (it isn't reset by unmount).
  for (const item of getToastSnapshot()) dismissToast(item.id);
});

describe('toast queue', () => {
  it('renders multiple queued toasts and keeps them ordered', async () => {
    render(<ToastProvider>{null}</ToastProvider>);

    toast('First');
    toast({ title: 'Second', variant: 'ok' });
    toast({ title: 'Third', variant: 'critical' });

    await waitFor(() => {
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });
  });

  it('removes a toast from the queue on dismiss', async () => {
    render(<ToastProvider>{null}</ToastProvider>);

    const id = toast('Dismiss me');
    await screen.findByText('Dismiss me');

    dismissToast(id);

    await waitFor(() => expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument());
  });

  it('is callable before any provider has mounted (imperative helper)', () => {
    expect(() => toast('Queued early')).not.toThrow();
    expect(getToastSnapshot().some((t) => t.title === 'Queued early')).toBe(true);
  });
});
