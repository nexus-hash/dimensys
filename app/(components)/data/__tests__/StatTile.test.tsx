import { screen } from '@testing-library/react';
import { renderWithProviders as render } from './test-utils';
import { describe, it, expect } from 'vitest';
import { StatTile } from '../StatTile';

describe('StatTile', () => {
  it('renders label, value and unit', () => {
    render(<StatTile label="p99 latency" value="640" unit="ms" />);
    expect(screen.getByText('p99 latency')).toBeTruthy();
    expect(screen.getByText('640')).toBeTruthy();
    expect(screen.getByText('ms')).toBeTruthy();
  });

  it('renders a delta with its arrow and text', () => {
    render(
      <StatTile label="Throughput" value="3.9k" unit="rps" delta={{ direction: -1, text: '12% below baseline' }} />,
    );
    expect(screen.getByText(/12% below baseline/)).toBeTruthy();
    expect(screen.getByText('↓')).toBeTruthy();
  });

  it('shows a health glyph only when severity is warn or critical, never color alone', () => {
    const { rerender, container } = render(<StatTile label="Error rate" value="0.2" unit="%" severity={0} />);
    expect(container.querySelector('svg')).toBeNull();

    rerender(<StatTile label="Error rate" value="6.1" unit="%" severity={2} />);
    const glyph = container.querySelector('svg[aria-label="critical"]');
    expect(glyph).toBeTruthy();
    // the severity is also spelled out in text, not just the ring/glyph
    expect(screen.getByText('6.1')).toBeTruthy();
  });

  it('renders an embedded sparkline with a table view when history is given', () => {
    render(
      <StatTile
        label="p99 latency"
        value="640"
        unit="ms"
        sparkline={{ values: [100, 200, 640], window: 3, unit: 'ms' }}
      />,
    );
    expect(screen.getByRole('img', { hidden: true })).toBeTruthy();
    expect(screen.getByText('View as table')).toBeTruthy();
  });
});
