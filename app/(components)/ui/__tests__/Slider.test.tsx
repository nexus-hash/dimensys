import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Slider } from '../Slider';

describe('Slider', () => {
  it('puts the accessible name on the thumb (role=slider), not the root', () => {
    const { container } = render(
      <Slider aria-label="Request rate" value={5} onValueChange={() => {}} min={0} max={10} />,
    );

    const thumb = screen.getByRole('slider', { name: 'Request rate' });
    expect(thumb).toBeInTheDocument();

    // Radix Slider.Root renders a plain <span> with no role — aria-label there
    // is an aria-prohibited-attr axe violation (no corresponding role).
    const root = container.querySelector('span[aria-label]:not([role])');
    expect(root).toBeNull();
  });
});
