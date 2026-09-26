import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandPalette } from '../CommandPalette';
import type { PaletteNavItem } from '../types';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const NAV_ITEMS: PaletteNavItem[] = [
  { id: 'url-shortener', title: 'URL Shortener', kind: 'hld', href: '/solutions/url-shortener', tags: ['cache'] },
  { id: 'rate-limiter', title: 'Rate Limiter', kind: 'hld', href: '/solutions/rate-limiter' },
  { id: 'page-problems', title: 'Problems', kind: 'page', href: '/problems' },
];

function Wrapper({ navItems = NAV_ITEMS }: { navItems?: PaletteNavItem[] }) {
  const [open, setOpen] = useState(true);
  return <CommandPalette open={open} onOpenChange={setOpen} navItems={navItems} />;
}

describe('CommandPalette', () => {
  beforeEach(() => {
    pushMock.mockClear();
    localStorage.clear();
  });

  it('renders a combobox wired to a listbox via aria-activedescendant', async () => {
    render(<Wrapper />);
    const input = await screen.findByRole('combobox');
    expect(input).toHaveAttribute('aria-controls', 'cmdk-listbox');
    expect(input).toHaveAttribute('aria-activedescendant', 'cmdk-option-nav:url-shortener');
    expect(screen.getByRole('listbox', { name: 'Commands' })).toBeInTheDocument();
    expect(screen.getByText('URL Shortener')).toBeInTheDocument();
    expect(screen.getByText('Rate Limiter')).toBeInTheDocument();
    expect(screen.getByText('Problems')).toBeInTheDocument();
  });

  it('focuses the input on open', async () => {
    render(<Wrapper />);
    const input = await screen.findByRole('combobox');
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('filters results with the fuzzy scorer as you type', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    const input = await screen.findByRole('combobox');
    await user.type(input, 'rate');

    expect(screen.getByText('Rate Limiter')).toBeInTheDocument();
    expect(screen.queryByText('URL Shortener')).not.toBeInTheDocument();
    expect(screen.queryByText('Problems')).not.toBeInTheDocument();
  });

  it('shows "No matches" when nothing scores', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    const input = await screen.findByRole('combobox');
    await user.type(input, 'zzzzzz');
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('moves aria-activedescendant with ArrowDown/ArrowUp and navigates on Enter', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    const input = await screen.findByRole('combobox');

    expect(input).toHaveAttribute('aria-activedescendant', 'cmdk-option-nav:url-shortener');
    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', 'cmdk-option-nav:rate-limiter');
    await user.keyboard('{ArrowUp}');
    expect(input).toHaveAttribute('aria-activedescendant', 'cmdk-option-nav:url-shortener');

    await user.keyboard('{ArrowDown}{Enter}');
    expect(pushMock).toHaveBeenCalledWith('/solutions/rate-limiter');
  });

  it('wraps around at the ends of the list', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    const input = await screen.findByRole('combobox');
    await user.keyboard('{ArrowUp}'); // from index 0, should wrap to the last item
    expect(input).toHaveAttribute('aria-activedescendant', 'cmdk-option-nav:page-problems');
  });

  it('closes on Escape, and Tab never moves focus outside the dialog', async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    const dialog = await screen.findByRole('dialog');

    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('records a selection as "recent" and shows it first on reopen with an empty query', async () => {
    const user = userEvent.setup();

    function Toggle() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button onClick={() => setOpen(true)}>reopen</button>
          <CommandPalette open={open} onOpenChange={setOpen} navItems={NAV_ITEMS} />
        </>
      );
    }

    render(<Toggle />);
    let input = await screen.findByRole('combobox');
    await user.type(input, 'rate');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByText('reopen'));

    input = await screen.findByRole('combobox');
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('Recent')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-activedescendant', 'cmdk-option-nav:rate-limiter');
  });
});
