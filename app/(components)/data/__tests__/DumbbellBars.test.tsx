import { screen } from '@testing-library/react';
import { renderWithProviders as render } from './test-utils';
import { describe, it, expect } from 'vitest';
import { DumbbellBars } from '../DumbbellBars';

describe('DumbbellBars', () => {
  const rows = [
    { label: 'Availability', before: 6, after: 9 },
    { label: 'Latency', before: 4, after: 7 },
  ];

  it('renders a row per comparison with its label', () => {
    render(<DumbbellBars rows={rows} beforeLabel="Without fix" afterLabel="With fix" />);
    // each label also appears as a table-view row header, so scope to the track's `role="img"` name
    expect(screen.getByRole('img', { name: /^Availability:/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /^Latency:/ })).toBeTruthy();
  });

  it('renders a legend with both labels, dots differing in fill (not just color)', () => {
    const { container } = render(<DumbbellBars rows={rows} beforeLabel="Without fix" afterLabel="With fix" />);
    const legend = container.querySelector('.mt-2.flex.gap-3');
    expect(legend?.textContent).toContain('Without fix');
    expect(legend?.textContent).toContain('With fix');
    // one dot is a hollow ring (border, transparent fill class), the other solid
    const hollow = container.querySelector('i.border-2');
    const solid = container.querySelector('i.bg-ink-primary:not(.border-2)');
    expect(hollow).toBeTruthy();
    expect(solid).toBeTruthy();
  });

  it('gives each track an accessible label with both values', () => {
    render(<DumbbellBars rows={rows} beforeLabel="Without fix" afterLabel="With fix" />);
    expect(screen.getByRole('img', { name: /Availability: Without fix 6 · With fix 9/ })).toBeTruthy();
  });

  it('renders a table view with before/after columns', () => {
    render(<DumbbellBars rows={rows} beforeLabel="Without fix" afterLabel="With fix" />);
    expect(screen.getByText('View as table')).toBeTruthy();
    expect(screen.getByText('9', { selector: 'td' })).toBeTruthy();
  });
});
