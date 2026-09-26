import { screen } from '@testing-library/react';
import { renderWithProviders as render } from './test-utils';
import { describe, it, expect } from 'vitest';
import { Sparkline } from '../Sparkline';

describe('Sparkline', () => {
  it('renders an accessible name from the title', () => {
    render(<Sparkline values={[10, 20, 30]} title="p99 latency, last 3 samples, now 30 ms" />);
    expect(screen.getByRole('img', { name: 'p99 latency, last 3 samples, now 30 ms' })).toBeTruthy();
  });

  it('keeps a fixed viewBox width regardless of how many slots are filled (no layout shift)', () => {
    const { container: partial } = render(<Sparkline values={[10, 20]} window={60} title="partial" />);
    const { container: full } = render(<Sparkline values={new Array(60).fill(5)} window={60} title="full" />);
    expect(partial.querySelector('svg')?.getAttribute('viewBox')).toBe(full.querySelector('svg')?.getAttribute('viewBox'));
  });

  it('handles gaps (NaN/null/undefined) by breaking the line rather than throwing', () => {
    expect(() =>
      render(<Sparkline values={[10, NaN, null, undefined, 40]} title="gappy series" />),
    ).not.toThrow();
  });

  it('renders no path segments when every sample is a gap', () => {
    const { container } = render(<Sparkline values={[NaN, NaN]} title="all gaps" />);
    expect(container.querySelectorAll('path[stroke]').length).toBe(0);
  });

  it('draws a dashed warn-threshold hairline when given one', () => {
    const { container } = render(<Sparkline values={[10, 20, 30]} warnThreshold={25} title="with threshold" />);
    expect(container.querySelector('line')).toBeTruthy();
  });

  it('offers a table view with one row per sample', () => {
    render(
      <Sparkline
        values={[10, 20, 30]}
        title="p99 latency"
        unit="ms"
        timestamps={['00:00', '00:01', '00:02']}
        formatValue={(v) => String(v)}
      />,
    );
    expect(screen.getByText('View as table')).toBeTruthy();
    expect(screen.getByText('00:01')).toBeTruthy();
    expect(screen.getByText('20', { selector: 'td' })).toBeTruthy();
  });

  it('renders a dash in the table view for a gap sample', () => {
    render(<Sparkline values={[10, NaN, 30]} title="gappy" timestamps={['a', 'b', 'c']} />);
    const cells = screen.getAllByText('—', { selector: 'td' });
    expect(cells.length).toBe(1);
  });
});
