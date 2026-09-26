import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Meter } from '../Meter';

describe('Meter', () => {
  it('always shows the numeric label, regardless of severity', () => {
    render(<Meter label="core-db util" value={0.42} valueLabel="42%" warnAt={0.7} criticalAt={0.9} />);
    expect(screen.getByText('42%')).toBeTruthy();
    expect(screen.getByText('core-db util')).toBeTruthy();
  });

  it('is ok below the warn threshold: no glyph', () => {
    const { container } = render(<Meter label="core-db util" value={0.5} valueLabel="50%" warnAt={0.7} criticalAt={0.9} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('shows a warn glyph at/above the warn threshold, never color-only', () => {
    const { container } = render(<Meter label="core-db util" value={0.75} valueLabel="75%" warnAt={0.7} criticalAt={0.9} />);
    const glyph = container.querySelector('svg[aria-label="warning"]');
    expect(glyph).toBeTruthy();
  });

  it('shows a critical glyph at/above the critical threshold', () => {
    const { container } = render(<Meter label="core-db util" value={0.95} valueLabel="95%" warnAt={0.7} criticalAt={0.9} />);
    expect(container.querySelector('svg[aria-label="critical"]')).toBeTruthy();
  });

  it('accepts an explicit severity override', () => {
    const { container } = render(<Meter label="Budget" value={0.5} valueLabel="$1,500 / $3,000" severity={2} />);
    expect(container.querySelector('svg[aria-label="critical"]')).toBeTruthy();
  });

  it('renders a table view with the given rows', () => {
    render(
      <Meter
        label="core-db util"
        value={0.82}
        valueLabel="82%"
        warnAt={0.7}
        criticalAt={0.9}
        tableRows={[['00:00', '62%'], ['00:10', '82%']]}
      />,
    );
    expect(screen.getByText('View as table')).toBeTruthy();
    expect(screen.getByText('82%', { selector: 'td' })).toBeTruthy();
  });
});
