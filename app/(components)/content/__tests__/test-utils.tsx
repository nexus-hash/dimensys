import React from 'react';
import { render as originalRender, RenderOptions } from '@testing-library/react';
import { TooltipProvider } from '../../ui/Tooltip';

export function render(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TooltipProvider>{children}</TooltipProvider>
  );
  return originalRender(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
