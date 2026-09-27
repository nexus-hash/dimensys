import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Breadcrumbs } from '../Breadcrumbs';

describe('Breadcrumbs', () => {
  it('renders nothing at the top level', () => {
    const { container } = render(<Breadcrumbs rootLabel="URL shortener" drill={[]} labelsById={{}} onNavigate={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the root and every drilled level, marking the last as the current location', () => {
    render(
      <Breadcrumbs
        rootLabel="URL shortener"
        drill={['kgs-service']}
        labelsById={{ 'kgs-service': 'Key Generation Service' }}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'URL shortener' })).toBeTruthy();
    const current = screen.getByText('Key Generation Service');
    expect(current).toHaveAttribute('aria-current', 'location');
  });

  it('falls back to the raw id when a label is unknown', () => {
    render(<Breadcrumbs rootLabel="Root" drill={['mystery-id']} labelsById={{}} onNavigate={vi.fn()} />);
    expect(screen.getByText('mystery-id')).toBeTruthy();
  });

  it('calls onNavigate with the clicked crumb depth', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <Breadcrumbs
        rootLabel="Root"
        drill={['a', 'b']}
        labelsById={{ a: 'A level', b: 'B level' }}
        onNavigate={onNavigate}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Root' }));
    expect(onNavigate).toHaveBeenCalledWith(0);
    await user.click(screen.getByRole('button', { name: 'A level' }));
    expect(onNavigate).toHaveBeenCalledWith(1);
    // "B level" is the current location, not a button.
    expect(screen.queryByRole('button', { name: 'B level' })).toBeNull();
  });
});
