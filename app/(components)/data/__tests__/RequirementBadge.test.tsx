import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RequirementBadge } from '../RequirementBadge';

describe('RequirementBadge', () => {
  it('renders the requirement text and observed value on pass', () => {
    render(<RequirementBadge text="p99 < 50 ms" status="pass" observed="p99 42 ms" />);
    expect(screen.getByText('p99 < 50 ms')).toBeTruthy();
    expect(screen.getByText('p99 42 ms')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'passing' })).toBeTruthy();
  });

  it('renders a failing glyph and the observed value on fail', () => {
    render(<RequirementBadge text="p99 < 50 ms" status="fail" observed="p99 640 ms" />);
    expect(screen.getByRole('img', { name: 'failing' })).toBeTruthy();
    expect(screen.getByText('p99 640 ms')).toBeTruthy();
  });

  it('renders a neutral dot (not pass or fail) while pending', () => {
    const { container } = render(<RequirementBadge text="p99 < 50 ms" status="pending" observed="p99 55 ms" />);
    expect(container.querySelector('svg[aria-label="passing"]')).toBeNull();
    expect(container.querySelector('svg[aria-label="failing"]')).toBeNull();
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
  });

  it('shows "functional · not simulated" instead of an observed value', () => {
    render(<RequirementBadge text="Redirects resolve correctly" status="not-simulated" />);
    expect(screen.getByText('functional · not simulated')).toBeTruthy();
  });

  it('renders no second line at all when there is no observed value (no placeholder dash)', () => {
    const { container } = render(<RequirementBadge text="create successful requests ≥ 38 rps" status="pass" />);
    expect(container.textContent).not.toContain('—');
    expect(container.textContent).not.toContain('–');
    expect(container.querySelectorAll('.block')).toHaveLength(0);
  });

  it('keeps a threshold phrase together so the unit never wraps onto its own line', () => {
    const { container } = render(<RequirementBadge text="create successful requests ≥ 38 rps" status="pass" />);
    expect(container.textContent).toContain('≥\u00a038\u00a0rps');
  });
});
