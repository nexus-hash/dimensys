import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NumberRoll, isBigJump } from '../NumberRoll';

describe('isBigJump', () => {
  it('is false for ordinary ticks', () => {
    expect(isBigJump(400, 420)).toBe(false);
    expect(isBigJump(1000, 950)).toBe(false);
    expect(isBigJump(5, 5)).toBe(false);
  });

  it('is true for a 10x-or-more increase', () => {
    expect(isBigJump(10, 100)).toBe(true);
    expect(isBigJump(0, 5)).toBe(true);
  });

  it('is true for a 10x-or-more decrease', () => {
    expect(isBigJump(1000, 50)).toBe(true);
  });

  it('is false when the value does not change', () => {
    expect(isBigJump(42, 42)).toBe(false);
  });
});

describe('NumberRoll', () => {
  it('renders the formatted initial value', () => {
    render(<NumberRoll value={1234} format={(v) => `${Math.round(v)} rps`} reducedOverride />);
    expect(screen.getByText('1234 rps')).toBeInTheDocument();
  });

  it('under reduced motion, an ordinary tick updates instantly', async () => {
    const { rerender } = render(<NumberRoll value={100} reducedOverride />);
    expect(screen.getByText('100')).toBeInTheDocument();

    rerender(<NumberRoll value={110} reducedOverride />);
    await waitFor(() => expect(screen.getByText('110')).toBeInTheDocument());
  });

  it('under reduced motion, a big jump still updates instantly (no roll)', async () => {
    const { rerender } = render(<NumberRoll value={10} reducedOverride />);
    rerender(<NumberRoll value={1000} reducedOverride />);
    await waitFor(() => expect(screen.getByText('1,000')).toBeInTheDocument());
  });

  it('with full motion, an ordinary (non-big) tick still applies instantly', async () => {
    const { rerender } = render(<NumberRoll value={400} reducedOverride={false} />);
    rerender(<NumberRoll value={420} reducedOverride={false} />);
    await waitFor(() => expect(screen.getByText('420')).toBeInTheDocument());
  });

  it('carries the tabular-nums class and merges a caller className', () => {
    render(<NumberRoll value={1} className="custom-class" reducedOverride />);
    const el = screen.getByText('1');
    expect(el.className).toContain('tabular-nums');
    expect(el.className).toContain('custom-class');
  });
});
