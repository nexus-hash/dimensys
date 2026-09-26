import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { TooltipProvider } from '@/app/(components)/ui';

/**
 * Every data-display component may wrap itself (or an inner `Sparkline`) in
 * a DS3 `Tooltip`, which throws without an ancestor `TooltipProvider` (the
 * app mounts one once, in `UIProviders`, at the root layout). Tests render
 * components in isolation, so they need the same provider here.
 */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(<TooltipProvider>{ui}</TooltipProvider>, options);
}
