import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HealthBadge } from '../HealthBadge';
import type { HealthState } from '@/app/(components)/canvas';

describe('HealthBadge', () => {
  const states: HealthState[] = ['ok', 'warn', 'critical', 'down', 'recovering'];

  it.each(states)('renders the %s glyph with an accessible name matching the state', (state) => {
    render(<HealthBadge state={state} label={state} />);
    expect(screen.getByRole('img', { name: state })).toBeTruthy();
  });

  it('renders the label text and optional detail', () => {
    render(<HealthBadge state="critical" label="Cassandra: critical" detail="err 38%" />);
    expect(screen.getByText('Cassandra: critical')).toBeTruthy();
    expect(screen.getByText('err 38%')).toBeTruthy();
  });
});
